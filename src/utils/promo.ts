/**
 * Promo types that ship a flat NET price (no percentage stacking on top
 * of the listino). For these the storefront suppresses the strikethrough
 * gross and the "-X%" chip, and the cart payload drops `discount_extra`
 * — the unit price IS the final price, so percentage breakdowns would
 * be wrong both visually and contractually.
 *
 * The strings are the legacy Italian ERP type names; commerce-suite
 * passes them through unchanged on inline promotions[].promo_type.
 */
export const NET_PRICE_PROMO_TYPES = new Set([
  'RigaPrezzoNettoQuantitaMinima',
  'RigaValoreMinimoSconto',
  'RigaASommaQuantitàArticoli',
]);

export const isNetPricePromoType = (type?: string): boolean =>
  Boolean(type && NET_PRICE_PROMO_TYPES.has(type));
