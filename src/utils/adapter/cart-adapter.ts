// @utils/adapter/cart-adapter.ts
import type { CartSummary, Item } from '@contexts/cart/cart.utils';
import {
  PackagingOption,
  PackagingOptionLegacy,
} from '@utils/transform/erp-prices';
import { AddToCartInput } from '@utils/transform/cart';

// --- helpers -------------------------------------------------
const num = (v: any, d = 0) => {
  if (v == null || v === '') return d;
  const s = typeof v === 'string' ? v.replace(',', '.') : v;
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
};

// =====================================================================
// Commerce-Suite (CS) mappers — maps VINC order/items → Item/CartSummary
// =====================================================================

/** Map a commerce-suite LineItem to the existing Item interface */
export function mapCSLineItemToItem(li: any): Item {
  const unitPrice = num(li.unit_price, 0);
  const listPrice = num(li.list_price, 0);
  const price = unitPrice || listPrice || 0;

  // Build packaging_options_all from erp_data if available
  const erpImballi = li.erp_data?.imballi?.packaging_options;
  const packagingAll: PackagingOption[] = erpImballi
    ? toPackagingOptions(erpImballi)
    : [];

  return {
    // Identifiers
    id: li.entity_code || li.sku,
    rowId: String(li.line_number),
    sku: li.sku,
    slug: undefined,
    id_parent: li.erp_data?.id_parent,
    parent_sku: li.erp_data?.parent_sku,

    // Descriptive
    name: li.name,
    model: li.erp_data?.model,
    shortDescription: li.erp_data?.short_description,
    description: undefined,
    brand: li.brand ? { id: 0, name: li.brand, slug: li.brand } : undefined,
    image: li.image_url,

    // Quantities / units
    quantity: num(li.quantity, 0),
    uom: li.quantity_unit || li.packaging_code,
    mvQty: num(li.min_order_quantity),
    cfQty: num(li.pack_size),

    // Pricing (canonical)
    priceDiscount: unitPrice,
    priceGross: listPrice,
    isPromo:
      li.is_gift_line ||
      Boolean(li.promo_code) ||
      (unitPrice > 0 && listPrice > 0 && unitPrice < listPrice),

    // Pricing (legacy mirrors)
    price,
    price_discount: unitPrice,
    price_gross: listPrice,
    gross_price: listPrice,
    vat_rate: num(li.vat_rate, 0),
    promo_code: li.promo_code ?? 0,
    promo_row: li.promo_row ?? 0,
    packaging_options_all: packagingAll,
    listing_type_discounts: '',

    // Meta / raw passthrough
    __cartMeta: {
      price_discount: unitPrice,
      gross_price: listPrice,
      vat_rate: num(li.vat_rate, 0),
      is_promo: li.is_gift_line || Boolean(li.promo_code),
      imballi: li.erp_data?.imballi,
      packaging_option_default: packagingAll.find(
        (p) => p.packaging_is_default,
      ),
      packaging_option_smallest: packagingAll.find(
        (p) => p.packaging_is_smallest,
      ),
      availability: li.erp_data?.availability,
      line_number: li.line_number,
      row_raw: li,
    },
  } satisfies Item;
}

/** Map a commerce-suite order to CartSummary */
export function mapCSOrderToSummary(order: any): CartSummary {
  const erpData = order.erp_data || {};
  const deliveryInfo = erpData.delivery_info || {};
  const minOrder = deliveryInfo.min_order || {};

  const toBool = (v: any) => v === true || v === 1 || v === '1' || v === 'true';

  return {
    orderId: order.order_id,
    idCart: order.order_id,
    clientId: order.customer_code,
    addressCode: order.shipping_address_code,
    closeEnable: toBool(deliveryInfo.close_enable),
    minOrder: minOrder.minimum_amount
      ? {
          warning: String(minOrder.warning ?? ''),
          minimumAmount: num(minOrder.minimum_amount, 0),
          compliant: toBool(minOrder.compliant),
        }
      : undefined,
    transportCost: num(order.shipping_cost, 0),
    transportFreeAbove: num(deliveryInfo.free_shipping_threshold, 0),
    totalNet: num(order.subtotal_net, 0),
    totalGross: num(order.subtotal_gross, 0),
    vat: num(order.total_vat, 0),
    totalDoc: num(order.order_total, 0),
    showDiscountPrice: Boolean(erpData.show_discount_price),
    packaging: erpData.imballi,
  };
}

