import type { Item } from '@contexts/cart/cart.utils';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import type { AddToCartInput } from '@utils/transform/cart';
import type { ErpAnomaly } from '@/hooks/use-order-submit';
import { buildAddPayload } from '@components/product/add-to-cart';
import { buildListinoPriceData } from '@components/product/b2b-offer-rows';
import {
  addCartLine,
  patchCartLines,
  postCartLine,
  removeCartLines,
  type CartLinePatch,
} from '@framework/cart/b2b-cart';
import {
  discountsDiffer,
  expectedLine,
  hasPromo,
  isCheckableLine,
  lineNumberOf,
  samePrice,
  storedUnitPrice,
} from './price-check';

export type CartFixOp =
  | {
      type: 'remove';
      lineNumbers: number[];
      /** Each removed line's restore body, keyed by line number: the
       *  line's current state layered over Commerce Suite's `raw_data`
       *  (see `restoreBodyOf`), so the executor can re-post it if a later
       *  step in the plan fails. Omits lines whose body lacks a field
       *  Commerce Suite requires for an add. */
      restore: Record<number, Record<string, unknown>>;
    }
  | {
      type: 'patch';
      patches: CartLinePatch[];
      /** Target line number → the removed source lines whose quantity moved
       *  onto it. A price-only patch (no quantity merge) has no entry. */
      from: Record<number, number[]>;
    }
  | {
      type: 'add';
      input: AddToCartInput;
      sourceItem: Item;
      /** The removed source line(s) whose quantity this add carries. */
      from: number[];
    };

export interface CartFixPlan {
  ops: CartFixOp[];
  /** Lines the customer must fix by hand: no longer sellable, a price change
   *  the storefront cannot apply (today's catalog books the price the line
   *  already carries, or no positive price), or the only listino line they
   *  could move onto is itself unfixable. */
  unfixable: number[];
}

/**
 * The plan could not be fully applied. `restored` lists source lines whose
 * restore body (their current state over `raw_data`) was successfully
 * re-posted after their replacement failed; `lost` lists source lines that
 * could not be restored (no restore body had been captured, or the re-post
 * itself failed); `failed` lists line numbers whose fix did not apply but
 * needed no restore — e.g. a price-only patch that failed, leaving the line
 * in the cart at its old price. Every one of these needs the customer's
 * attention.
 */
export class CartFixError extends Error {
  constructor(
    public readonly restored: number[],
    public readonly lost: number[],
    public readonly failed: number[],
  ) {
    super('Aggiornamento non completato');
    this.name = 'CartFixError';
  }
}

/** A patch batch answers 200 with a per-line outcome; a line can fail even
 *  though the request itself succeeded. */
interface CartLinePatchResult {
  line_number: number;
  success: boolean;
  error?: string;
}

/** Round a quantity up to the next valid step, without float noise. */
const roundUpToStep = (qty: number, step: number): number =>
  Math.round(Math.ceil(qty / step - 1e-9) * step * 1e4) / 1e4;

/**
 * A packaging step is whatever positive quantity the catalog states — 0.125,
 * 0.75, 5, anything. Falling back to `Math.max(step, 1)` would round a
 * fractional step UP to a whole unit: a 0.375 line at step 0.125 would book
 * 1 (silent overcharge) and a 1.5 line at step 0.75 would book 2, which
 * Commerce Suite rejects (2 % 0.75 ≠ 0). Only a non-positive / missing step
 * (no packaging constraint at all) falls back to 1.
 */
const positiveStep = (raw: unknown): number => {
  const n = Number(raw);
  return n > 0 ? n : 1;
};

/** A cart item carrying the packaging of the price data it will be booked from. */
function sourceItemFor(line: Item, priceData: ErpPriceData): Item {
  return {
    ...line,
    promo_code: priceData.promo_code,
    promo_row: priceData.promo_row,
    __cartMeta: {
      ...(line.__cartMeta ?? {}),
      packaging_option_default: priceData.packaging_option_default,
      packaging_option_smallest: priceData.packaging_option_smallest,
      packaging_options_all: priceData.packaging_options_all,
      promo_code: priceData.promo_code,
      promo_row: priceData.promo_row,
    },
  };
}

