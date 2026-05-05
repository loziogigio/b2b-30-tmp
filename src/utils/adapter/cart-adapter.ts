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

// Strip any `gallery_` / `main_` size prefix from the filename so the stored
// URL is the original. See src/utils/image-versioning.ts for the flip side.
const stripSizePrefix = (url: string): string => {
  if (!url) return url;
  const lastSlash = url.lastIndexOf('/');
  if (lastSlash === -1) return url;
  const filename = url.slice(lastSlash + 1);
  const stripped = filename.replace(/^(gallery_|main_)/, '');
  return `${url.slice(0, lastSlash + 1)}${stripped}`;
};

// =====================================================================
// Commerce-Suite (CS) mappers — maps VINC order/items → Item/CartSummary
// =====================================================================

/** Read all non-zero tier-discount values for a line, regardless of where the
 *  data sits (li.discounts, li.raw_data.discounts, or flat discount1..6). */
function collectTierDiscounts(li: any): number[] {
  const arr: any[] | undefined = Array.isArray(li.discounts)
    ? li.discounts
    : Array.isArray(li.raw_data?.discounts)
      ? li.raw_data.discounts
      : undefined;
  if (arr && arr.length) {
    return arr
      .map((d: any) => Number(d?.value ?? 0))
      .filter((v) => v && v !== 0);
  }
  const out: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const v = Number(li[`discount${i}`] ?? li.raw_data?.[`discount${i}`] ?? 0);
    if (v && v !== 0) out.push(v);
  }
  return out;
}

/** Build a percent-style discount description like "-5% -3%". */
function discountsToDescription(values: number[]): string {
  if (!values.length) return '';
  return values.map((v) => `${v}%`).join(' ');
}

/** Compose discount factors (negative = reduction, positive = surcharge) onto
 *  a base price: each tier multiplies by `(1 + value / 100)` (value is signed). */
function applyDiscountChain(base: number, values: number[]): number {
  return values.reduce((acc, v) => acc * (1 + Number(v) / 100), base);
}

/** Map a commerce-suite LineItem to the existing Item interface */
export function mapCSLineItemToItem(li: any): Item {
  const unitPrice = num(li.unit_price, 0);
  let listPrice = num(li.list_price, 0);
  const tierDiscounts = collectTierDiscounts(li);
  // The ERP sometimes stores list_price already-discounted (== unit_price). When
  // we have an explicit tier-discount chain, recover the implied gross so the
  // strike-through old price renders correctly.
  if (
    tierDiscounts.length > 0 &&
    unitPrice > 0 &&
    Math.abs(listPrice - unitPrice) < 0.0001
  ) {
    const factor = applyDiscountChain(1, tierDiscounts);
    if (factor > 0 && factor < 1) {
      listPrice = unitPrice / factor;
    }
  }
  const price = unitPrice || listPrice || 0;
  const discountDescription = discountsToDescription(tierDiscounts);

  // Packaging info source priority:
  //   1. li.raw_data.packaging_options_all  ← set by buildAddItemRequest;
  //      commerce-suite persists the full add-item body into raw_data, so the
  //      complete packaging array survives round-trip without re-fetching ERP.
  //   2. li.erp_data.imballi.packaging_options  ← if an ERP merge ran server-side.
  //   3. empty → PackagingGrid hides itself.
  const rawPackagingAll: PackagingOption[] | undefined =
    li.raw_data?.packaging_options_all;
  const erpImballi = li.erp_data?.imballi?.packaging_options;
  const packagingAll: PackagingOption[] = Array.isArray(rawPackagingAll)
    ? rawPackagingAll
    : erpImballi
      ? toPackagingOptions(erpImballi)
      : [];

  const rawPkgDefault: PackagingOption | undefined =
    li.raw_data?.packaging_option_default;
  const rawPkgSmallest: PackagingOption | undefined =
    li.raw_data?.packaging_option_smallest;

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
    note: li.note || '',

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
    listing_type_discounts: discountDescription,

    // Meta / raw passthrough
    __cartMeta: {
      price_discount: unitPrice,
      gross_price: listPrice,
      vat_rate: num(li.vat_rate, 0),
      is_promo: li.is_gift_line || Boolean(li.promo_code),
      imballi: li.erp_data?.imballi,
      packaging_option_default:
        rawPkgDefault ?? packagingAll.find((p) => p.packaging_is_default),
      packaging_option_smallest:
        rawPkgSmallest ?? packagingAll.find((p) => p.packaging_is_smallest),
      packaging_options_all: packagingAll,
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
    cartName: order.cart_name?.trim() || undefined,
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

  const meta = sourceItem?.__cartMeta as any;
  const pkgDefault: PackagingOption | undefined =
    meta?.packaging_option_default;
  const pkgSmallest: PackagingOption | undefined =
    meta?.packaging_option_smallest;
  const pkgAll: PackagingOption[] | undefined = meta?.packaging_options_all;

  // Extract image URL. sourceItem.image is usually already a string (via
  // generateCartItem) but can also be an Attachment object. Prefer the
  // unprefixed `original` URL so cart-side image versioning can re-prefix
  // without double-prefixing (e.g. `gallery_main_photo.jpg`).
  const rawImg: any = (sourceItem as any)?.image;
  const rawImgStr =
    typeof rawImg === 'string'
      ? rawImg
      : rawImg?.original || rawImg?.thumbnail || '';
  const imageUrl = stripSizePrefix(rawImgStr);

  // Resolve human-readable SKU. `input.item_id` is the PIM entity_code (e.g.
  // "003114") which we MUST NOT use as the SKU — the SKU is the catalog code
  // (e.g. "SPORG"). Fall back to entity_code only if no real sku is available.
  const resolvedSku = sourceItem?.sku
    ? String(sourceItem.sku)
    : String(input.item_id);

  return {
    // Required
    entity_code: String(input.item_id),
    sku: resolvedSku,
    name: sourceItem?.name || '',
    quantity: Number(input.quantity) || 0,
    list_price: Number(input.price) || 0,
    unit_price: Number(input.price_discount) || Number(input.price) || 0,
    vat_rate: Number(input.vat_perc) || 0,
    vat_included: false,

    // Product source — products in this B2B project come from the internal
    // PIM catalog (commerce-suite enum: "pim" | "external" | "manual").
    product_source: 'pim' as const,
    external_ref: resolvedSku,
    added_from: 'b2b_erp',
    added_via: 'web',

    // Product snapshot
    image_url: imageUrl,
    brand:
      typeof sourceItem?.brand === 'object'
        ? sourceItem?.brand?.name
        : sourceItem?.brand || '',
    category: '',

    // Packaging (default column — what commerce-suite stores on the LineItem)
    packaging_code: pkgDefault?.packaging_code || sourceItem?.uom || '',
    packaging_label:
      pkgDefault?.packaging_uom || pkgDefault?.packaging_uom_description || '',
    pack_size: pkgDefault?.qty_x_packaging || 1,
    min_order_quantity: Number(input.qty_min_packing) || 1,

    // Full packaging context — passed as extra fields. Commerce-suite persists
    // the whole body into `raw_data`, so these come back verbatim on GET and
    // let the cart render the complete UM | code columns grid without having
    // to re-fetch ERP prices.
    packaging_options_all: pkgAll,
    packaging_option_default: pkgDefault,
    packaging_option_smallest: pkgSmallest,

    // Discounts
    discounts,

    // Promo
    promo_code: promoCode,
    promo_row: promoRow,

    // Note
    ...(input.note ? { note: input.note } : {}),
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
