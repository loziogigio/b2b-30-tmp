import type { Item } from '@contexts/cart/cart.utils';
import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';
import type { ErpAnomaly, ErpItem } from '@/hooks/use-order-submit';
import { buildAddPayload } from '@components/product/add-to-cart';
import {
  buildCartPriceData,
  buildListinoPriceData,
  buildPromoPriceData,
} from '@components/product/b2b-offer-rows';
import { isPromoOfferValid } from './promo-validity';

/**
 * Cart price check: compares every cart line with what the storefront would
 * book for it today. Lines freeze their price and promotion when added; this
 * rebuilds each line with the REAL booking functions (the ones AddToCart and
 * the offer rows use), so it can only report genuine catalog changes — never a
 * derivation difference.
 */

export type BookedLine = ReturnType<typeof buildAddPayload>;

export interface ExpectedLine {
  kind: 'promo' | 'listino';
  /** The price data the storefront books this line from today. */
  priceData: ErpPriceData;
  /** The add payload the line should carry today, same quantity. */
  payload: BookedLine;
}

export const hasPromo = (code: unknown): boolean =>
  code != null && code !== '' && code !== '0' && code !== 0;

const rawLine = (item: Item): Record<string, any> =>
  (item.__cartMeta?.row_raw ?? {}) as Record<string, any>;

