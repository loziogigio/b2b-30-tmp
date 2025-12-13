// price-and-promo.tsx
'use client';

import React from 'react';
import cn from 'classnames';
import {
  formatPromoDate,
  type ErpPriceData,
} from '@utils/transform/erp-prices';
import { useUI } from '@contexts/ui.context';

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
  priceData,
  className,
  currency = 'EUR',
  withSchemaOrg = true,
  onPromosClick,
  invertColors = false,
}: Props) {
  const { hidePrices } = useUI();

  // Hide prices when toggle is active (like when not logged in)
  if (hidePrices) return null;

  if (!priceData) return null;

  // normalize shapes (support net_price and price_gross too)
  const anyPD = priceData as any;
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

        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-4 w-full max-w-[280px]">
          <div className="flex flex-col items-center text-center gap-0.5 sm:gap-1">
            <div className="flex items-center gap-1 sm:gap-2">
              {showPrev && (
                <div>
                  <span
                    className={cn(
                      'line-through uppercase tracking-wide text-[10px] sm:text-xs',
                      invertColors ? 'text-white/70' : 'text-gray-500',
                    )}
                  >
                    {gross_price} €
                  </span>
                  {discountLines.length > 0 && showPrev ? (
                    <div
                      className={cn(
                        'text-[10px] sm:text-xs leading-tight',
                        invertColors ? 'text-white/70' : 'text-gray-500',
                      )}
                    >
                      {discountLines.map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>
                  ) : null}
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
                  {price_discount}
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

          {is_improving_promo && (
            <div className="flex flex-row sm:flex-col items-center gap-1 sm:gap-0 text-red-500 uppercase tracking-wide text-[10px] sm:text-xs">
              <span className="bg-red-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-semibold text-[9px] sm:text-[10px]">
                Offerta
              </span>
              {promoEndDisplay ? (
                <span className="sm:mt-0.5 text-[9px] sm:text-[11px] normal-case font-semibold tracking-normal">
                  {promoEndDisplay}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