/** Map full commerce-suite order response → { items, summary } */
export function mapCSOrderToCart(response: any): {
  items: Item[];
  summary: CartSummary;
} {
  const order = response?.order ?? response;
  const allItems = order?.items ?? [];
  return {
    items: allItems.map(mapCSLineItemToItem),
    summary: mapCSOrderToSummary(order),
  };
}

/** Build commerce-suite AddItemRequest from legacy AddToCartInput */
export function buildAddItemRequest(
  input: AddToCartInput,
  sourceItem?: Item,
): any {
  // Build discounts array from discount1-6
  const discounts: Array<{
    tier: number;
    type: string;
    value: number;
  }> = [];
  for (let i = 1; i <= 6; i++) {
    const value = Number((input as any)[`discount${i}`]) || 0;
    if (value !== 0) {
      discounts.push({ tier: i, type: 'percentage', value });
    }
  }

  // Resolve promo_code (0 or "0" means no promo)
  const promoCode =
    input.promo_code && input.promo_code !== 0 && input.promo_code !== '0'
      ? String(input.promo_code)
      : undefined;
  const promoRow =
    input.promo_row && Number(input.promo_row) > 0
      ? Number(input.promo_row)
      : undefined;

  const pkgDefault = sourceItem?.__cartMeta?.packaging_option_default;

  return {
    // Required
    entity_code: String(input.item_id),
    sku: sourceItem?.sku || String(input.item_id),
    name: sourceItem?.name || '',
    quantity: Number(input.quantity) || 0,
    list_price: Number(input.price) || 0,
    unit_price: Number(input.price_discount) || Number(input.price) || 0,
    vat_rate: Number(input.vat_perc) || 0,
    vat_included: false,

    // Product source
    product_source: 'external' as const,
    external_ref: String(input.item_id),
    added_from: 'b2b_erp',
    added_via: 'web',

    // Product snapshot
    image_url: sourceItem?.image || '',
    brand:
      typeof sourceItem?.brand === 'object'
        ? sourceItem?.brand?.name
        : sourceItem?.brand || '',
    category: '',

    // Packaging
    packaging_code: pkgDefault?.packaging_code || sourceItem?.uom || '',
    packaging_label:
      pkgDefault?.packaging_uom || pkgDefault?.packaging_uom_description || '',
    pack_size: pkgDefault?.qty_x_packaging || 1,
    min_order_quantity: Number(input.qty_min_packing) || 1,

    // Discounts
    discounts,

    // Promo
    promo_code: promoCode,
    promo_row: promoRow,
  };
}

// --- Type guard ---
const isLegacyPackaging = (x: any): x is PackagingOptionLegacy =>
  x &&
  (typeof x.CodiceImballo1 === 'string' ||
    typeof x.QtaXImballo !== 'undefined');

// --- Single-item mapper ---
export const mapLegacyPackaging = (
  p: PackagingOptionLegacy,
): PackagingOption => ({
  packaging_uom_description: String(p.DescrizioneUM ?? ''),
  packaging_code: String(p.CodiceImballo1 ?? p.label ?? ''),
  packaging_is_default: Boolean(
    p.IsImballoDiDefaultXVendita || p.IsImballoDiDefaultXVenditaDiretta,
  ),
  packaging_is_smallest: Boolean(p.IsImballoPiuPiccolo),
  qty_x_packaging: Number(
    p.QtaXImballo ?? 1, // fallbacks if needed
  ),
  packaging_uom: String(p.UM ?? ''),
});

// --- Array normalizer (handles mixed arrays just in case) ---
export const toPackagingOptions = (
  arr: Array<PackagingOption | PackagingOptionLegacy> | undefined | null,
): PackagingOption[] => {
  if (!arr || !Array.isArray(arr)) return [];
  const mapped = arr.map((x) =>
    isLegacyPackaging(x) ? mapLegacyPackaging(x) : x,
  );

  // optional: trim codes, coerce numbers safely
  return mapped.map((o) => ({
    ...o,
    packaging_code: o.packaging_code.trim(),
    qty_x_packaging: Number(o.qty_x_packaging ?? 1),
  }));
};
