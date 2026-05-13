import type {
  ErpPriceData,
  PackagingOption,
  PromoOffer,
} from './erp-prices';
import type { Product } from '@framework/types';
import type {
  PimPackagingOption,
  PimPackagingPromotion,
} from '@framework/types/pim-pricing';

/**
 * Adapter: inline PIM pricing → legacy ErpPriceData shape.
 *
 * The downstream UI (B2BOfferRows, B2BInfoBlock, PackagingGrid, AddToCart)
 * is still built around `ErpPriceData`. Rather than rewriting all of those
 * at once, we synthesize the same shape from `product.pricing` and
 * `product.packagingOptions`. When the BE later strips fields we don't
 * carry (availability, product_label_action, etc.), the UI uses its own
 * defaults.
 *
 * Returns null when the product isn't priced — callers should treat that
 * the same as "no ERP data available."
 */
export function productToErpPriceData(
  product: Product | null | undefined,
): ErpPriceData | null {
  if (!product) return null;
  const pricing = product.pricing;
  if (!pricing || pricing.status !== 'priced' || pricing.list == null) {
    return null;
  }

  const packagingOptions = product.packagingOptions ?? [];
  const mappedPackagings = packagingOptions.map(toErpPackaging);
  // Mark first entry as default and the smallest-qty entry as smallest.
  // Inline packagings don't carry default/smallest flags, so we infer.
  if (mappedPackagings.length > 0) {
    mappedPackagings[0].packaging_is_default = true;
    const smallestIndex = mappedPackagings.reduce(
      (best, opt, idx, arr) =>
        opt.qty_x_packaging < arr[best].qty_x_packaging ? idx : best,
      0,
    );
    mappedPackagings[smallestIndex].packaging_is_smallest = true;
  }
  const defaultPackaging = mappedPackagings[0] ?? fallbackPackaging(product);
  const smallestPackaging =
    mappedPackagings.find((p) => p.packaging_is_smallest) ?? defaultPackaging;

  // Promotions live per-packaging in the inline shape; flatten to the
  // legacy "all promo offers" list, carrying the list price as the
  // reference so PriceCell can render the strikethrough.
  const allPromoOffers = flattenPromoOffers(packagingOptions, pricing.list);

  const netPrice = pricing.list;
  // `gross_price` in the legacy ErpPriceData drives the PriceCell
  // strikethrough. For B2B, the legit "old price" is the NET retail/MSRP,
  // not the VAT-inclusive gross — otherwise every product shows a fake
  // strikethrough just because of VAT. When retail equals list there's
  // no markdown, so we make gross == net and PriceCell hides the strike.
  const retailPrice = pricing.retail ?? pricing.list;
  const grossPrice = retailPrice;

  return {
    entity_code: String(product.id ?? ''),
    net_price: netPrice,
    gross_price: grossPrice,
    price: netPrice,
    price_discount: netPrice,
    vat_percent: pricing.vatRate ?? 0,
    /**
     * Availability isn't in the inline payload yet. Default to a positive
     * value so UI gates that check "> 0" don't flip products to
     * out-of-stock by mistake. Once BE ships availability, swap this in.
     */
    availability: 1,
    discount: [],
    packaging_option_default: defaultPackaging,
    packaging_option_smallest: smallestPackaging,
    packaging_options_all: mappedPackagings,
    packaging_options: [],
    all_promo_offers: allPromoOffers,
    is_promo: allPromoOffers.length > 0,
    promo: allPromoOffers.length > 0,
    count_promo: allPromoOffers.length,
    num_promo: allPromoOffers.length,
    discount_description: '',
  };
}

function toErpPackaging(opt: PimPackagingOption): PackagingOption {
  const qty = Number(opt.qty ?? 1) || 1;
  // The inline shape only ships `code` + `qty`. We treat the first
  // packaging entry as the default (callers can override) and the
  // smallest by qty as "smallest". Description falls back to the code.
  return {
    packaging_uom_description: opt.code ?? '',
    packaging_code: opt.code ?? '',
    packaging_is_default: false, // set by caller after sorting
    packaging_is_smallest: false,
    qty_x_packaging: qty,
    packaging_uom: opt.code ?? '',
  };
}

function fallbackPackaging(product: Product): PackagingOption {
  return {
    packaging_uom_description: product.unit ?? '',
    packaging_code: 'MV',
    packaging_is_default: true,
    packaging_is_smallest: true,
    qty_x_packaging: 1,
    packaging_uom: product.unit ?? '',
  };
}

function flattenPromoOffers(
  options: PimPackagingOption[],
  listNet: number,
): PromoOffer[] {
  const offers: PromoOffer[] = [];
  options.forEach((opt) => {
    (opt.promotions ?? []).forEach((p) =>
      offers.push(toErpPromoOffer(p, opt, listNet)),
    );
  });
  return offers;
}

function toErpPromoOffer(
  p: PimPackagingPromotion,
  opt: PimPackagingOption,
  listNet: number,
): PromoOffer {
  return {
    promo_code: p.promo_code,
    promo_row: p.promo_row ?? 0,
    promo_title: p.promo_title ?? '',
    promo_type: p.promo_type ?? '',
    promo_qty_required: Number(p.min_quantity ?? 0),
    promo_packaging_required: 0,
    promo_qty_per_packaging: Number(opt.qty ?? 0),
    promo_min_pieces: 0,
    promo_min_value: 0,
    promo_net_price: Number(p.promo_price ?? 0),
    promo_ref_list_price: listNet,
    promo_standard_price: listNet,
    promo_start_date: toYmd(p.start_date),
    promo_end_date: toYmd(p.end_date),
    promo_extra_discounts:
      p.discount_percentage != null ? [Number(p.discount_percentage)] : [],
    promo_gift_qty: 0,
  };
}

/**
 * Normalize PIM promo dates to YYYY-MM-DD so the existing offer-row
 * formatter renders DD/MM/YYYY. The BE ships ISO timestamps
 * (e.g. "2026-05-14T22:00:00.000Z") which the existing fmtDate regex
 * doesn't match — it falls through to the raw string and the UI shows
 * the full ISO timestamp instead of an Italian-formatted date.
 */
function toYmd(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
