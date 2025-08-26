'use client';

import React from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { Item } from '@contexts/cart/cart.utils';

export type SortKey = 'rowId' | 'sku' | 'name' | 'priceDiscount' | 'quantity' | 'lineTotal';

type Props = {
  rows: Item[];
  onInc?: (row: Item) => void;
  onDec?: (row: Item) => void;
  /** Ask parent to change sort */
  onRequestSort?: (key: SortKey) => void;
  /** Visual sort state */
  sortKey?: SortKey;
  sortAsc?: boolean;
  className?: string;
  formatCurrency?: (n: number) => string;
};

const defaultCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const unitNet = (r: Item) =>
  Number(r.__cartMeta?.price_discount ?? r.price_discount ?? r.price ?? 0);

const unitGross = (r: Item) =>
  Number(r.__cartMeta?.gross_price ?? r.price_gross ?? r.gross_price ?? r.price ?? 0);

export default function CartDesktopTable({
  rows,
  onInc,
  onDec,
  onRequestSort,
  sortKey,
  sortAsc,
  className,
  formatCurrency = defaultCurrency,
}: Props) {
  const sortBtn = (key: SortKey, label: React.ReactNode, extraClass = '') => (
    <th
      className={cn('cursor-pointer select-none', extraClass)}
      onClick={() => onRequestSort?.(key)}
      role="button"
      aria-sort={sortKey === key ? (sortAsc ? 'ascending' : 'descending') : 'none'}
      title="Sort"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key ? <span className="text-xs">{sortAsc ? '▲' : '▼'}</span> : null}
      </span>
    </th>
  );

  return (
    <div className={cn('hidden md:block overflow-x-auto rounded-md border border-gray-200 bg-white', className)}>
      <table className="min-w-[920px] w-full border-collapse text-sm">
        <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
          <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
            {sortBtn('rowId', 'N', 'w-14')}
            <th className="w-[340px]">Articoli</th>
            <th className="w-44 lg:w-56">Dettagli</th>
            <th className="w-16 text-center">Prom.</th>
            {sortBtn('priceDiscount', 'Prezzo Unitario', 'w-40')}
            {sortBtn('quantity', 'Quantità', 'w-40 text-center')}
            {sortBtn('lineTotal', 'Prezzo', 'w-40 text-right')}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const qty = Number(r.quantity ?? 0);
            const line = unitNet(r) * qty;
            const promo = Boolean((r as any).isPromo ?? r.__cartMeta?.is_promo);

            return (
              <tr key={String(r.id)} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-gray-600">{(r as any).rowId ?? r.id}</td>

                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100">
                      {r.image ? <Image src={r.image} alt={r.name ?? ''} fill className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-blue-600 font-semibold">{r.sku}</div>
                      <div className="truncate font-medium text-gray-900">{r.name}</div>
                      <div className="truncate text-[12px] text-gray-700">
                        {r.model ? <span className="font-semibold">MODELLO:</span> : null} {r.model || '-'}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500">UM</div>
                      <div className="font-semibold">{(r as any).uom ?? r.__cartMeta?.um ?? '-'}</div>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-[10px] text-gray-500">MV</div>
                      <div className="font-semibold">{(r as any).mvQty ?? '-'}</div>
                    </div>
                    <div className="hidden lg:block">
                      <div className="text-[10px] text-gray-500">CF</div>
                      <div className="font-semibold">{(r as any).cfQty ?? '-'}</div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3 text-center">
                  {promo ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">-</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-col">
                    {promo && <span className="text-xs text-gray-500 line-through">{formatCurrency(unitGross(r))}</span>}
                    <span className={cn('font-semibold', promo ? 'text-red-600' : 'text-gray-900')}>
                      {formatCurrency(unitNet(r))}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div className="mx-auto flex w-full max-w-[160px] items-center justify-center gap-1">
                    <button
                      className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                      aria-label="minus"
                      onClick={() => onDec?.(r)}
                    >
                      –
                    </button>
                    <input
                      className="h-8 w-16 rounded-md border border-gray-300 text-center text-sm"
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
                </td>

                <td className="px-3 py-3 text-right font-semibold">{formatCurrency(line)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
