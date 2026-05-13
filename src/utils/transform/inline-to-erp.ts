import type {
  ErpPriceData,
  PackagingOption,
  PromoOffer,
} from './erp-prices';
import type { Product } from '@framework/types';
import type {
  PimPackagingInfo,
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
  const packagingInfo = product.packagingInfo ?? [];

  // packaging_info is the master list (full catalog of packagings,
  // ordered MV first → UM column, then the others). packaging_options
  // is tag-filtered to the customer's tier and carries pricing. We
  // iterate info in its natural order and merge sellability/pricing
  // from options by code; entries without a matching option still
  // appear in packaging_options_all for display (so the PackagingGrid
  // can render MV alongside the sellable codes).
  const optionByCode: Record<string, PimPackagingOption> = {};
  for (const opt of packagingOptions) {
    if (opt?.code) optionByCode[opt.code] = opt;
  }

  // Source of truth for the mapping: packaging_info if shipped; else
  // fall back to packaging_options (BE rollout / legacy products).
  const mappedPackagings: PackagingOption[] =
    packagingInfo.length > 0
      ? packagingInfo.map((info) =>
          toErpPackaging(optionByCode[info.code], info),
        )
      : packagingOptions.map((opt) => toErpPackaging(opt));

  // Legacy ErpPriceData semantics:
  //   packaging_option_default  → the customer's default packaging FOR
  //                               SALE (typically CFZ — the smallest
  //                               sellable). Maps to PIM's `is_smallest`.
  //   packaging_option_smallest → same in most catalogs.
  //
  // PIM's `is_default: true` flags the UM/display unit (typically MV)
  // and we keep that on `packaging_is_default` so the PackagingGrid UM
  // column resolves to MV's uom. The "default for sale" pick is a
  // separate calculation that prefers sellable + smallest.
  const sellablePackagings = mappedPackagings.filter(
    (p) => p.packaging_code && optionByCode[p.packaging_code],
  );
  const defaultForSale =
    sellablePackagings.find((p) => p.packaging_is_smallest) ??
    sellablePackagings[0] ??
    mappedPackagings[0] ??
    fallbackPackaging(product);
  const smallestPackaging = defaultForSale;

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
    packaging_option_default: defaultForSale,
    packaging_option_smallest: smallestPackaging,
    packaging_options_all: mappedPackagings,
    packaging_options: [],
    all_promo_offers: allPromoOffers,
    // is_promo / promo describe whether *this* price line is a promo
    // override (legacy is_improving_promo flow), not whether promos
    // exist alongside the listino. The PROMO rows get their own
    // is_promo: true via buildPromoPriceData; the base LISTINO line
    // must stay false so its Counter renders green (not red) and the
    // card's headline price isn't tinted red just because offers exist.
    is_promo: false,
    promo: false,
    count_promo: allPromoOffers.length,
    num_promo: allPromoOffers.length,
    discount_description: '',
  };
}

/**
 * Build a legacy PackagingOption from a sellable `packaging_options`
 * entry, an informational `packaging_info` entry, or both. When only
 * `info` is present (no matching option), the packaging is still
 * surfaced for display but isn't sellable.
 */
function toErpPackaging(
  opt: PimPackagingOption | undefined,
  info?: PimPackagingInfo,
): PackagingOption {
  // packaging_uom is a unit of measure ("PZ", "KG", "LT"), not the
  // packaging code ("CFZ", "IMB"). The BE cart payload validates this,
  // so we look it up from packaging_info and only fall back to the code
  // when info is missing.
  const code = (opt?.code ?? info?.code ?? '').trim();
  const qty = Number(opt?.qty ?? info?.qty ?? 1) || 1;
  const uom = info?.uom || code;
  const description = info?.description || code;
  return {
    packaging_uom_description: description,
    packaging_code: code,
    packaging_is_default: Boolean(info?.is_default),
    packaging_is_smallest: Boolean(info?.is_smallest ?? info?.is_min_sell),
    qty_x_packaging: qty,
    packaging_uom: uom,
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
