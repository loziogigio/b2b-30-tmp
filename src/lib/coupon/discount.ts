export interface DiscountableTotals {
  net: number;
  vat: number;
}

export interface DiscountedTotals {
  net: number;
  vat: number;
  doc: number;
  /** Absolute amount removed from (net + vat). */
  discount: number;
}

/**
 * Display-only coupon math (the MyMB backend is the authoritative re-pricer).
 * Reduces net and vat by `percent` and returns the recomputed document total.
 */
export function applyCouponDiscount(
  totals: DiscountableTotals,
  percent = 0,
): DiscountedTotals {
  const p = Math.min(100, Math.max(0, percent || 0));
  const net = totals.net - (totals.net * p) / 100;
  const vat = totals.vat - (totals.vat * p) / 100;
  const doc = net + vat;
  const discount = (totals.net + totals.vat) * (p / 100);
  return { net, vat, doc, discount };
}
