'use client';

import React from 'react';
import cn from 'classnames';

export type CartTotalsData = {
  gross: number;  // Totale Lordo
  net: number;    // Totale Netto
  vat: number;    // IVA
  doc: number;    // Totale Documento (net + vat)
  vatRate?: number; // optional, shown in the label (defaults to 22)
};

const currency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

type Props = {
  totals: CartTotalsData;
  className?: string;
};

export default function CartTotals({ totals, className }: Props) {
  const rate = totals.vatRate ?? 22;

  return (
    <div className={cn('mt-4 flex flex-col items-end gap-1 text-sm', className)}>
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="text-gray-600">Totale Lordo</span>
        <span>{currency(totals.gross)}</span>
      </div>
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="text-gray-600">Totale Netto</span>
        <span className="font-semibold">{currency(totals.net)}</span>
      </div>
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="text-gray-600">IVA ({rate}%)</span>
        <span>{currency(totals.vat)}</span>
      </div>
      <div className="flex w-full max-w-md items-center justify-between border-t pt-2">
        <span className="text-gray-900 font-semibold pr-2">Totale Documento</span>
        <span className="text-gray-900 font-bold">{currency(totals.doc)}</span>
      </div>
    </div>
  );
}
