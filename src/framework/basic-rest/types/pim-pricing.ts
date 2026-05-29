import type { PimProduct } from 'vinc-pim';

/**
 * Inline pricing block now shipped on PIM products (and per-packaging).
 * Mirrors the PIM/Mongoose schema verbatim, including `vat_included` and
 * any echoed-back fields like `tag_filter`. The published `vinc-pim`
 * types pre-date this block, so we extend locally until the package
 * catches up.
 *
 * `list_unit` / `retail_unit` only appear on the per-packaging pricing
 * (packaging_options[].pricing). They normalize the price to a single
 * unit when the packaging qty is > 1 (e.g. CFZ qty=10 with list=100 →
 * list_unit=10). When top-level `pricing` is stripped by the BE (no
 * customer context), the storefront falls back to
 * `packaging_options[0].pricing.list_unit` for a meaningful headline.
 */
export interface PimPricing {
  list?: number;
  retail?: number;
  list_unit?: number;
  retail_unit?: number;
  currency?: string;
  vat_rate?: number;
  vat_included?: boolean;
  tag_filter?: string[];
  /**
   * Tier discounts that produced this list price (e.g. [10, 5] → -10%
   * then -5%). The cart adapter spreads them into discount1..6 on the
   * cart line so the BE persists the same breakdown that the legacy
   * ERP price response used to ship as `raw.discount`.
   */
  discount?: number[];
  /** Extra promo-specific discounts; legacy `raw.discount_extra` equivalent. */
  discount_extra?: number[];
}

