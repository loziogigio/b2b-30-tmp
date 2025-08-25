'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import cn from 'classnames';

// ---------- Placeholder row shape (match your API-ish) ----------
type Row = {
  rowId: string;
  sku: string;
  name: string;
  model?: string;
  shortDescription?: string;
  uom: string;
  mvQty?: number;  // MV (min vend)
  cfQty?: number;  // CF (case / conf)
  image?: string;
  isPromo?: boolean;
  priceGross: number;     // original
  priceDiscount: number;  // discounted
  quantity: number;
};

const PLACEHOLDER_ROWS: Row[] = [
  {
    rowId: '40',
    sku: '101380',
    name: "FRATTONE LISCIO 'U.S.A.' 12x28 M/GOMMA ANCORA 841",
    model: 'cm 12 x 28 - "U.S.A."',
    shortDescription: 'Frattone liscio con gomma.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 60,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 17.9,
    priceDiscount: 8.95,
    quantity: 1,
  },
  {
    rowId: '30',
    sku: '1018072',
    name: 'ROTELLA METRICA MT 30 N/ACCIAIO CUST.SIMILPEL- BELLOTA 50023/30',
    model: 'mt 30',
    shortDescription: 'In acciaio.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 6,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 58.95,
    priceDiscount: 29.47,
    quantity: 1,
  },
  {
    rowId: '20',
    sku: '035000',
    name: 'CHIODI TESTA RAGGIATA OTTON. PZ100 280044-K',
    model: 'pz 100 ottonati',
    shortDescription: 'Spessore 1,1 mm • Lunghezza 23 mm.',
    uom: 'BL',
    mvQty: 1,
    cfQty: 15,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 2.2818,
    priceDiscount: 1.1409,
    quantity: 1,
  },
  {
    rowId: '10',
    sku: '205106',
    name: 'SUPPORTO DUPLEX IN PLASTICA PER GHIERA ZIGRINATA',
    model: 'a snodo',
    shortDescription: 'In ABS cromato.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 1,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 5.6164,
    priceDiscount: 2.8082,
    quantity: 1,
  },
  {
    rowId: '11',
    sku: '205106',
    name: 'SUPPORTO DUPLEX IN PLASTICA PER GHIERA ZIGRINATA',
    model: 'a snodo',
    shortDescription: 'In ABS cromato.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 1,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 5.6164,
    priceDiscount: 2.8082,
    quantity: 1,
  },
  {
    rowId: '12',
    sku: '205106',
    name: 'SUPPORTO DUPLEX IN PLASTICA PER GHIERA ZIGRINATA',
    model: 'a snodo',
    shortDescription: 'In ABS cromato.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 1,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 5.6164,
    priceDiscount: 2.8082,
    quantity: 1,
  },  {
    rowId: '13',
    sku: '205106',
    name: 'SUPPORTO DUPLEX IN PLASTICA PER GHIERA ZIGRINATA',
    model: 'a snodo',
    shortDescription: 'In ABS cromato.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 1,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 5.6164,
    priceDiscount: 2.8082,
    quantity: 1,
  },  {
    rowId: '14',
    sku: '205106',
    name: 'SUPPORTO DUPLEX IN PLASTICA PER GHIERA ZIGRINATA',
    model: 'a snodo',
    shortDescription: 'In ABS cromato.',
    uom: 'PZ',
    mvQty: 1,
    cfQty: 1,
    image: 'https://via.placeholder.com/64x64?text=IMG',
    isPromo: true,
    priceGross: 5.6164,
    priceDiscount: 2.8082,
    quantity: 1,
  },
];

// ---------- Utilities ----------
const currency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

type SortKey = 'rowId' | 'sku' | 'name' | 'priceDiscount' | 'quantity' | 'lineTotal';

