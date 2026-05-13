import type { PimProduct } from 'vinc-pim';

/**
 * Inline pricing block now shipped on PIM products (and per-packaging).
 * Mirrors the PIM/Mongoose schema verbatim, including `vat_included` and
 * any echoed-back fields like `tag_filter`. The published `vinc-pim`
 * types pre-date this block, so we extend locally until the package
 * catches up.
 */
export interface PimPricing {
  list?: number;
  retail?: number;
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
 * Derive the canonical ProductPricing from the raw pricing block.
 * `vat_included: false` is the common case; `true` means list already
 * carries VAT and we back it out to expose a NET `list`.
 */
export function normalizeProductPricing(
  raw: PimPricing | undefined,
  rawStatus?: string,
): ProductPricing {
  if (rawStatus === 'draft') return { status: 'draft' };
  if (!raw || raw.list == null) return { status: 'on-request' };

  const listInput = Number(raw.list);
  const retailInput = raw.retail != null ? Number(raw.retail) : undefined;
  const vatRate = raw.vat_rate != null ? Number(raw.vat_rate) : 0;
  const vatIncluded = Boolean(raw.vat_included);
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
    currency: raw.currency,
    vatRate,
    vatIncluded,
  };
}
