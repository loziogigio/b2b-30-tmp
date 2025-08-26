'use client';

import React from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { Item } from '@contexts/cart/cart.utils';

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
        const isPromo = (r as any).isPromo ?? r.__cartMeta?.is_promo;

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

                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-gray-500">UM</div>
                    <div className="text-[12px] font-semibold">{r.uom ?? r.__cartMeta?.um ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">MV</div>
                    <div className="text-[12px] font-semibold">{(r as any).mvQty ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">CF</div>
                    <div className="text-[12px] font-semibold">{(r as any).cfQty ?? '-'}</div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex flex-col">
                    {isPromo && (
                      <span className="text-[12px] text-gray-500 line-through">
                        {formatCurrency(unitGross(r))}
                      </span>
                    )}
                    <span className={cn('text-[15px] font-semibold', isPromo ? 'text-red-600' : 'text-gray-900')}>
                      {formatCurrency(unitNet(r))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                      aria-label="minus"
                      onClick={() => onDec?.(r)}
                    >
                      –
                    </button>
                    <input
                      className="h-8 w-14 rounded-md border border-gray-300 text-center text-sm"
                      value={qty}
                      readOnly
                    />
                    <button
                      className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                      aria-label="plus"
                      onClick={() => onInc?.(r)}
                    >
                      +
                    </button>
                  </div>
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
