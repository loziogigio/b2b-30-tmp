// price-and-promo.tsx
'use client';

import React from 'react';
import cn from 'classnames';
import type { ErpPriceData } from '@utils/transform/erp-prices';

export type PriceSlice = Pick<
  ErpPriceData,
  'discount_description' | 'gross_price' | 'is_promo' | 'price_discount' | 'count_promo'
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
}: Props) {
  if (!priceData) return null;

  // normalize shapes (support net_price and price_gross too)
  const anyPD = priceData as any;
  const price_discount = anyPD.price_discount ?? anyPD.net_price;
  const gross_price = anyPD.gross_price ?? anyPD.price_gross;
  const discount_description = anyPD.discount_description;
  const is_promo: boolean = Boolean(anyPD.is_promo);
  const count_promo: number = Number(anyPD.count_promo ?? 0);

  if (price_discount == null) return null;

  const showPrev =
    gross_price != null && Number(gross_price) !== Number(price_discount);
  const discountLines = splitDiscountLines(discount_description);
  const Wrapper: React.ElementType = 'div';

  return (
    <Wrapper
      className={cn('flex items-center justify-center px-3 py-1', className)}
      {...(withSchemaOrg ? { itemScope: true, itemType: 'https://schema.org/Product' } : {})}
    >
      {withSchemaOrg && (
        <>
          <meta itemProp="name" content={name ?? ''} />
          <meta itemProp="sku" content={sku ?? ''} />
        </>
      )}

      <div
        className="text-sm text-gray-800 text-left"
        {...(withSchemaOrg ? { itemProp: 'offers', itemScope: true, itemType: 'https://schema.org/Offer' } : {})}
      >
        {withSchemaOrg && <meta itemProp="priceCurrency" content={currency} />}

        <div className="grid grid-cols-[auto_auto] gap-x-8 items-start w-fit">
          <div className="flex flex-col items-end text-xs leading-tight text-gray-600 whitespace-nowrap">
            {showPrev ? (
              <span className="line-through">{gross_price} €</span>
            ) : (
              <span className="opacity-0 select-none">—</span>
            )}
            {discountLines.length > 0 ? (
              <div className="text-right">
                {discountLines.map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              'font-bold text-left px-2 py-1 rounded text-[22px] flex items-center gap-2',
              is_promo ? 'text-red-500' : 'text-black'
            )}
          >
            <span {...(withSchemaOrg ? { itemProp: 'price' } : {})}>{price_discount}</span> €
            {count_promo > 0 && (
              <button
                type="button"
                onClick={onPromosClick}
                title="View all promotions"
                className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              >
                +{count_promo}
              </button>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
