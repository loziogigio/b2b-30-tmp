'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { cartImageUrl } from '@utils/image-versioning';
import { Item } from '@contexts/cart/cart.utils';
import { useCart } from '@contexts/cart/cart.context';
import PriceAndPromo, { PriceSlice } from '@components/product/price-and-promo';
import PackagingGrid from '@components/product/packaging-grid';
import UpdateCart from '@components/product/update-cart';
import { updateLineNote } from '@framework/cart/b2b-cart';
import { useCartAnomalies } from '@/contexts/cart-anomalies.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { fetchPimProductList } from '@framework/product/get-pim-product';
import { IoIosCloseCircle } from 'react-icons/io';
import { confirmAction } from '@utils/toast-confirm';

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
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth={2}
    className="shrink-0"
  >
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
  const { meta, clearItemFromCart } = useCart();
  const { byEntityCode, byIdRiga } = useCartAnomalies();
  const { openModal } = useModalAction();

  const handleRemove = async () => {
    const ok = await confirmAction({
      message: `Rimuovere "${r?.name ?? r?.sku ?? 'articolo'}" dal carrello?`,
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      tone: 'danger',
    });
    if (ok) clearItemFromCart(r);
  };
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(r.note || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openProductBySku = async (sku?: string) => {
    if (!sku || loadingProduct) return;
    setLoadingProduct(true);
    try {
      const result = await fetchPimProductList({
        lang,
        filters: { sku: [sku] },
        rows: 1,
        group_variants: true,
      });
      const product = result?.items?.[0];
      if (!product) return;
      const variations = Array.isArray((product as any).variations)
        ? (product as any).variations
        : [];
      const variantCount = (product as any).variantCount ?? variations.length;
      const hasVariants =
        (variantCount && variantCount > 1) || variations.length > 1;
      if (hasVariants) {
        openModal('B2B_PRODUCT_VARIANTS_QUICK_VIEW', product);
      } else {
        const target =
          variations.length === 1
            ? { ...variations[0], variantCount: 1 }
            : product;
        openModal('PRODUCT_VIEW', target);
      }
    } finally {
      setLoadingProduct(false);
    }
  };

  const rowAnomalies: string[] = (() => {
    const code = String(r.id ?? '');
    if (code && byEntityCode[code]) return byEntityCode[code];
    const rid = Number(r.rowId);
    if (!Number.isNaN(rid) && byIdRiga[rid]) return byIdRiga[rid];
    return [];
  })();
  const hasAnomaly = rowAnomalies.length > 0;

  useEffect(() => {
    setNoteDraft(r.note || '');
  }, [r.note]);

  const handleNoteChange = useCallback(
    (v: string) => {
      setNoteDraft(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateLineNote(r.rowId || r.id, v, meta as any);
      }, 500);
    },
    [r.rowId, r.id, meta],
  );

  const hasNote = !!(r.note || noteDraft);

  const qty = Number(r.quantity ?? 0);
  const line = unitNet(r) * qty;
  const isPromo = !!(r?.promo_code && String(r.promo_code) !== '0');

  const netUnit = unitNet(r);
  const grossUnit = unitGross(r);
  const priceData: Partial<PriceSlice> = {
    net_price: netUnit,
    gross_price: grossUnit > netUnit ? grossUnit : undefined,
    is_promo: isPromo,
    discount_description:
      r?.listing_type_discounts ?? (r as any)?.listingTypeDiscounts ?? '',
    count_promo: Number(
      r?.count_promo ?? (Array.isArray(r?.promos) ? r.promos.length : 0) ?? 0,
    ),
  };
  const imageSrc = cartImageUrl(r.image);

  return (
    <div
      className={cn(
        'rounded-md border bg-white p-3',
        hasAnomaly ? 'border-red-400 bg-red-50' : 'border-gray-200',
      )}
      title={hasAnomaly ? rowAnomalies.join(' • ') : undefined}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => openProductBySku(r.sku)}
          disabled={loadingProduct}
          className={cn(
            'relative h-14 w-14 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand',
            loadingProduct && 'opacity-60',
          )}
          title={r.name ?? r.sku ?? 'Product detail'}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={r.name ?? ''}
              fill
              className="object-cover"
            />
          ) : null}
          <span className="sr-only">View {r.name ?? r.sku ?? 'product'}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => openProductBySku(r.sku)}
              disabled={loadingProduct}
              className="text-[11px] font-semibold text-brand hover:underline focus:outline-none focus:underline"
              title={r.sku ?? undefined}
            >
              {r.sku}
            </button>
            <span className="text-[11px] text-gray-500">
              N {r.rowId ?? r.id}
            </span>
          </div>

          <button
            type="button"
            onClick={() => openProductBySku(r.sku)}
            disabled={loadingProduct}
            className="truncate text-[13px] font-semibold text-gray-900 hover:text-brand focus:outline-none focus:text-brand text-left w-full"
            title={r.name ?? undefined}
          >
            {r.name}
          </button>

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

          {hasAnomaly && (
            <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-red-700">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="mt-0.5 shrink-0"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{rowAnomalies.join(' • ')}</span>
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
                onBlur={() => {
                  if (!noteDraft) setNoteOpen(false);
                }}
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
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-[12px] text-red-500"
              aria-label="remove-item"
            >
              <IoIosCloseCircle className="text-lg" />
              Rimuovi
            </button>
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
      {rows.map((r, idx) => (
        <CartMobileCard
          key={`${r.rowId ?? idx}-${r.id}-${(r as any).promo_code ?? 0}-${(r as any).promo_row ?? 0}`}
          r={r}
          lang={lang}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
}
