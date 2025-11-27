// Legacy B2B facet fields
export const FACET_FIELDS: string[] = [
    'promo_type',
    'new',
    'id_brand',
    // 'family_lev3',
    // 'family_lev2',
    // 'family_lev1'
  ];

// PIM facet fields (from SEARCH_AND_FACETING.md)
export const PIM_FACET_FIELDS: string[] = [
  'category_ancestors',
  'brand_id',
  'stock_status',
  'has_active_promo',
  'attribute_is_new_b', // boolean attribute indexed with _b suffix
];

// PIM facet field labels (Italian)
export const PIM_FACET_LABELS: Record<string, string> = {
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
  