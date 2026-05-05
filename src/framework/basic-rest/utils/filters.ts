// Re-export from shared vinc-pim package, but override the facet ordering
// so the storefront sidebar shows CATEGORIA before TIPO PRODOTTO (cascade
// drill-down feels more natural when you start broad → narrow).
import {
  PIM_FACET_FIELDS as DEFAULT_PIM_FACET_FIELDS,
  PIM_FACET_LABELS,
  STOCK_STATUS_LABELS,
  BOOLEAN_LABELS,
} from 'vinc-pim';

const desiredOrder = [
  'brand_id',
  'category_ancestors',
  'product_type_code',
  'attribute_is_new_b',
  'has_active_promo',
  'promo_type',
  'stock_status',
];

const indexed = new Map(desiredOrder.map((k, i) => [k, i]));
export const PIM_FACET_FIELDS: string[] = [...DEFAULT_PIM_FACET_FIELDS].sort(
  (a, b) => {
    const ai = indexed.has(a)
      ? (indexed.get(a) as number)
      : desiredOrder.length;
    const bi = indexed.has(b)
      ? (indexed.get(b) as number)
      : desiredOrder.length;
    return ai - bi;
  },
);

export { PIM_FACET_LABELS, STOCK_STATUS_LABELS, BOOLEAN_LABELS };
