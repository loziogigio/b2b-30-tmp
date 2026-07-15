// Re-export from shared vinc-pim package, but override the facet ordering
// so the storefront sidebar shows CATEGORIA before TIPO PRODOTTO (cascade
// drill-down feels more natural when you start broad → narrow).
import {
  PIM_FACET_FIELDS as DEFAULT_PIM_FACET_FIELDS,
  PIM_FACET_LABELS as DEFAULT_PIM_FACET_LABELS,
  STOCK_STATUS_LABELS,
  BOOLEAN_LABELS,
} from 'vinc-pim';

const desiredOrder = [
  'brand_id',
  'category_ancestors',
  'product_type_code',
  'attribute_is_new_b',
  'has_active_promo',
  'promo_code',
  'stock_status',
];

// Extra facets the b2b storefront needs but the default vinc-pim list omits.
// promo_code = per-campaign promotion facet ("Promozione" in the sidebar).
const EXTRA_FACET_FIELDS = ['promo_code'];

const indexed = new Map(desiredOrder.map((k, i) => [k, i]));
export const PIM_FACET_FIELDS: string[] = [
  ...DEFAULT_PIM_FACET_FIELDS,
  ...EXTRA_FACET_FIELDS.filter((k) => !DEFAULT_PIM_FACET_FIELDS.includes(k)),
].sort((a, b) => {
  const ai = indexed.has(a) ? (indexed.get(a) as number) : desiredOrder.length;
  const bi = indexed.has(b) ? (indexed.get(b) as number) : desiredOrder.length;
  return ai - bi;
});

export const PIM_FACET_LABELS: Record<string, string> = {
  ...DEFAULT_PIM_FACET_LABELS,
  promo_code: 'Promozione',
};

export { STOCK_STATUS_LABELS, BOOLEAN_LABELS };

// Default sidebar order/visibility when a portal has no facet_config.
// Mirrors the historical hardcoded sidebar render order:
// promo → novità → brand → category → product type → stock.
export const DEFAULT_FACET_ORDER: string[] = [
  'promo_code',
  'attribute_is_new_b',
  'brand_id',
  'category_ancestors',
  'product_type_code',
  'stock_status',
];
// Facets hidden by default (redundant with promo_code).
export const DEFAULT_HIDDEN_FACETS: string[] = ['has_active_promo'];
