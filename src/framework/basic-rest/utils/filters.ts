// PIM facet fields (from SEARCH_AND_FACETING.md)
export const PIM_FACET_FIELDS: string[] = [
  'product_type_code', // Product Type - first position for filtering (backend enriches labels)
  'category_ancestors',
  'brand_id',
  'stock_status',
  'has_active_promo',
  'attribute_is_new_b', // boolean attribute indexed with _b suffix
];

// PIM facet field labels (Italian)
export const PIM_FACET_LABELS: Record<string, string> = {
  product_type_code: 'Tipologia Prodotto',
  category_ancestors: 'Categoria',
  brand_id: 'Marca',
  stock_status: 'Disponibilità',
  has_active_promo: 'In Promozione',
  attribute_is_new_b: 'Nuovo Arrivo',
};

// Stock status labels
export const STOCK_STATUS_LABELS: Record<string, string> = {
  in_stock: 'Disponibile',
  out_of_stock: 'Non disponibile',
  pre_order: 'Preordine',
};

// Boolean filter labels
export const BOOLEAN_LABELS: Record<string, string> = {
  true: 'Sì',
  false: 'No',
};
