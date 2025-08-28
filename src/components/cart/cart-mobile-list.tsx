'use client';

import React from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { Item } from '@contexts/cart/cart.utils';
import PriceAndPromo, { PriceSlice } from '@components/product/price-and-promo';
import PackagingGrid from '@components/product/packaging-grid';
import UpdateCart from '@components/product/update-cart';

const defaultCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const unitNet = (r: Item) =>
  Number(r.__cartMeta?.price_discount ?? r.price_discount ?? r.price ?? 0);

const unitGross = (r: Item) =>
  Number(r.__cartMeta?.gross_price ?? r.price_gross ?? r.gross_price ?? r.price ?? 0);

type Props = {
  rows: Item[];
  onInc?: (row: Item) => void;
  onDec?: (row: Item) => void;
  formatCurrency?: (n: number) => string;
  className?: string;
};

export default function CartMobileList({
  rows,
  onInc,
  onDec,
  formatCurrency = defaultCurrency,
  className,
}: Props) {
  return (
    <div className={cn('md:hidden space-y-2', className)}>
      {rows.map((r) => {


        const qty = Number(r.quantity ?? 0);
        const line = unitNet(r) * qty;
        const isPromo = !!(r?.promo_code && String(r.promo_code) !== '0');

        const priceData: Partial<PriceSlice> = {
          // final/net price
          price_discount: Number(
            r?.price_discount ?? r?.price ?? r?.net_price ?? unitNet(r) ?? 0
          ),

          // original/gross price (optional)
          gross_price:
            r?.gross_price != null
              ? Number(r.gross_price)
              : r?.price_gross != null
                ? Number(r.price_gross)
                : undefined,

          is_promo: isPromo,

          // human-readable discount text (optional)
          discount_description: r?.listing_type_discounts ?? '',

          // number of promos (optional)
          count_promo: Number(
            r?.count_promo ??
            (Array.isArray(r?.promos) ? r.promos.length : 0) ??
            0
          ),
        };

        return (
          <div key={String(r.id)} className="rounded-md border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100 shrink-0">
                {r.image ? <Image src={r.image} alt={r.name ?? ''} fill className="object-cover" /> : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-600">{r.sku}</span>
                  <span className="text-[11px] text-gray-500">N {r.rowId ?? r.id}</span>
                </div>

                <div className="truncate text-[13px] font-semibold text-gray-900">{r.name}</div>

                {r.model && (
                  <div className="text-[12px] text-gray-700">
                    <span className="font-semibold">MODELLO:</span> {r.model}
                  </div>
                )}

                {r.shortDescription && (
                  <div className="text-[12px] text-gray-600 line-clamp-2">{r.shortDescription}</div>
                )}


                <div className="mt-2 flex items-center justify-between">
                  <div className="flex flex-col">
                  <PackagingGrid options={r.packaging_options_all} /> 
                  </div>
                  <div className="flex items-center gap-1">
                  <PriceAndPromo priceData={priceData}/>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <UpdateCart  item={r} lang={''}  />
                </div>

                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="text-[12px] text-gray-600">Totale</span>
                  <span className="text-[15px] font-semibold">{formatCurrency(line)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