export default function CartTableB2B() {
  // state
  const [query, setQuery] = useState('');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rowId');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // filter + sort
  const rows = useMemo(() => {
    let list = [...PLACEHOLDER_ROWS];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.model ?? '').toLowerCase().includes(q),
      );
    }
    if (onlyPromo) list = list.filter((r) => r.isPromo);

    list.sort((a, b) => {
      const lineA = a.priceDiscount * a.quantity;
      const lineB = b.priceDiscount * b.quantity;
      const dir = sortAsc ? 1 : -1;
      switch (sortKey) {
        case 'rowId': return (Number(a.rowId) - Number(b.rowId)) * dir;
        case 'sku': return a.sku.localeCompare(b.sku) * dir;
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'priceDiscount': return (a.priceDiscount - b.priceDiscount) * dir;
        case 'quantity': return (a.quantity - b.quantity) * dir;
        case 'lineTotal': return (lineA - lineB) * dir;
        default: return 0;
      }
    });
    return list;
  }, [query, onlyPromo, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const net = rows.reduce((s, r) => s + r.priceDiscount * r.quantity, 0);
    const gross = rows.reduce((s, r) => s + r.priceGross * r.quantity, 0);
    const vat = net * 0.22;
    return { net, gross, vat, doc: net + vat };
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <section className="w-full">
      {/* Controls */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SKU / name / model…"
            className="h-10 w-full sm:w-80 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={onlyPromo}
              onChange={(e) => setOnlyPromo(e.target.checked)}
            />
            Promo only
          </label>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          <select
            className="h-10 rounded-md border border-gray-300 px-2"
            value={`${sortKey}:${sortAsc ? 'asc' : 'desc'}`}
            onChange={(e) => {
              const [k, dir] = e.target.value.split(':') as [SortKey, 'asc' | 'desc'];
              setSortKey(k);
              setSortAsc(dir === 'asc');
            }}
          >
            <option value="rowId:desc">Row (desc)</option>
            <option value="rowId:asc">Row (asc)</option>
            <option value="sku:asc">SKU (A→Z)</option>
            <option value="sku:desc">SKU (Z→A)</option>
            <option value="name:asc">Name (A→Z)</option>
            <option value="name:desc">Name (Z→A)</option>
            <option value="priceDiscount:desc">Unit Price (high→low)</option>
            <option value="priceDiscount:asc">Unit Price (low→high)</option>
            <option value="quantity:desc">Qty (high→low)</option>
            <option value="quantity:asc">Qty (low→high)</option>
            <option value="lineTotal:desc">Line Total (high→low)</option>
            <option value="lineTotal:asc">Line Total (low→high)</option>
          </select>
        </div>
      </div>

      {/* ===== Mobile cards (< md) ===== */}
      <div className="md:hidden space-y-2">
        {rows.map((r) => {
          const line = r.priceDiscount * r.quantity;
          return (
            <div
              key={r.rowId}
              className="rounded-md border border-gray-200 bg-white p-3"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100 shrink-0">
                  {r.image ? (
                    <Image src={r.image} alt={r.name} fill className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">{r.sku}</span>
                    <span className="text-[11px] text-gray-500">N {r.rowId}</span>
                  </div>
                  <div className="truncate text-[13px] font-semibold text-gray-900">{r.name}</div>
                  {r.model && (
                    <div className="text-[12px] text-gray-700">
                      <span className="font-semibold">MODELLO:</span> {r.model}
                    </div>
                  )}
                  {r.shortDescription && (
                    <div className="text-[12px] text-gray-600 line-clamp-2">
                      {r.shortDescription}
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500">UM</div>
                      <div className="text-[12px] font-semibold">{r.uom}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">MV</div>
                      <div className="text-[12px] font-semibold">{r.mvQty ?? '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">CF</div>
                      <div className="text-[12px] font-semibold">{r.cfQty ?? '-'}</div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      {r.isPromo && (
                        <span className="text-[12px] text-gray-500 line-through">
                          {currency(r.priceGross)}
                        </span>
                      )}
                      <span className={cn('text-[15px] font-semibold', r.isPromo ? 'text-red-600' : 'text-gray-900')}>
                        {currency(r.priceDiscount)}
                      </span>
                      {r.isPromo && (
                        <span className="text-[11px] text-gray-600">-50%</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50" aria-label="minus">–</button>
                      <input
                        className="h-8 w-14 rounded-md border border-gray-300 text-center text-sm"
                        value={r.quantity}
                        readOnly
                      />
                      <button className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50" aria-label="plus">+</button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <span className="text-[12px] text-gray-600">Totale</span>
                    <span className="text-[15px] font-semibold">{currency(line)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Desktop table (≥ md) ===== */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-[920px] w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
            <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-14 cursor-pointer" onClick={() => toggleSort('rowId')}>N</th>
              <th className="w-[340px]">Articoli</th>
              <th className="w-44 lg:w-56">Dettagli</th>
              <th className="w-16 text-center">Prom.</th>
              <th className="w-40 cursor-pointer" onClick={() => toggleSort('priceDiscount')}>Prezzo Unitario</th>
              <th className="w-40 text-center cursor-pointer" onClick={() => toggleSort('quantity')}>Quantità</th>
              <th className="w-40 text-right cursor-pointer" onClick={() => toggleSort('lineTotal')}>Prezzo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const line = r.priceDiscount * r.quantity;
              return (
                <tr key={r.rowId} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-gray-600">{r.rowId}</td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100">
                        {r.image ? (
                          <Image src={r.image} alt={r.name} fill className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-blue-600 font-semibold">{r.sku}</div>
                        <div className="truncate font-medium text-gray-900">{r.name}</div>
                        <div className="truncate text-[12px] text-gray-700">
                          {r.model ? <span className="font-semibold">MODELLO:</span> : null}{' '}
                          {r.model || '-'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* hide Dettagli text on md, show numbers; expand on lg */}
                  <td className="px-3 py-3">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <div className="text-[10px] text-gray-500">UM</div>
                        <div className="font-semibold">{r.uom}</div>
                      </div>
                      <div className="hidden md:block">
                        <div className="text-[10px] text-gray-500">MV</div>
                        <div className="font-semibold">{r.mvQty ?? '-'}</div>
                      </div>
                      <div className="hidden lg:block">
                        <div className="text-[10px] text-gray-500">CF</div>
                        <div className="font-semibold">{r.cfQty ?? '-'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    {r.isPromo ? (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        -50%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      {r.isPromo && (
                        <span className="text-xs text-gray-500 line-through">
                          {currency(r.priceGross)}
                        </span>
                      )}
                      <span className={cn('font-semibold', r.isPromo ? 'text-red-600' : 'text-gray-900')}>
                        {currency(r.priceDiscount)}
                      </span>
                      {r.isPromo && <span className="text-xs text-gray-600">-50%</span>}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="mx-auto flex w-full max-w-[160px] items-center justify-center gap-1">
                      <button className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50" aria-label="minus">–</button>
                      <input
                        className="h-8 w-16 rounded-md border border-gray-300 text-center text-sm"
                        value={r.quantity}
                        readOnly
                      />
                      <button className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50" aria-label="plus">+</button>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right font-semibold">{currency(line)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <div className="flex w-full max-w-md items-center justify-between">
          <span className="text-gray-600">Totale Lordo</span>
          <span>{currency(totals.gross)}</span>
        </div>
        <div className="flex w-full max-w-md items-center justify-between">
          <span className="text-gray-600">Totale Netto</span>
          <span className="font-semibold">{currency(totals.net)}</span>
        </div>
        <div className="flex w-full max-w-md items-center justify-between">
          <span className="text-gray-600">IVA (22%)</span>
          <span>{currency(totals.vat)}</span>
        </div>
        <div className="flex w-full max-w-md items-center justify-between border-t pt-2">
          <span className="text-gray-900 font-semibold">Totale Documento</span>
          <span className="text-gray-900 font-bold">{currency(totals.doc)}</span>
        </div>
      </div>
    </section>
  );
}