export interface PimPackagingPromotion {
  _id?: string;
  promo_code: string;
  promo_row?: number;
  discount_percentage?: number;
  promo_price?: number;
  min_quantity?: number;
  /** Restricts the promo to a subset of packaging pkg_ids. */
  target_pkg_ids?: string[];
  tag_filter?: string[];
  promo_title?: string;
  promo_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface PimPackagingOption {
  _id?: string;
  code: string;
  pkg_id?: string;
  qty?: number;
  is_sellable?: boolean;
  pricing?: PimPricing;
  promotions?: PimPackagingPromotion[];
}

/**
 * Informational packaging entry (never tag-filtered). The sellable
 * `packaging_options[]` entries reference these by `code`; this is where
 * UOM, description and the catalog flags live.
 *
 * Flag semantics (PIM ≠ legacy ERP):
 *   - `is_default: true`  → default UM/display unit (typically MV).
 *                           PackagingGrid shows this in the UM column.
 *   - `is_smallest: true` → smallest sellable packaging (typically CFZ).
 *                           Maps to legacy `packaging_option_default` —
 *                           the default packaging the customer buys in.
 *
 * `is_min_sell` is accepted as a back-compat alias for `is_smallest`
 * (some earlier PIM revisions named it that way).
 */
export interface PimPackagingInfo {
  _id?: string;
  code: string;
  description?: string;
  qty?: number;
  uom?: string;
  is_default?: boolean;
  is_smallest?: boolean;
  /** @deprecated Older PIM payloads used this name; prefer `is_smallest`. */
  is_min_sell?: boolean;
}

/**
 * 'priced'     — the product has a usable `pricing.list`
 * 'on-request' — no pricing block (or list missing); price is hidden
 * 'draft'      — explicit draft status from the PIM
 */
export type PricingStatus = 'priced' | 'on-request' | 'draft';

/** Raw PIM shape augmented with the inline pricing block. */
export interface RawPimProductWithPricing extends PimProduct {
  status?: string;
  pricing?: PimPricing;
  packaging_info?: PimPackagingInfo[];
  packaging_options?: PimPackagingOption[];
  promotions?: PimPackagingPromotion[];
  promo_code?: string[] | string;
  promo_type?: string[] | string;
}

/** Normalized pricing on the internal Product. */
export interface ProductPricing {
  status: PricingStatus;
  list?: number; // unit NET list
  retail?: number; // unit NET retail (MSRP) when different from list
  gross?: number; // unit GROSS list (list * (1 + vat/100) when !vat_included)
  currency?: string;
  vatRate?: number;
  vatIncluded?: boolean;
  /**
   * Tier-discount breakdown that produced the `list` price. Legacy ERP
   * shipped this as `raw.discount: number[]` and the cart adapter
   * spreads it across discount1..6 on each cart line. Captured during
   * the transform so the synth can hand it back to ErpPriceData.discount
   * without losing fidelity.
   */
  discountTiers?: number[];
  /** Extra/promo-specific tier discounts. Legacy `raw.discount_extra`. */
  discountTiersExtra?: number[];
}

/**
 * Italian standard VAT, used as a last-resort fallback when neither the
 * product nor its parent ships `vat_rate` (BE search enrichment currently
 * strips the variant root `pricing`, and the per-packaging pricing block
 * doesn't carry VAT info either). Tenants in other jurisdictions can
 * override later by ensuring the PIM payload carries `vat_rate`.
 */
const FALLBACK_VAT_RATE = 22;

/**
 * Derive the canonical ProductPricing from the raw pricing block, with two
 * cascading fallbacks:
 *
 *   1. The first sellable `packaging_options[].pricing.list_unit` when the
 *      product/variant root `pricing` is stripped (BE enrichment bug).
 *   2. `parentPricing` for VAT context — `vat_rate` and `vat_included` are
 *      catalog-level attributes, so when a variant has no `pricing` of its
 *      own we read the parent's. Without this, the cart payload ends up
 *      with `vat_rate: 0` and the BE rejects the add with 400.
 *
 * `vat_included: false` is the common case; `true` means list already
 * carries VAT and we back it out to expose a NET `list`.
 */
export function normalizeProductPricing(
  raw: PimPricing | undefined,
  rawStatus?: string,
  packagingOptions: PimPackagingOption[] = [],
  parentPricing?: PimPricing,
): ProductPricing {
  if (rawStatus === 'draft') return { status: 'draft' };

  const source = pickPricingSource(raw, packagingOptions, parentPricing);
  if (!source) return { status: 'on-request' };

  const listInput = Number(source.list);
  const retailInput = source.retail != null ? Number(source.retail) : undefined;
  // Tier discounts come from the same cascade as `list`: prefer the
  // top-level pricing block, fall back to the packaging-level block we
  // already walked into `source`. Empty arrays mean the cart adapter
  // won't write any discount1..6 entries.
  const discountTiers = pickDiscountTiers(
    raw,
    source,
    packagingOptions,
    (p) => p.discount,
  );
  const discountTiersExtra = pickDiscountTiers(
    raw,
    source,
    packagingOptions,
    (p) => p.discount_extra,
  );
  // vat_rate cascade: source → parent → fallback. The packaging-level pricing
  // block has no VAT info, and the BE strips the variant root pricing, so
  // without these fallbacks the cart payload would carry vat_rate: 0 and
  // get rejected with a 400.
  const vatRate =
    source.vat_rate != null
      ? Number(source.vat_rate)
      : parentPricing?.vat_rate != null
        ? Number(parentPricing.vat_rate)
        : FALLBACK_VAT_RATE;
  const vatIncluded =
    source.vat_included != null
      ? Boolean(source.vat_included)
      : Boolean(parentPricing?.vat_included);
  const factor = 1 + vatRate / 100;

  const list = vatIncluded && factor > 0 ? listInput / factor : listInput;
  const retail =
    retailInput == null
      ? undefined
      : vatIncluded && factor > 0
        ? retailInput / factor
        : retailInput;
  const gross = vatIncluded ? listInput : listInput * factor;

  return {
    status: 'priced',
    list,
    retail,
    gross,
    currency: source.currency,
    vatRate,
    vatIncluded,
    discountTiers,
    discountTiersExtra,
  };
}

/**
 * Walks the same fallback ladder as `pickPricingSource` to pull a
 * discount array off whichever pricing block has it. Returns [] when
 * nothing's shipped.
 */
function pickDiscountTiers(
  top: PimPricing | undefined,
  source: PimPricing,
  packagings: PimPackagingOption[],
  pick: (p: PimPricing) => number[] | undefined,
): number[] {
  const tryList = (p: PimPricing | undefined) => {
    if (!p) return undefined;
    const arr = pick(p);
    return Array.isArray(arr) && arr.length > 0
      ? arr.map((v) => Number(v) || 0)
      : undefined;
  };
  const fromTop = tryList(top);
  if (fromTop) return fromTop;
  const fromSource = tryList(source);
  if (fromSource) return fromSource;
  for (const opt of packagings) {
    if (opt.is_sellable === false) continue;
    const fromPkg = tryList(opt.pricing);
    if (fromPkg) return fromPkg;
  }
  return [];
}

/**
 * Internal: pick whichever pricing block has a usable per-unit list price.
 * The top-level `pricing` wins when it has `list`; otherwise we walk the
 * sellable packaging entries and reuse the first packaging's `list_unit`
 * (or `list / qty`) as the headline price. VAT info (`vat_rate`,
 * `vat_included`, `currency`) is inherited from the top-level pricing
 * block when the packaging block doesn't carry it — those are
 * catalog-level attributes that shouldn't vary per packaging.
 */
function pickPricingSource(
  top: PimPricing | undefined,
  packagings: PimPackagingOption[],
  parent?: PimPricing,
): PimPricing | null {
  // Headline price is always `list_unit` — the per-single-unit price.
  // No fallback to `list` (that's the package total, not the unit price).
  if (top?.list_unit != null && Number.isFinite(Number(top.list_unit))) {
    return {
      ...top,
      list: Number(top.list_unit),
      retail:
        top.retail_unit != null && Number.isFinite(Number(top.retail_unit))
          ? Number(top.retail_unit)
          : undefined,
    };
  }

  for (const opt of packagings) {
    if (opt.is_sellable === false) continue;
    const p = opt.pricing;
    if (!p || p.list_unit == null) continue;
    const perUnit = Number(p.list_unit);
    if (!Number.isFinite(perUnit)) continue;
    const retailPerUnit =
      p.retail_unit != null && Number.isFinite(Number(p.retail_unit))
        ? Number(p.retail_unit)
        : undefined;
    return {
      ...p,
      list: perUnit,
      retail: retailPerUnit,
      // VAT context cascade: packaging → top-level → parent
      vat_rate: p.vat_rate ?? top?.vat_rate ?? parent?.vat_rate,
      vat_included: p.vat_included ?? top?.vat_included ?? parent?.vat_included,
      currency: p.currency ?? top?.currency ?? parent?.currency,
    };
  }

  return null;
}
