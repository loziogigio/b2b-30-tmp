'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import cn from 'classnames';
import { cartImageUrl } from '@utils/image-versioning';
import { Item } from '@contexts/cart/cart.utils';
import { useCart } from '@contexts/cart/cart.context';
import PackagingGrid from '@components/product/packaging-grid';
import PriceAndPromo, { PriceSlice } from '@components/product/price-and-promo';
import AddToCart from '@components/product/add-to-cart';
import UpdateCart from '@components/product/update-cart';
import { updateLineNote } from '@framework/cart/b2b-cart';
import { useCartAnomalies } from '@/contexts/cart-anomalies.context';
import { useModalAction } from '@components/common/modal/modal.context';
import { fetchPimProductList } from '@framework/product/get-pim-product';
import { IoIosCloseCircle } from 'react-icons/io';
import { confirmAction } from '@utils/toast-confirm';

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
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth={2}
    className={className}
  >
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={className}
  >
    <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2.5}
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function useNoteState(item: Item) {
  const { meta } = useCart();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.note || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(item.note || '');
  }, [item.note]);

  const save = useCallback(() => {
    setSaving(true);
    updateLineNote(item.rowId || item.id, draft, meta as any);
    setTimeout(() => {
      setSaving(false);
      setOpen(false);
    }, 300);
  }, [item.rowId, item.id, draft, meta]);

  const hasNote = !!(item.note || draft);
  return { open, setOpen, draft, setDraft, save, saving, hasNote };
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
  idx,
  lang,
  formatCurrency,
}: {
  r: Item;
  idx: number;
  lang: string;
  formatCurrency: (n: number) => string;
}) {
  const { open, setOpen, draft, setDraft, save, saving, hasNote } =
    useNoteState(r);
  const { byEntityCode, byIdRiga } = useCartAnomalies();
  const { clearItemFromCart } = useCart();
  const { openModal } = useModalAction();
  const [loadingProduct, setLoadingProduct] = useState(false);

  const handleRemove = async () => {
    const ok = await confirmAction({
      message: `Rimuovere "${r?.name ?? r?.sku ?? 'articolo'}" dal carrello?`,
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      tone: 'danger',
    });
    if (ok) clearItemFromCart(r);
  };

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

  // Match anomalies to this row via entity_code (id) or rowId → IdRiga
  const rowAnomalies: string[] = (() => {
    const code = String(r.id ?? '');
    if (code && byEntityCode[code]) return byEntityCode[code];
    const rid = Number(r.rowId);
    if (!Number.isNaN(rid) && byIdRiga[rid]) return byIdRiga[rid];
    return [];
  })();
  const hasAnomaly = rowAnomalies.length > 0;

  const qty = Number(r.quantity ?? 0);
  const line = unitNet(r) * qty;
  const isPromo = !!(r?.promo_code && String(r.promo_code) !== '0');

  const netUnit = unitNet(r);
  const grossUnit = unitGross(r);
  const priceData: Partial<PriceSlice> = {
    net_price: netUnit,
    // Only expose a strike-through price when it actually differs from net.
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
    <tr
      className={cn(
        hasAnomaly
          ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500'
          : 'hover:bg-gray-50',
      )}
      title={hasAnomaly ? rowAnomalies.join(' • ') : undefined}
    >
      <td className="px-2 py-3 align-top">
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-semibold tabular-nums',
            hasAnomaly
              ? 'bg-red-200 text-red-800'
              : 'bg-gray-100 text-gray-600',
          )}
        >
          {idx + 1}
        </span>
      </td>

      <td className="px-2 py-3 align-top">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => openProductBySku(r.sku)}
            disabled={loadingProduct}
            className={cn(
              'relative h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand',
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
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openProductBySku(r.sku)}
              disabled={loadingProduct}
              className="text-xs font-semibold text-brand hover:underline focus:outline-none focus:underline"
              title={r.sku ?? undefined}
            >
              {r.sku}
            </button>
            <button
              type="button"
              onClick={() => openProductBySku(r.sku)}
              disabled={loadingProduct}
              className="block font-medium text-gray-900 hover:text-brand focus:outline-none focus:text-brand text-left w-full leading-snug whitespace-normal line-clamp-3"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              title={r.name ?? undefined}
            >
              {r.name}
            </button>
            {r.model && (
              <div
                className="text-[12px] text-gray-700 leading-snug whitespace-normal mt-0.5"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                <span className="font-semibold uppercase">Modello:</span>{' '}
                {r.model}
              </div>
            )}

            {/* Anomaly messages — shown under the product name when the server
                flagged this row */}
            {hasAnomaly && (
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-red-700">
                <svg
                  width="14"
                  height="14"
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

            {/* Note: inline under article info */}
            {open ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <NoteIcon className="shrink-0 text-blue-500" />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                  }}
                  autoFocus
                  placeholder="Aggiungi una nota..."
                  className="w-full max-w-[300px] h-7 rounded-md border border-gray-200 px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-colors"
                />
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  title="Salva nota"
                >
                  <CheckIcon />
                </button>
              </div>
            ) : hasNote ? (
              <button
                onClick={() => setOpen(true)}
                className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 transition-colors group"
              >
                <NoteIcon className="shrink-0" />
                <span className="truncate max-w-[260px] italic">{draft}</span>
                <PencilIcon className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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

      <td className="px-2 py-3 align-top">
        <div className="flex justify-center">
          <PackagingGrid options={r.packaging_options_all} />
        </div>
      </td>

      <td className="px-1.5 py-3 align-top text-center">
        {isPromo ? (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            {r.promo_code}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      <td className="px-1.5 py-3 align-top text-center">
        <div className="flex justify-center">
          <PriceAndPromo priceData={priceData} />
        </div>
      </td>

      <td className="px-1.5 py-3 align-top text-center">
        <div className="mx-auto w-full">
          <UpdateCart item={r} lang={''} className="w-full !h-9 cart-counter" />
        </div>
      </td>

      <td className="px-2 py-3 align-top text-right font-semibold whitespace-nowrap">
        {formatCurrency(line)}
      </td>

      <td className="px-1.5 py-3 align-top text-center">
        <button
          type="button"
          onClick={handleRemove}
          className="text-gray-300 transition hover:text-red-500"
          aria-label="remove-item"
          title="Rimuovi articolo"
        >
          <IoIosCloseCircle className="text-2xl" />
        </button>
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
        'hidden md:block rounded-md border border-gray-200 bg-white',
        className,
      )}
    >
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
          <tr className="[&>th]:px-2 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
            {sortBtn('rowId', 'N', 'w-10')}
            {/* Articoli column intentionally fixed (~50% narrower) so the
                title wraps to multiple lines instead of stretching the row */}
            <th className="w-[260px]">Articoli</th>
            <th className="w-32 lg:w-36 !text-center">Imballi</th>
            <th className="w-12 !text-center">Prom.</th>
            {sortBtn('priceDiscount', 'Prezzo Unitario', 'w-44 !text-center')}
            {sortBtn('quantity', 'Quantità', 'w-28 !text-center')}
            {sortBtn('lineTotal', 'Prezzo', 'w-24 !text-right')}
            <th className="w-10 !text-center">
              <span className="sr-only">Rimuovi</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((r, idx) => (
            <CartDesktopRow
              key={`${r.rowId ?? idx}-${r.id}-${(r as any).promo_code ?? 0}-${(r as any).promo_row ?? 0}`}
              r={r}
              idx={idx}
              lang={lang}
              formatCurrency={formatCurrency}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
