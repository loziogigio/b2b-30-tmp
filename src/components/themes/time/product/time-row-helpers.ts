import type { ErpPriceData } from '@utils/transform/erp-prices';
import { selectBestPrice } from '@framework/pricing/best-price';

/** Time-theme row palette — brand-driven via the time CSS vars, DFL fallbacks. */
export const C = {
  red: 'var(--time-red, #e4002b)',
  redSoft: 'color-mix(in srgb, var(--time-red, #e4002b) 10%, #ffffff)',
  ink: 'var(--time-dark, #16161a)',
  muted: 'var(--time-gray-500, #71717a)',
  faint: 'var(--time-gray-400, #a1a1aa)',
  line: 'var(--time-gray-100, #eaeaee)',
  lineSoft: 'var(--time-gray-50, #f2f2f5)',
  bg: '#ffffff',
  panel: 'var(--time-gray-50, #fafafb)',
  green: '#15803d',
  greenSoft: '#ecfdf3',
  amber: '#b45309',
  amberSoft: '#fff7ed',
};

/**
 * The unit price a row DISPLAYS — which must be the one the cart BOOKS.
 *
 * Resolved through `selectBestPrice` (= min(listino, cheapest qualifying
 * promo)), the same seam `buildCartPriceData` books through. Reading
 * `price_discount` directly is not safe: the ERP flattens its pre-selected
 * `improving_promo` onto that field, so on a listino-wins row it holds a promo
 * price we do not charge.
 */
export function netOf(pd?: ErpPriceData): number | null {
  if (!pd) return null;

  const best = selectBestPrice(pd).effectivePrice;
  if (Number.isFinite(best) && best > 0) return best;

  // No listino and no qualifying promo -> NO PRICE. There is no field to fall
  // back to: the booking layer (`buildCartPriceData`) writes
  // `net_price = effectivePrice = 0` here, so any number we showed from
  // `price_discount` / `gross_price` would be a price nothing charges — the row
  // would display e.g. €3.95 and book a €0 FREE-GOODS line. Return null so the
  // price is hidden and the add button does not render.
  return null;
}

export function listOf(pd?: ErpPriceData): number | null {
  const a = pd as any;
  // Same field order as the grid card so the struck list price matches.
  const n = a?.price_gross ?? a?.gross_price;
  return n != null ? Number(n) : null;
}

export function fmtEuro(n: number, decimals: number) {
  // Match the grid card exactly: '€' prefix + fixed decimals.
  return `€${n.toFixed(decimals)}`;
}
