'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { Item } from '@contexts/cart/cart.utils';
import { useCart } from '@contexts/cart/cart.context';
import CartTotals from './cart-totals';
import CartMobileList from './cart-mobile-list';
import CartDesktopTable from './cart-desktop-table';

type SortKey = 'rowId' | 'sku' | 'name' | 'priceDiscount' | 'quantity' | 'lineTotal';

const currency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const unitNet = (r: Item) =>
  Number(r.priceDiscount ?? r.__cartMeta?.price_discount ?? r.price ?? 0);
const unitGross = (r: Item) =>
  Number(r.priceGross ?? r.__cartMeta?.gross_price ?? r.gross_price ?? r.price_gross ?? r.price ?? 0);

export default function CartTableB2B() {
  const { items, setItemQuantity } = useCart();

  const [query, setQuery] = useState('');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rowId');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const baseRows = useMemo<Item[]>(() => items ?? [], [items]);

  // filter + sort (works even if some fields are missing)
  const rows = useMemo(() => {
    let list = [...baseRows];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) =>
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.name ?? '').toLowerCase().includes(q) ||
        (r.model ?? '').toLowerCase().includes(q),
      );
    }

    if (onlyPromo) list = list.filter((r) => Boolean(r.isPromo ?? r.__cartMeta?.is_promo));

    list.sort((a, b) => {
      const lineA = unitNet(a) * Number(a.quantity ?? 0);
      const lineB = unitNet(b) * Number(b.quantity ?? 0);
      const dir = sortAsc ? 1 : -1;

      switch (sortKey) {
        case 'rowId':
          return ((Number(a.rowId ?? a.id) || 0) - (Number(b.rowId ?? b.id) || 0)) * dir;
        case 'sku':
          return (a.sku ?? '').localeCompare(b.sku ?? '') * dir;
        case 'name':
          return (a.name ?? '').localeCompare(b.name ?? '') * dir;
        case 'priceDiscount':
          return (unitNet(a) - unitNet(b)) * dir;
        case 'quantity':
          return (Number(a.quantity ?? 0) - Number(b.quantity ?? 0)) * dir;
        case 'lineTotal':
          return (lineA - lineB) * dir;
        default:
          return 0;
      }
    });

    return list;
  }, [baseRows, query, onlyPromo, sortKey, sortAsc]);

  // totals from ALL items (not affected by filters)
  const totals = useMemo(() => {
    const net = baseRows.reduce((s, r) => s + unitNet(r) * Number(r.quantity ?? 0), 0);
    const gross = baseRows.reduce((s, r) => s + unitGross(r) * Number(r.quantity ?? 0), 0);
    // NOTE: using a single 22% VAT for display; replace with per-row if needed
    const vat = net * 0.22;
    return { net, gross, vat, doc: net + vat };
  }, [baseRows]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const inc = (r: Item) => setItemQuantity(r, Number(r.quantity ?? 0) + 1);
  const dec = (r: Item) => setItemQuantity(r, Math.max(0, Number(r.quantity ?? 0) - 1));

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
      <CartMobileList rows={rows} onInc={inc} onDec={dec} />


      {/* ===== Desktop table (≥ md) ===== */}
      <CartDesktopTable
        rows={rows}
        onInc={(r) => inc(r)}
        onDec={(r) => dec(r)}
        onRequestSort={(k: SortKey) => toggleSort(k)}
        sortKey={sortKey}
        sortAsc={sortAsc}
      />

      {/* Totals */}
      <CartTotals totals={totals} />

    </section>
  );
}
