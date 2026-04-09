'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import cn from 'classnames';
import Link from 'next/link';
import { Item } from '@contexts/cart/cart.utils';
import { useCart } from '@contexts/cart/cart.context';
import PriceAndPromo, { PriceSlice } from '@components/product/price-and-promo';
import PackagingGrid from '@components/product/packaging-grid';
import UpdateCart from '@components/product/update-cart';
import { ROUTES } from '@utils/routes';
import { updateLineNote } from '@framework/cart/b2b-cart';

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

type Props = {
  rows: Item[];
  onInc?: (row: Item) => void;
  onDec?: (row: Item) => void;
  formatCurrency?: (n: number) => string;
  className?: string;
  lang?: string;
};

const NoteIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={2} className="shrink-0">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

function CartMobileCard({
  r,
  lang,
  formatCurrency,
}: {
  r: Item;
  lang: string;
  formatCurrency: (n: number) => string;
}) {
  const { meta } = useCart();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(r.note || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setNoteDraft(r.note || ''); }, [r.note]);

  const handleNoteChange = useCallback((v: string) => {
    setNoteDraft(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateLineNote(r.rowId || r.id, v, meta as any);
    }, 500);
  }, [r.rowId, r.id, meta]);

  const hasNote = !!(r.note || noteDraft);

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
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <Link
          href={productHref}
          className="relative h-14 w-14 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand"
          title={r.name ?? r.sku ?? 'Product detail'}
        >
          {r.image ? (
            <Image src={r.image} alt={r.name ?? ''} fill className="object-cover" />
          ) : null}
          <span className="sr-only">Visit {r.name ?? r.sku ?? 'product'}</span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <Link
              href={productHref}
              className="text-[11px] font-semibold text-blue-600 hover:underline focus:outline-none focus:underline"
              title={r.sku ?? undefined}
            >
              {r.sku}
            </Link>
            <span className="text-[11px] text-gray-500">
              N {r.rowId ?? r.id}
            </span>
          </div>

          <Link
            href={productHref}
            className="truncate text-[13px] font-semibold text-gray-900 hover:text-brand focus:outline-none focus:text-brand text-left w-full"
            title={r.name ?? undefined}
          >
            {r.name}
          </Link>

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

          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-col">
              <PackagingGrid options={r.packaging_options_all} />
            </div>
            <div className="flex items-center gap-1">
              <PriceAndPromo priceData={priceData} />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <UpdateCart item={r} lang={''} />
          </div>

          {/* Note inline */}
          <div className="mt-2">
            {noteOpen ? (
              <input
                type="text"
                value={noteDraft}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={() => { if (!noteDraft) setNoteOpen(false); }}
                autoFocus
                placeholder="Aggiungi una nota..."
                className="w-full h-7 rounded-md border border-gray-200 px-2 text-[11px] text-gray-600 outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-colors"
              />
            ) : hasNote ? (
              <button
                onClick={() => setNoteOpen(true)}
                className="flex items-center gap-1 text-[11px] text-blue-600 italic"
              >
                <NoteIcon />
                <span className="truncate max-w-[240px]">{noteDraft}</span>
              </button>
            ) : (
              <button
                onClick={() => setNoteOpen(true)}
                className="flex items-center gap-1 text-[11px] text-gray-400"
              >
                <NoteIcon />
                <span>+ Aggiungi nota</span>
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <span className="text-[12px] text-gray-600">Totale</span>
            <span className="text-[15px] font-semibold">
              {formatCurrency(line)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartMobileList({
  rows,
  onInc,
  onDec,
  formatCurrency = defaultCurrency,
  className,
  lang = 'it',
}: Props) {
  return (
    <div className={cn('md:hidden space-y-2', className)}>
      {rows.map((r) => (
        <CartMobileCard
          key={String(r.id)}
          r={r}
          lang={lang}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
}
