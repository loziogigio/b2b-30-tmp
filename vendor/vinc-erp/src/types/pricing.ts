/** Behavior config, sourced per-tenant (injected; never read from env here). */
export interface MyMbErpSettings {
  /** Ordered packaging IDs used to build the legacy `packaging_options` list. */
  packagingOptionsId: number[];
  isManagedSubstitutes: boolean;
  isManagedSupplierOrder: boolean;
  /** Keyed "0".."5" → label + add-to-cart flag. */
  cases: Record<string, { label: string; addToCart: boolean }>;
  updatePromoSeconds: number;
  updateAvailableAgainSeconds: number;
}

export interface PriceQuery {
  customerCode: string;
  addressCode: string;
  entityCodes: string[];
  quantityList?: number[];
  idCart?: string;
  /** DDMMYYYY; defaults to today. */
  pricingDate?: string;
  loadPackingList?: boolean;
  calculateAvailability?: boolean;
  calculateArrivals?: boolean;
  calculatePreviousOrders?: boolean;
}

export interface NormalizedPackagingOption {
  /** IdImballo — the ERP packaging id used by the `packaging_options_id` filter. */
  packaging_id: unknown;
  packaging_uom_description: unknown;
  packaging_code: unknown;
  packaging_is_default: unknown;
  packaging_is_smallest: unknown;
  qty_x_packaging: unknown;
  packaging_uom: unknown;
}

export interface ProductLabelAction {
  LABEL: string;
  ADD_TO_CART: boolean;
  substitute_available: unknown[] | null;
  order_supplier_available: unknown[] | null;
  quantity_available: number;
  is_managed_substitutes: boolean;
  is_managed_supplier_order: boolean;
  case: number | null;
  prod_substitution?: string[];
}

/**
 * One entry of the map returned by `getMultiplePrices`, keyed by entity code.
 * Shape matches the legacy Python `product_data_dict[code]` exactly: computed
 * snake_case fields PLUS raw MYMB passthrough (`improving_promo`, `all_promo`).
 */
export interface MyMbPriceEntry {
  entity_code: string;
  vat_percent: unknown;
  availability: unknown;
  all_promo: unknown;        // raw RighePromo ({ ListaPromo: [...] }) or {}
  improving_promo: unknown;  // raw RigaPromozioneMigliorativa or {}
  net_price: unknown;
  gross_price: unknown;
  count_promo: number;
  is_improving_promo_net_price: boolean;
  buy_did: unknown;
  buy_did_amount: unknown;
  buy_did_last_date: unknown;
  promo: unknown;
  promozionale: unknown;
  num_promo: unknown;
  num_promo_canvas: unknown;
  price?: unknown;
  price_discount?: unknown;
  promo_price?: unknown;
  promo_code?: unknown;
  promo_row?: unknown;
  is_improving_promo?: boolean;
  is_promo?: boolean;
  promo_title?: unknown;
  start_promo_date?: string;
  end_promo_date?: string;
  discount_extra?: unknown[];
  discount: unknown[];
  pricelist_type: unknown;
  pricelist_code: unknown;
  packaging_option_smallest?: NormalizedPackagingOption;
  packaging_option_default?: NormalizedPackagingOption;
  packaging_options_all: NormalizedPackagingOption[];
  packaging_options: unknown[];
  order_suplier_available: unknown[];
  prod_substitution: string[];
  product_label_action: ProductLabelAction;
}