/**
 * Fields Commerce Suite's `batchUpdateItems` PATCH can change after a line
 * is created. `raw_data` is written once, at creation (`createLineItem`),
 * and never touched again — so a quantity/note/price change that happened
 * after the line was added is invisible to it. Read straight from the
 * line's current state instead, whenever it is defined there.
 */
const RESTORABLE_CURRENT_FIELDS = [
  'quantity',
  'note',
  'unit_price',
  'list_price',
  'packaging_code',
  'packaging_label',
  'pack_size',
  'min_order_quantity',
] as const;

/** Mirrors Commerce Suite's own `ADD_ITEM_REQUIRED_FIELDS`: a restore body
 *  missing any of these cannot be posted as an add. */
const REQUIRED_ADD_FIELDS = [
  'entity_code',
  'sku',
  'quantity',
  'list_price',
  'unit_price',
  'vat_rate',
  'name',
] as const;

/**
 * The booking body to re-post if this line's replacement fails: its
 * original `raw_data` with the line's CURRENT mutable fields layered on
 * top (see `RESTORABLE_CURRENT_FIELDS`) — otherwise a line whose quantity
 * or price changed after it was added would restore the STALE quantity or
 * price it was created with, silently losing or overcharging the
 * difference. Returns undefined when the result is missing a Commerce
 * Suite required add field — e.g. a cart-imported line whose caller-defined
 * `raw_data` is not a real add body — so the caller reports that line as
 * lost rather than re-posting a guess.
 */
function restoreBodyOf(
  line: Item | undefined,
): Record<string, unknown> | undefined {
  const row = line?.__cartMeta?.row_raw as Record<string, unknown> | undefined;
  if (!row) return undefined;

  const current: Record<string, unknown> = {};
  for (const key of RESTORABLE_CURRENT_FIELDS) {
    if (row[key] !== undefined) current[key] = row[key];
  }

  const rawData = row.raw_data;
  const body: Record<string, unknown> = {
    ...(rawData && typeof rawData === 'object'
      ? (rawData as Record<string, unknown>)
      : {}),
    ...current,
  };

  const hasAllRequired = REQUIRED_ADD_FIELDS.every(
    (field) => body[field] !== undefined,
  );
  return hasAllRequired ? body : undefined;
}

/**
 * The smallest set of cart operations that brings the anomalous lines in line
 * with today's catalog. Pure: `applyCartFixPlan` executes it.
 *
 * Quantities are never lost: the quantity of an expired promo line — and of a
 * listino line that must be re-added — lands on ONE listino line per product:
 * the existing one when it stays, otherwise a single new line. Two listino adds
 * for one product would let Commerce Suite's smart merge overwrite the first
 * quantity with the second.
 *
 * Except when they can't move anywhere: a product with no bookable listino
 * (net price 0 — `buildAddItemRequest` would otherwise book the GROSS price),
 * or whose only surviving checkable listino line is itself unfixable, is left
 * untouched — its moved lines report `unfixable` instead of being folded into
 * a line that cannot be booked, or merged next to one that will not survive.
 *
 * The plan follows the anomalies it is GIVEN, whichever side found them: a
 * promo the server gate declared expired is converted even while the
 * storefront still sees the offer (expiry → nightly sync window).
 *
 * A price change is only patched when the storefront can actually apply it:
 * when today's catalog books a price that is not positive, or the price the
 * line already carries at `decimals` (the order's precision), a patch would
 * change nothing and the same refusal would come back. Such a line is
 * reported `unfixable` so the customer is told, never looped silently.
 */
