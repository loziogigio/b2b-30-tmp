'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { Item } from '@contexts/cart/cart.utils';
import { useCart } from '@contexts/cart/cart.context';
import PackagingGrid from '@components/product/packaging-grid';
import PriceAndPromo, { PriceSlice } from '@components/product/price-and-promo';
import AddToCart from '@components/product/add-to-cart';
import UpdateCart from '@components/product/update-cart';
import Link from 'next/link';
import { ROUTES } from '@utils/routes';
import { updateLineNote } from '@framework/cart/b2b-cart';

export type SortKey =
  | 'rowId'
  | 'sku'
  | 'name'
  | 'priceDiscount'
  | 'quantity'
  | 'lineTotal';

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
  lang?: string;
};

const NoteIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={2} className={className}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

function useNoteState(item: Item) {
  const { meta } = useCart();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.note || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDraft(item.note || ''); }, [item.note]);

  const onChange = useCallback((v: string) => {
    setDraft(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateLineNote(item.rowId || item.id, v, meta as any);
    }, 500);
  }, [item.rowId, item.id, meta]);

  const hasNote = !!(item.note || draft);
  return { open, setOpen, draft, onChange, hasNote };
}

const defaultCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    n,
  );

const unitNet = (r: Item) =>
  Number(r.__cartMeta?.price_discount ?? r.price_discount ?? r.price ?? 0);

const unitGross = (r: Item) =>
  Number(
    r.__cartMeta?.gross_price ?? r.price_gross ?? r.gross_price ?? r.price ?? 0,
  );

function CartDesktopRow({
  r,
  lang,
  formatCurrency,
}: {
  r: Item;
  lang: string;
  formatCurrency: (n: number) => string;
}) {
  const { open, setOpen, draft, onChange, hasNote } = useNoteState(r);

  const qty = Number(r.quantity ?? 0);
  const line = unitNet(r) * qty;
  const isPromo = !!(r?.promo_code && String(r.promo_code) !== '0');

  const priceData: Partial<PriceSlice> = {
    price_discount: Number(
      r?.price_discount ?? r?.price ?? r?.net_price ?? unitNet(r) ?? 0,
    ),
    gross_price:
      r?.gross_price != null
        ? Number(r.gross_price)
        : r?.price_gross != null
          ? Number(r.price_gross)
          : undefined,
    is_promo: isPromo,
    discount_description: r?.listing_type_discounts ?? '',
    count_promo: Number(
      r?.count_promo ??
        (Array.isArray(r?.promos) ? r.promos.length : 0) ??
        0,
    ),
  };

  const normalizedLang =
    (lang ?? 'it').trim().replace(/^\/+|\/+$|\s+/g, '') || 'it';
  const langPrefix = `/${normalizedLang}`;
  const rawLink =
    typeof (r as any)?.link === 'string' ? (r as any).link.trim() : '';
  const skuValue =
    typeof r.sku === 'string' && r.sku.trim() !== ''
      ? encodeURIComponent(r.sku.trim())
      : '';

  const toLangHref = (base: string) => {
    if (!base) return '';
    if (base.startsWith('http://') || base.startsWith('https://')) return base;
    if (base.startsWith(langPrefix)) return base;
    if (base.startsWith('/')) return `${langPrefix}${base}`;
    return `${langPrefix}/${base}`;
  };

  const productHref = rawLink
    ? toLangHref(rawLink)
    : skuValue
      ? `${langPrefix}${ROUTES.PRODUCT}?sku=${skuValue}`
      : langPrefix;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-3 text-gray-600">
        {(r as any).rowId ?? r.id}
      </td>

      <td className="px-3 py-3">
        <div className="flex items-start gap-3">
          <Link
            href={productHref}
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            title={r.name ?? r.sku ?? 'Product detail'}
          >
            {r.image ? (
              <Image src={r.image} alt={r.name ?? ''} fill className="object-cover" />
            ) : null}
            <span className="sr-only">Visit {r.name ?? r.sku ?? 'product'}</span>
          </Link>
          <div className="min-w-0">
            <Link
              href={productHref}
              className="text-xs font-semibold text-blue-600 hover:underline focus:outline-none focus:underline"
              title={r.sku ?? undefined}
            >
              {r.sku}
            </Link>
            <Link
              href={productHref}
              className="block truncate font-medium text-gray-900 hover:text-brand focus:outline-none focus:text-brand"
              title={r.name ?? undefined}
            >
              {r.name}
            </Link>
            <div className="truncate text-[12px] text-gray-700">
              {r.model ? <span className="font-semibold">MODELLO:</span> : null}{' '}
              {r.model || '-'}
            </div>

            {/* Note: inline under article info */}
            {open ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={() => { if (!draft) setOpen(false); }}
                  autoFocus
                  placeholder="Aggiungi una nota per questo articolo..."
                  className="w-full max-w-[360px] h-7 rounded-md border border-gray-200 px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-colors"
                />
              </div>
            ) : hasNote ? (
              <button
                onClick={() => setOpen(true)}
                className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 italic transition-colors"
              >
                <NoteIcon className="shrink-0" />
                <span className="truncate max-w-[300px]">{draft}</span>
              </button>
            ) : (
              <button
                onClick={() => setOpen(true)}
                className="mt-1 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                <NoteIcon className="shrink-0" />
                <span>+ Aggiungi nota</span>
              </button>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <PackagingGrid options={r.packaging_options_all} />
      </td>

      <td className="px-3 py-3 text-center">
        {isPromo ? (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            {r.promo_code}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-col">
          <PriceAndPromo priceData={priceData} />
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="mx-auto flex w-full max-w-[160px] items-center justify-center gap-1">
          <UpdateCart item={r} lang={''} />
        </div>
      </td>

      <td className="px-3 py-3 text-right font-semibold">
        {formatCurrency(line)}
      </td>
    </tr>
  );
}

export default function CartDesktopTable({
  rows,
  onInc,
  onDec,
  onRequestSort,
  sortKey,
  sortAsc,
  className,
  formatCurrency = defaultCurrency,
  lang = 'it',
}: Props) {
  const sortBtn = (key: SortKey, label: React.ReactNode, extraClass = '') => (
    <th
      className={cn('cursor-pointer select-none', extraClass)}
      onClick={() => onRequestSort?.(key)}
      role="button"
      aria-sort={
        sortKey === key ? (sortAsc ? 'ascending' : 'descending') : 'none'
      }
      title="Sort"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key ? (
          <span className="text-xs">{sortAsc ? '▲' : '▼'}</span>
        ) : null}
      </span>
    </th>
  );

  return (
    <div
      className={cn(
        'hidden md:block overflow-x-auto rounded-md border border-gray-200 bg-white',
        className,
      )}
    >
      <table className="min-w-[920px] w-full border-collapse text-sm">
        <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
          <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
            {sortBtn('rowId', 'N', 'w-14')}
            <th className="w-[340px]">Articoli</th>
            <th className="w-44 lg:w-56">Imballi</th>
            <th className="w-16 text-center">Prom.</th>
            {sortBtn('priceDiscount', 'Prezzo Unitario', 'w-40')}
            {sortBtn('quantity', 'Quantità', 'w-40 text-center')}
            {sortBtn('lineTotal', 'Prezzo', 'w-40 text-right')}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <CartDesktopRow
              key={String(r.id)}
              r={r}
              lang={lang}
              formatCurrency={formatCurrency}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
