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
 * 'priced'     — the product has a usable `pricing.list`
 * 'on-request' — no pricing block (or list missing); show "Prezzo su richiesta"
 * 'draft'      — explicit draft status from the PIM
 */
export type PricingStatus = 'priced' | 'on-request' | 'draft';

/** Raw PIM shape augmented with the inline pricing block. */
export interface RawPimProductWithPricing extends PimProduct {
  status?: string;
  pricing?: PimPricing;
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
}

/**
 * Derive the canonical ProductPricing from the raw pricing block, with a
 * fallback to the first sellable packaging's per-unit pricing when the
 * top-level block is missing or has no `list`. The BE search enrichment
 * sometimes strips the variant root `pricing` but keeps
 * `packaging_options[].pricing.list_unit` populated, so we look there
 * before declaring the product on-request.
 *
 * `vat_included: false` is the common case; `true` means list already
 * carries VAT and we back it out to expose a NET `list`.
 */
export function normalizeProductPricing(
  raw: PimPricing | undefined,
  rawStatus?: string,
  packagingOptions: PimPackagingOption[] = [],
): ProductPricing {
  if (rawStatus === 'draft') return { status: 'draft' };

  const source = pickPricingSource(raw, packagingOptions);
  if (!source) return { status: 'on-request' };

  const listInput = Number(source.list);
  const retailInput = source.retail != null ? Number(source.retail) : undefined;
  const vatRate = source.vat_rate != null ? Number(source.vat_rate) : 0;
  const vatIncluded = Boolean(source.vat_included);
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
  };
}

/**
 * Internal: pick whichever pricing block has a usable per-unit list price.
 * The top-level `pricing` wins when it has `list`; otherwise we walk the
 * sellable packaging entries and reuse the first packaging's `list_unit`
 * (or `list / qty`) as the headline price.
 */
function pickPricingSource(
  top: PimPricing | undefined,
  packagings: PimPackagingOption[],
): PimPricing | null {
  if (top?.list != null) return top;

  for (const opt of packagings) {
    if (opt.is_sellable === false) continue;
    const p = opt.pricing;
    if (!p) continue;
    const qty = Number(opt.qty ?? 1) || 1;
    const perUnit =
      p.list_unit != null
        ? Number(p.list_unit)
        : p.list != null
          ? Number(p.list) / qty
          : null;
    if (perUnit == null || !Number.isFinite(perUnit)) continue;
    const retailPerUnit =
      p.retail_unit != null
        ? Number(p.retail_unit)
        : p.retail != null
          ? Number(p.retail) / qty
          : undefined;
    return {
      ...p,
      list: perUnit,
      retail: retailPerUnit,
    };
  }

  return null;
}
