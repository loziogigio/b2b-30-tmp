// price-and-promo.tsx
'use client';

import React from 'react';
import cn from 'classnames';
import {
  formatPromoDate,
  type ErpPriceData,
} from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { formatPriceIt } from '@utils/money';
import type { Product } from '@framework/types';

export type PriceSlice = Pick<
  ErpPriceData,
  | 'discount_description'
  | 'gross_price'
  | 'is_promo'
  | 'price_discount'
  | 'count_promo'
>;

type Props = {
  name?: string;
  sku?: string;
  /**
   * Product with inline pricing (preferred source). When `product.pricing`
   * is 'priced', it overrides `priceData`. When 'on-request' or 'draft',
   * the card renders a "Prezzo su richiesta" hint instead of nothing.
   */
  product?: Product | null;
  // Accept ERP or the slice; allow undefined/null
  priceData?: Partial<PriceSlice> | ErpPriceData | null;
  className?: string;
  currency?: string;
  withSchemaOrg?: boolean;
  onPromosClick?: () => void;
  /** Use white text for dark backgrounds */
  invertColors?: boolean;
};

/**
 * Build a PriceSlice from a Product's inline pricing block. Mirrors the
 * ERP semantics: `gross_price` = list × (1 + VAT) for the strikethrough,
 * `price_discount` = NET list for the headline. Promotions stay out of
 * the headline (min_quantity gating makes the promo price conditional);
 * we only surface them via `count_promo` for the "+N" badge.
 */
function productToPriceSlice(product?: Product | null): PriceSlice | null {
  const pricing = product?.pricing;
  if (!pricing || pricing.status !== 'priced' || pricing.list == null) {
    return null;
  }

  const packagingPromos = (product?.packagingOptions ?? []).flatMap(
    (opt) => opt.promotions ?? [],
  );
  const rootPromos = Array.isArray(product?.promotions)
    ? (product?.promotions as unknown[])
    : [];
  const count_promo = packagingPromos.length + rootPromos.length;

  return {
    price_discount: pricing.list,
    gross_price: pricing.gross ?? pricing.list,
    discount_description: '',
    is_promo: count_promo > 0,
    count_promo,
  };
}

const splitDiscountLines = (v: unknown): string[] => {
  if (!v && v !== 0) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v)
    .split(/<br\s*\/?>|\n|\|/gi)
    .map((x) => x.trim())
    .filter(Boolean);
};

export default function PriceAndPromo({
  name,
  sku,
  product,
  priceData,
  className,
  currency = 'EUR',
  withSchemaOrg = true,
  onPromosClick,
  invertColors = false,
}: Props) {
  const { hidePrices } = useUI();
  const { settings } = useHomeSettings();
  const decimals = settings?.cardStyle?.priceDecimals ?? 2;

  // Hide prices when toggle is active (like when not logged in)
  if (hidePrices) return null;

  // Inline product pricing wins over the ERP slice. Status === 'on-request'
  // / 'draft' falls through with effective=null, then we render the hint.
  const productSlice = productToPriceSlice(product);
  const effective: Partial<PriceSlice> | ErpPriceData | null =
    productSlice ?? priceData ?? null;

  if (!effective) {
    const status = product?.pricing?.status;
    if (status === 'on-request' || status === 'draft') {
      return (
        <span
          className={cn(
            'text-xs italic',
            invertColors ? 'text-white/80' : 'text-gray-500',
            className,
          )}
        >
          Prezzo su richiesta
        </span>
      );
    }
    return null;
  }

  // normalize shapes (support net_price and price_gross too)
  const anyPD = effective as any;
  const price_discount = anyPD.price_discount ?? anyPD.net_price;
  const gross_price = anyPD.gross_price ?? anyPD.price_gross;
  const discount_description = anyPD.discount_description;
  const is_promo: boolean = Boolean(anyPD.is_promo);
  const count_promo: number = Number(anyPD.count_promo ?? 0);
  const is_improving_promo: boolean = Boolean(anyPD.is_improving_promo);
  const end_promo_date = anyPD.end_promo_date;
  const promoEndDisplay = formatPromoDate(end_promo_date);

  // No valid price - check all price fields
  const hasNoValidPrice =
    (price_discount == null || Number(price_discount) <= 0) &&
    (gross_price == null || Number(gross_price) <= 0);
  if (hasNoValidPrice) return null;

  const priceDiscountFmt = formatPriceIt(price_discount, decimals);
  const grossPriceFmt = formatPriceIt(gross_price, decimals);

  const showPrev =
    gross_price != null && Number(gross_price) !== Number(price_discount);
  const discountLines = splitDiscountLines(discount_description);
  const Wrapper: React.ElementType = 'div';

  return (
    <Wrapper
      className={cn('flex items-center justify-center px-0 py-0', className)}
      {...(withSchemaOrg
        ? { itemScope: true, itemType: 'https://schema.org/Product' }
        : {})}
    >
      {withSchemaOrg && (
        <>
          <meta itemProp="name" content={name ?? ''} />
          <meta itemProp="sku" content={sku ?? ''} />
        </>
      )}

      <div
        className={cn(
          'text-sm text-left',
          invertColors ? 'text-white' : 'text-gray-800',
        )}
        {...(withSchemaOrg
          ? {
              itemProp: 'offers',
              itemScope: true,
              itemType: 'https://schema.org/Offer',
            }
          : {})}
      >
        {withSchemaOrg && <meta itemProp="priceCurrency" content={currency} />}

        <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-[280px]">
          {(showPrev || discountLines.length > 0) && (
            <div className="flex flex-col items-end leading-tight">
              {showPrev && (
                <span
                  className={cn(
                    'line-through uppercase tracking-wide text-[10px] sm:text-xs',
                    invertColors ? 'text-white/70' : 'text-gray-500',
                  )}
                >
                  {grossPriceFmt} €
                </span>
              )}
              {discountLines.length > 0 && (
                <span
                  className={cn(
                    'text-[10px] sm:text-xs font-bold',
                    invertColors ? 'text-white/80' : 'text-red-600',
                  )}
                >
                  {discountLines.join(' ')}
                </span>
              )}
            </div>
          )}
          <div
            className={cn(
              'text-lg sm:text-[22px] font-bold flex items-baseline gap-0.5 sm:gap-1',
              invertColors
                ? 'text-white'
                : is_promo
                  ? 'text-red-500'
                  : 'text-black',
            )}
          >
            <span {...(withSchemaOrg ? { itemProp: 'price' } : {})}>
              {priceDiscountFmt}
            </span>
            <span className="text-sm sm:text-base font-normal">€</span>
          </div>
          {count_promo > 0 && (
            <button
              type="button"
              onClick={onPromosClick}
              title="View all promotions"
              className="bg-red-500 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-semibold"
            >
              +{count_promo}
            </button>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
