import type { Item } from '@contexts/cart/cart.utils';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import type { AddToCartInput } from '@utils/transform/cart';
import type { ErpAnomaly } from '@/hooks/use-order-submit';
import { buildAddPayload } from '@components/product/add-to-cart';
import { buildListinoPriceData } from '@components/product/b2b-offer-rows';
import {
  addCartLine,
  patchCartLines,
  removeCartLines,
  type CartLinePatch,
} from '@framework/cart/b2b-cart';
import {
  discountsDiffer,
  expectedLine,
  hasPromo,
  isCheckableLine,
  lineNumberOf,
} from './price-check';

export type CartFixOp =
  | { type: 'remove'; lineNumbers: number[] }
  | { type: 'patch'; patches: CartLinePatch[] }
  | { type: 'add'; input: AddToCartInput; sourceItem: Item };

export interface CartFixPlan {
  ops: CartFixOp[];
  /** Lines the customer must fix by hand (no longer sellable). */
  unfixable: number[];
}

/** Round a quantity up to the next valid step, without float noise. */
const roundUpToStep = (qty: number, step: number): number =>
  Math.round(Math.ceil(qty / step - 1e-9) * step * 1e4) / 1e4;

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
 * The smallest set of cart operations that brings the anomalous lines in line
 * with today's catalog. Pure: `applyCartFixPlan` executes it.
 *
 * Quantities are never lost: the quantity of an expired promo line — and of a
 * listino line that must be re-added — lands on ONE listino line per product:
 * the existing one when it stays, otherwise a single new line. Two listino adds
 * for one product would let Commerce Suite's smart merge overwrite the first
 * quantity with the second.
 *
 * The plan follows the anomalies it is GIVEN, whichever side found them: a
 * promo the server gate declared expired is converted even while the
 * storefront still sees the offer (expiry → nightly sync window).
 */
export function planPriceFixes(
  anomalies: ErpAnomaly[],
  items: Item[],
  priceMap: Record<string, ErpPriceData>,
  now: Date,
): CartFixPlan {
  const byLine = new Map<number, Item>();
  for (const it of items) {
    const n = lineNumberOf(it);
    if (n != null) byLine.set(n, it);
  }

  const removes = new Set<number>();
  const patches = new Map<number, CartLinePatch>();
  const promoReadds: Array<{ input: AddToCartInput; sourceItem: Item }> = [];
  const unfixable: number[] = [];
  const toListino = new Map<
    string,
    { qty: number; line: Item; note?: string }
  >();

  const moveToListino = (line: Item) => {
    const code = String(line.id);
    const acc = toListino.get(code) ?? { qty: 0, line };
    acc.qty += Number(line.quantity) || 0;
    if (!acc.note && line.note) acc.note = line.note;
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
      patches.set(n, {
        ...(patches.get(n) ?? { line_number: n }),
        unit_price: Number(expected.payload.price_discount),
        list_price: Number(expected.payload.price),
      });
      continue;
    }

    removes.add(n);
    if (expected.kind === 'listino') {
      moveToListino(line);
    } else {
      promoReadds.push({
        input: {
          ...expected.payload,
          ...(line.note ? { note: line.note } : {}),
        },
        sourceItem: sourceItemFor(line, expected.priceData),
      });
    }
  }

  // Pass 2 — land moved quantities on one listino line per product.
  const adds: Array<{ input: AddToCartInput; sourceItem: Item }> = [];
  for (const [code, acc] of toListino) {
    const listino = buildListinoPriceData(priceMap[code]);
    const step = Math.max(
      Number(listino.packaging_option_default?.qty_x_packaging ?? 1),
      1,
    );
    const target = items.find(
      (i) =>
        String(i.id) === code &&
        isCheckableLine(i) &&
        !hasPromo(i.promo_code) &&
        !removes.has(lineNumberOf(i)!),
    );
    if (target) {
      const tn = lineNumberOf(target)!;
      const current = patches.get(tn) ?? { line_number: tn };
      patches.set(tn, {
        ...current,
        quantity: roundUpToStep(
          (current.quantity ?? Number(target.quantity)) + acc.qty,
          step,
        ),
      });
    } else {
      const payload = buildAddPayload({
        itemId: code,
        qty: roundUpToStep(acc.qty, step),
        priceData: listino,
      });
      adds.push({
        input: { ...payload, ...(acc.note ? { note: acc.note } : {}) },
        sourceItem: sourceItemFor(acc.line, listino),
      });
    }
  }
  adds.push(...promoReadds);

  const ops: CartFixOp[] = [];
  if (removes.size > 0) ops.push({ type: 'remove', lineNumbers: [...removes] });
  if (patches.size > 0)
    ops.push({ type: 'patch', patches: [...patches.values()] });
  for (const add of adds) ops.push({ type: 'add', ...add });
  return { ops, unfixable };
}

/** Execute a plan: removals, then patches, then adds (one request each). */
export async function applyCartFixPlan(
  orderId: string,
  plan: CartFixPlan,
): Promise<void> {
  for (const op of plan.ops) {
    if (op.type === 'remove') {
      await removeCartLines(orderId, { line_numbers: op.lineNumbers });
    } else if (op.type === 'patch') {
      await patchCartLines(orderId, op.patches);
    } else {
      await addCartLine(orderId, op.input, op.sourceItem);
    }
  }
}