export function lineNumberOf(item: Item): number | null {
  const n = Number(item.rowId);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Gift lines, non-catalog products and optimistic (unsaved) lines are never checked. */
export function isCheckableLine(item: Item): boolean {
  const raw = rawLine(item);
  if (raw.is_gift_line) return false;
  if (raw.product_source && raw.product_source !== 'pim') return false;
  return lineNumberOf(item) != null;
}

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Prices are compared at the order's precision (`price_decimals`, default 2). */
export const samePrice = (a: number, b: number, decimals: number): boolean =>
  round(a, decimals) === round(b, decimals);

/** The unit price a line was stored with (Commerce Suite's `unit_price`). */
export function storedUnitPrice(item: Item): number {
  return Number(rawLine(item).unit_price ?? item.priceDiscount ?? 0);
}

/** The six discount slots a line was booked with (CS stores {tier, value}). */
function storedDiscounts(item: Item): number[] {
  const slots = [0, 0, 0, 0, 0, 0];
  const list = rawLine(item).discounts;
  for (const d of Array.isArray(list) ? list : []) {
    const tier = Number(d?.tier);
    if (tier >= 1 && tier <= 6) slots[tier - 1] = Number(d?.value) || 0;
  }
  return slots;
}

export function discountsDiffer(item: Item, payload: BookedLine): boolean {
  const booked = storedDiscounts(item);
  const today = [
    payload.discount1,
    payload.discount2,
    payload.discount3,
    payload.discount4,
    payload.discount5,
    payload.discount6,
  ].map((v) => Number(v) || 0);
  return booked.some((v, i) => round(v, 4) !== round(today[i], 4));
}

function findValidOffer(
  base: ErpPriceData,
  item: Item,
  now: Date,
): PromoOffer | null {
  const code = String(item.promo_code);
  const row = Number(item.promo_row ?? 0);
  return (
    (base.all_promo_offers ?? []).find(
      (o) =>
        String(o.promo_code) === code &&
        (row > 0 ? Number(o.promo_row) === row : true) &&
        isPromoOfferValid(o, now),
    ) ?? null
  );
}

/**
 * What a line should carry today. Null when it cannot be booked any more:
 * its promotion is gone, or the product has no listino for this customer.
 *
 * A listino line can be booked through either of two real storefront paths,
 * and this must accept both:
 *   - the offer rows' explicit LISTINO row (`buildListinoPriceData`), which
 *     always strips any flattened promo residue (discount_extra included);
 *   - a direct add from a card/row/search-result/detail page
 *     (`buildCartPriceData`), which returns the catalog data UNTOUCHED —
 *     keeping discount_extra — whenever the product carries no promo.
 * Both book the same listino net price; only their discount ladders can
 * differ. Picking only one path would misreport the other path's discount
 * tiers as a changed discount chain, which is a derivation difference, not a
 * genuine catalog change.
 */
export function expectedLine(
  item: Item,
  base: ErpPriceData,
  now: Date,
): ExpectedLine | null {
  const itemId = String(item.id);
  const qty = Number(item.quantity) || 0;

  if (hasPromo(item.promo_code)) {
    const offer = findValidOffer(base, item, now);
    if (!offer) return null;
    const priceData = buildPromoPriceData(base, offer);
    return {
      kind: 'promo',
      priceData,
      payload: buildAddPayload({
        itemId,
        qty,
        priceData,
        promo_code: offer.promo_code,
        promo_row: offer.promo_row,
      }),
    };
  }

  const listino = buildListinoPriceData(base);
  if (!(Number(listino.net_price) > 0)) return null;

  // `buildCartPriceData` books the promo (not a listino) when one wins
  // today — that must never stand in as a listino option, hence the
  // `is_promo` guard. Both remaining candidates carry the same listino net
  // price, so trying the card-booking path second never changes the price
  // comparison, only which discount ladder is reported.
  const card = buildCartPriceData(base);
  const options: ExpectedLine[] = (
    card.is_promo ? [listino] : [listino, card]
  ).map((priceData) => ({
    kind: 'listino' as const,
    priceData,
    payload: buildAddPayload({ itemId, qty, priceData }),
  }));
  return options.find((o) => !discountsDiffer(item, o.payload)) ?? options[0];
}

/**
 * Compare every checkable line with today's catalog. `priceMap` is keyed by
 * entity_code (see fetchCartPriceMap). Anomalies use the ERP anomaly shape
 * (IdRiga + flags) so the existing banner, rows and modal render them.
 */
export function diffCartPrices(
  items: Item[],
  priceMap: Record<string, ErpPriceData>,
  opts: { now: Date; decimals: number },
): { anomalies: ErpAnomaly[]; erpItems: ErpItem[] } {
  const anomalies: ErpAnomaly[] = [];
  const erpItems: ErpItem[] = [];

  for (const item of items) {
    if (!isCheckableLine(item)) continue;
    const lineNumber = lineNumberOf(item)!;
    const code = String(item.id);
    const unitPrice = storedUnitPrice(item);
    const promo = hasPromo(item.promo_code)
      ? {
          promo_code: String(item.promo_code),
          promo_row: Number(item.promo_row ?? 0),
        }
      : {};
    const base = {
      IdRiga: lineNumber,
      entity_code: code,
      sku: item.sku,
      unit_price: unitPrice,
      ...promo,
    };
    const report = (anomaly: ErpAnomaly) => {
      anomalies.push(anomaly);
      erpItems.push({
        erp_line_number: lineNumber,
        erp_data: { oarti: item.sku || code },
      });
    };

    const pd = priceMap[code];
    if (!pd) {
      report({
        ...base,
        expected_unit_price: null,
        IsArticoloNonVendibile: true,
      });
      continue;
    }

    const expected = expectedLine(item, pd, opts.now);
    if (!expected) {
      report(
        hasPromo(item.promo_code)
          ? { ...base, expected_unit_price: null, IsPromozioneScaduta: true }
          : {
              ...base,
              expected_unit_price: null,
              IsArticoloNonVendibile: true,
            },
      );
      continue;
    }

    const expectedUnit = Number(expected.payload.price_discount);
    // A promotion without a positive price cannot be compared (same rule as
    // the Commerce Suite gate).
    const priceChanged =
      expectedUnit > 0 && !samePrice(expectedUnit, unitPrice, opts.decimals);
    const discountsChanged = discountsDiffer(item, expected.payload);
    if (priceChanged || discountsChanged) {
      report({
        ...base,
        expected_unit_price: expectedUnit,
        ...(priceChanged ? { IsPrezzoVariato: true } : {}),
        ...(discountsChanged ? { IsScontiVariati: true } : {}),
      });
    }
  }

  return { anomalies, erpItems };
}
