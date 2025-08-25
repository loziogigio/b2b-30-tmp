'use client';

import React from 'react';
import cn from 'classnames';
import type { ErpPriceData } from '@utils/transform/erp-prices';

type Props = {
  name?: string;
  sku?: string;
  priceData: ErpPriceData;
  className?: string;
  currency?: string;           // default "EUR"
  withSchemaOrg?: boolean;     // default true
  onPromosClick?: () => void;  // optional handler when clicking +N promos
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

  const {
    discount_description,
    gross_price,
    is_promo,
    price_discount,
    count_promo = 0,
  } = priceData;

  const Wrapper: React.ElementType = 'div';

  return (
    <Wrapper
      className={cn('flex items-center justify-center px-3 py-1', className)}
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
        className="text-sm text-gray-800 text-left space-y-0.5"
        {...(withSchemaOrg
          ? { itemProp: 'offers', itemScope: true, itemType: 'https://schema.org/Offer' }
          : {})}
      >
        {withSchemaOrg && <meta itemProp="priceCurrency" content={currency} />}

        <div className="grid grid-cols-[auto_auto] gap-x-2 items-center w-fit text-sm text-gray-800">
          {/* Column 1: Original + discount text (only if promo info) */}
          {discount_description && (
            <div className="flex flex-col items-end text-xs leading-tight text-gray-600">
              {gross_price != null && <span className="line-through">{gross_price} €</span>}
              <span>{discount_description}</span>
            </div>
          )}

          {/* Column 2: Final price (+ promo count) */}
          <div
            className={cn(
              'font-bold text-left px-2 py-1 rounded text-[22px] flex items-center gap-2',
              is_promo ? 'text-red-500' : 'text-black'
            )}
          >
            <span {...(withSchemaOrg ? { itemProp: 'price' } : {})}>
              {price_discount}
            </span>{' '}
            €

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