export function planPriceFixes(
  anomalies: ErpAnomaly[],
  items: Item[],
  priceMap: Record<string, ErpPriceData>,
  now: Date,
  decimals = 2,
): CartFixPlan {
  const byLine = new Map<number, Item>();
  for (const it of items) {
    const n = lineNumberOf(it);
    if (n != null) byLine.set(n, it);
  }

  const removes = new Set<number>();
  const patches = new Map<number, CartLinePatch>();
  const patchFrom = new Map<number, number[]>();
  const promoReadds: Array<{
    input: AddToCartInput;
    sourceItem: Item;
    from: number[];
  }> = [];
  const unfixable: number[] = [];
  const toListino = new Map<
    string,
    { qty: number; line: Item; note?: string; sourceLines: number[] }
  >();

  const moveToListino = (line: Item) => {
    const code = String(line.id);
    const n = lineNumberOf(line)!;
    const acc = toListino.get(code) ?? { qty: 0, line, sourceLines: [] };
    acc.qty += Number(line.quantity) || 0;
    if (!acc.note && line.note) acc.note = line.note;
    acc.sourceLines.push(n);
    toListino.set(code, acc);
  };

  // Pass 1 — classify each anomalous line.
  for (const anomaly of anomalies) {
    const n = Number(anomaly.IdRiga);
    const line = byLine.get(n);
    if (!line) continue;
    const base = priceMap[String(line.id)];
    if (anomaly.IsArticoloNonVendibile === true || !base) {
      unfixable.push(n);
      continue;
    }

    const expected =
      anomaly.IsPromozioneScaduta === true
        ? null
        : expectedLine(line, base, now);
    if (!expected) {
      if (!hasPromo(line.promo_code)) {
        unfixable.push(n); // a listino line with no listino = not sellable
        continue;
      }
      removes.add(n);
      moveToListino(line);
      continue;
    }

    const readd =
      anomaly.IsScontiVariati === true ||
      discountsDiffer(line, expected.payload);
    if (!readd) {
      const unitPrice = Number(expected.payload.price_discount);
      if (
        !(unitPrice > 0) ||
        samePrice(unitPrice, storedUnitPrice(line), decimals)
      ) {
        unfixable.push(n); // nothing the storefront can change
        continue;
      }
      patches.set(n, {
        ...(patches.get(n) ?? { line_number: n }),
        unit_price: unitPrice,
        list_price: Number(expected.payload.price),
      });
      continue;
    }

    removes.add(n);
    if (expected.kind === 'listino') {
      moveToListino(line);
    } else {
      // The promo's required quantity may itself have changed; round the
      // re-added quantity up to what it requires today, same as any other
      // packaging step, so Commerce Suite does not reject the re-add.
      const promoStep = positiveStep(
        expected.priceData.packaging_option_default?.qty_x_packaging,
      );
      promoReadds.push({
        input: {
          ...expected.payload,
          quantity: roundUpToStep(
            Number(expected.payload.quantity) || 0,
            promoStep,
          ),
          ...(line.note ? { note: line.note } : {}),
        },
        sourceItem: sourceItemFor(line, expected.priceData),
        from: [n],
      });
    }
  }

  // Pass 2 — land moved quantities on one listino line per product, unless
  // the product cannot be booked at all, or its only surviving checkable
  // listino line was itself declared unfixable in pass 1 — in that case
  // undo the removal and report the moved lines as unfixable instead of
  // booking them at the wrong price or merging them next to a line that is
  // about to be abandoned.
  const adds: Array<{
    input: AddToCartInput;
    sourceItem: Item;
    from: number[];
  }> = [];
  for (const [code, acc] of toListino) {
    const listino = buildListinoPriceData(priceMap[code]);
    const bookable = Number(listino.net_price) > 0;
    const step = positiveStep(
      listino.packaging_option_default?.qty_x_packaging,
    );
    const target = items.find(
      (i) =>
        String(i.id) === code &&
        isCheckableLine(i) &&
        !hasPromo(i.promo_code) &&
        !removes.has(lineNumberOf(i)!),
    );
    const targetLine = target ? lineNumberOf(target)! : null;
    const targetBlocked = targetLine != null && unfixable.includes(targetLine);

    if (!bookable || targetBlocked) {
      for (const n of acc.sourceLines) {
        removes.delete(n);
        unfixable.push(n);
      }
      continue;
    }

    if (target) {
      const tn = targetLine!;
      const current = patches.get(tn) ?? { line_number: tn };
      patches.set(tn, {
        ...current,
        quantity: roundUpToStep(
          (current.quantity ?? Number(target.quantity)) + acc.qty,
          step,
        ),
      });
      patchFrom.set(tn, [...(patchFrom.get(tn) ?? []), ...acc.sourceLines]);
    } else {
      const payload = buildAddPayload({
        itemId: code,
        qty: roundUpToStep(acc.qty, step),
        priceData: listino,
      });
      adds.push({
        input: { ...payload, ...(acc.note ? { note: acc.note } : {}) },
        sourceItem: sourceItemFor(acc.line, listino),
        from: [...acc.sourceLines],
      });
    }
  }
  adds.push(...promoReadds);

  const ops: CartFixOp[] = [];
  if (removes.size > 0) {
    const restore: Record<number, Record<string, unknown>> = {};
    for (const n of removes) {
      const body = restoreBodyOf(byLine.get(n));
      if (body) restore[n] = body;
    }
    ops.push({ type: 'remove', lineNumbers: [...removes], restore });
  }
  if (patches.size > 0) {
    ops.push({
      type: 'patch',
      patches: [...patches.values()],
      from: Object.fromEntries(patchFrom),
    });
  }
  for (const add of adds) ops.push({ type: 'add', ...add });
  return { ops, unfixable };
}

