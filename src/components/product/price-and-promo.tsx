// price-and-promo.tsx
'use client';

import React from 'react';
import cn from 'classnames';
import { type ErpPriceData } from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { formatPriceIt } from '@utils/money';
import type { Product } from '@framework/types';
import { useProductPriceData } from '@framework/pricing';
import { selectBestPrice } from '@framework/pricing/best-price';

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
   * is 'priced', it overrides `priceData`. Otherwise nothing is rendered.
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

  // Active pricingSource decides whether the headline reads from PIM
  // inline pricing or from the ERP slice (or both, in hybrid). Caller-
  // passed priceData wins as an explicit override. We cast through
  // `as ErpPriceData` because the prop type accepts a Partial<PriceSlice>
  // too — the hook just forwards the override unchanged, and the readers
  // below already null-check every field.
  const overrideAsErp =
    priceData && typeof priceData === 'object'
      ? (priceData as ErpPriceData)
      : undefined;
  const resolved = useProductPriceData(product ?? undefined, {
    override: overrideAsErp,
  });
  const effective: Partial<PriceSlice> | ErpPriceData | null =
    resolved ?? priceData ?? null;

  // Hide prices when toggle is active (like when not logged in). We do
  // this AFTER the hook call so hook order stays stable across renders.
  if (hidePrices) return null;

  if (!effective) {
    return null;
  }

  // normalize shapes (support net_price and price_gross too)
  const anyPD = effective as any;
  // Lowest of the listino and any qualifying promo — not the ERP's single
  // pre-selected improving_promo, which can be dearer than both. Only
  // applies when `effective` is a real ErpPriceData (carries net_price);
  // callers that pass a pre-resolved PriceSlice (e.g. the cart line summary,
  // which only sets price_discount to the cart line's own net unit price)
  // have nothing to select — read that value as-is.
  const price_discount =
    anyPD.net_price != null
      ? selectBestPrice(effective as ErpPriceData).effectivePrice
      : anyPD.price_discount;
  const gross_price = anyPD.gross_price ?? anyPD.price_gross;
  const discount_description = anyPD.discount_description;
  const is_promo: boolean = Boolean(anyPD.is_promo);

  // No valid price - check all price fields
  const hasNoValidPrice =
    (price_discount == null || Number(price_discount) <= 0) &&
    (gross_price == null || Number(gross_price) <= 0);
  if (hasNoValidPrice) return null;

  const priceDiscountFmt = formatPriceIt(price_discount, decimals);
  const grossPriceFmt = formatPriceIt(gross_price, decimals);

  const showPrev =
    gross_price != null && Number(gross_price) !== Number(price_discount);
  // Prefer the legacy pre-formatted `discount_description` string when
  // provided; otherwise fall back to the raw tier numbers in `discount_extra`
  // and format them with the same dynamic `decimals` as the price headline.
  const discount_extra: unknown = anyPD.discount_extra;
  // Render the raw % value with no trailing zeros: 1 → "-1%", 0.47 → "-0.47%".
  // The price headline pads to `decimals` for visual alignment; the discount
  // tier is a percentage and shouldn't sprout fake "0"s.
  const fmtPct = (d: number) => `-${Math.abs(Number(d))}%`;
  const discountLines =
    splitDiscountLines(discount_description).length > 0
      ? splitDiscountLines(discount_description)
      : Array.isArray(discount_extra)
        ? (discount_extra as number[])
            .filter((v) => typeof v === 'number' && v !== 0)
            .map(fmtPct)
        : [];
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
        </div>
      </div>
    </Wrapper>
  );
}