/** Re-post the restore body of each source line (its current state over
 *  `raw_data`, captured by the planner), tracking which ones were saved
 *  (`restored`) vs could not be (`lost`): no captured body, or the re-post
 *  itself failed. */
async function restoreLines(
  orderId: string,
  lineNumbers: number[],
  restore: Record<number, Record<string, unknown>>,
  restored: number[],
  lost: number[],
): Promise<void> {
  for (const n of lineNumbers) {
    const body = restore[n];
    if (!body) {
      lost.push(n);
      continue;
    }
    try {
      await postCartLine(orderId, body);
      restored.push(n);
    } catch {
      lost.push(n);
    }
  }
}

/**
 * Execute a plan: removals, then patches, then adds (one request each).
 * Removals run first so a re-add never merges into the line it is
 * replacing — but that ordering means a later failure could otherwise
 * silently drop the quantity a removed line carried. Instead: a failed
 * patch line (reported in the response `results[]`, or the whole request
 * throwing) or a failed add re-posts the restore body (the line's current
 * state over `raw_data`) of every source line it carries (`op.from`), then
 * execution continues with the rest of the plan. A failed patch line that
 * carries no source line (a price-only patch — nothing was removed for it,
 * so there is nothing to restore) is still recorded, as `failed`, rather
 * than silently ignored — otherwise the caller would see a clean resolve for
 * a price that never actually updated. A failed removal simply throws —
 * nothing has changed yet for that op, so there is nothing to restore. Every
 * op and every PATCH line must succeed for this to resolve; otherwise it
 * throws `CartFixError` once the whole plan has run.
 */
export async function applyCartFixPlan(
  orderId: string,
  plan: CartFixPlan,
): Promise<void> {
  const removeOp = plan.ops.find(
    (op): op is Extract<CartFixOp, { type: 'remove' }> => op.type === 'remove',
  );
  const restoreMap = removeOp?.restore ?? {};
  const restored: number[] = [];
  const lost: number[] = [];
  const failed: number[] = [];

  for (const op of plan.ops) {
    if (op.type === 'remove') {
      await removeCartLines(orderId, { line_numbers: op.lineNumbers });
      continue;
    }

    if (op.type === 'patch') {
      let failedLines: number[];
      try {
        const res: any = await patchCartLines(orderId, op.patches);
        const results: CartLinePatchResult[] = Array.isArray(res?.results)
          ? res.results
          : [];
        failedLines = results
          .filter((r) => r.success === false)
          .map((r) => r.line_number);
      } catch {
        failedLines = op.patches.map((p) => p.line_number);
      }
      for (const tn of failedLines) {
        const sources = op.from[tn];
        if (sources?.length) {
          await restoreLines(orderId, sources, restoreMap, restored, lost);
        } else {
          failed.push(tn);
        }
      }
      continue;
    }

    try {
      await addCartLine(orderId, op.input, op.sourceItem);
    } catch {
      await restoreLines(orderId, op.from, restoreMap, restored, lost);
    }
  }

  if (restored.length > 0 || lost.length > 0 || failed.length > 0) {
    throw new CartFixError(restored, lost, failed);
  }
}
