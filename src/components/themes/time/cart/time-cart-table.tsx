'use client';

import { prefixImageUrl } from '@utils/image-versioning';
import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import cn from 'classnames';
import Image from 'next/image';
import { useCart } from '@contexts/cart/cart.context';
import type { Item } from '@contexts/cart/cart.utils';
import type { AddToCartInput } from '@utils/transform/cart';
import { getCartItemRenderKey } from '@components/cart/cart-item-key';
import UpdateCart from '@components/product/update-cart';
import { TimeCard } from '@/components/themes/time/account/time-account-primitives';
import { useTranslation } from 'src/app/i18n/client';
import { updateLineNote } from '@framework/cart/b2b-cart';
import { useModalAction } from '@components/common/modal/modal.context';
import { useCartSettings } from '@/hooks/use-cart-settings';

// Per-line note UI on the time-theme checkout is toggled per sales channel via
// the `cart_settings` data model (useCartSettings → showLineNote). Defaults off.

// Opens the cart-line item in the product preview modal. The popup itself
// re-fetches the full PIM product by sku, so we just hand it the cart item
// with `image` pre-shaped to an object so the placeholder during fetch
// isn't blank.
function useOpenCartItemPreview() {
  const { openModal } = useModalAction();
  return (item: any) => {
    const imgUrl = prefixImageUrl(item?.image, 'gallery_') ?? item?.image ?? '';
    const product = {
      ...item,
      image: imgUrl ? { thumbnail: imgUrl, original: imgUrl } : item?.image,
    };
    openModal('PRODUCT_VIEW', product);
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    n,
  );

const unitNet = (r: Item) =>
  Number(
    r.priceDiscount ??
      (r as any).__cartMeta?.price_discount ??
      (r as any).price_discount ??
      (r as any).price ??
      0,
  );

const unitGross = (r: Item) =>
  Number(
    r.priceGross ??
      (r as any).__cartMeta?.gross_price ??
      (r as any).price_gross ??
      (r as any).gross_price ??
      (r as any).price ??
      0,
  );

// ── icons ────────────────────────────────────────────────────────────────────

const s = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeWidth: 2,
};

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} strokeWidth={2.5}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const NoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

// ── cart row ─────────────────────────────────────────────────────────────────

function TimeCartRow({
  item,
  index,
  lang,
  showLineNote,
}: {
  item: Item;
  index: number;
  lang: string;
  showLineNote: boolean;
}) {
  const { clearItemFromCart, meta } = useCart();
  const openPreview = useOpenCartItemPreview();
  const { t } = useTranslation(lang, 'common');
  const net = unitNet(item);
  const gross = unitGross(item);
  const qty = Number(item.quantity ?? 0);
  const lineTotal = net * qty;
  const discount =
    gross > 0 && gross > net ? Math.round((1 - net / gross) * 100) : 0;
  const discountTiers =
    typeof (item as any).listing_type_discounts === 'string'
      ? ((item as any).listing_type_discounts as string).trim()
      : '';
  const discountLabel = discountTiers || (discount > 0 ? `-${discount}%` : '');
  // Promo code (e.g. "PET/25") distinguishes lines of the same SKU bought
  // under different promos. 0 / "0" means no promo.
  const promoCodeRaw = (item as any).promo_code;
  const promoCode =
    promoCodeRaw && promoCodeRaw !== 0 && String(promoCodeRaw) !== '0'
      ? String(promoCodeRaw)
      : '';
  const isAvailable = (item as any).stock !== 0;

  const [showNote, setShowNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.note || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNoteDraft(item.note || '');
  }, [item.note]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setNoteDraft(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateLineNote(item.rowId || item.id, value, meta as any);
      }, 500);
    },
    [item.rowId, item.id, meta],
  );

  const hasNote = !!(item.note || noteDraft);

  return (
    <>
      {/* Desktop row */}
      <div
        className={cn(
          'hidden md:grid grid-cols-[52px_1fr_auto_90px_70px_120px_90px_36px] gap-x-3 items-center py-3 border-b border-[var(--time-gray-100)] last:border-b-0',
          !isAvailable && 'opacity-50',
        )}
      >
        {/* Image — click to open preview */}
        <button
          type="button"
          onClick={() => openPreview(item)}
          aria-label={t('text-view-product', {
            defaultValue: 'Visualizza prodotto',
          })}
          className="w-[48px] h-[48px] rounded-[8px] bg-gradient-to-br from-[#f8f9fb] to-[#eef0f4] flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--time-red)]/40"
        >
          <Image
            src={
              prefixImageUrl(item?.image, 'gallery_') ??
              item?.image ??
              '/assets/placeholders/no-image.jpeg'
            }
            width={48}
            height={48}
            alt={item?.name || ''}
            className="h-full w-full object-cover"
          />
        </button>

        {/* Info: SKU + model + name stacked compactly */}
        <div className="min-w-0">
          {item.sku && (
            <span
              className="text-[11px] font-semibold text-[var(--time-red)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {item.sku}
            </span>
          )}
          {item.model && (
            <div className="text-[11px] font-semibold text-[var(--time-dark)] leading-tight">
              {t('text-model', { defaultValue: 'MODELLO:' })} {item.model}
            </div>
          )}
          <button
            type="button"
            onClick={() => openPreview(item)}
            className="block text-left text-[11px] text-[var(--time-gray-500)] leading-tight truncate w-full hover:text-[var(--time-red)] transition-colors"
            title={item.name || ''}
          >
            {item.name}
          </button>
          {!isAvailable && (
            <div className="inline-flex items-center gap-1 mt-0.5 text-red-500 text-[10px] font-semibold">
              <AlertIcon />{' '}
              {t('cart-item-unavailable', { defaultValue: 'Non disponibile' })}
            </div>
          )}

          {/* Note inline */}
          {showLineNote &&
            (showNote ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  onBlur={() => {
                    if (!noteDraft) setShowNote(false);
                  }}
                  autoFocus
                  placeholder={t('line-item-note-placeholder', {
                    defaultValue: 'Aggiungi una nota...',
                  })}
                  className="w-full max-w-[320px] h-6 rounded-md border border-[var(--time-gray-200)] px-2 text-[10px] text-[var(--time-dark)] outline-none focus:border-[var(--time-red)] focus:shadow-[0_0_0_2px_rgba(230,57,70,0.1)] transition-colors"
                />
              </div>
            ) : hasNote ? (
              <button
                onClick={() => setShowNote(true)}
                className="mt-1 flex items-center gap-1 text-[10px] text-[var(--time-red)] italic transition-colors"
              >
                <NoteIcon />
                <span className="truncate max-w-[280px]">{noteDraft}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowNote(true)}
                className="mt-1 flex items-center gap-1 text-[10px] text-[var(--time-gray-400)] hover:text-[var(--time-gray-600)] transition-colors"
              >
                <NoteIcon />
                <span>
                  + {t('line-item-note', { defaultValue: 'Aggiungi nota' })}
                </span>
              </button>
            ))}
        </div>

        {/* Details: UM / MV / CF in mini grid */}
        <div
          className="flex gap-px text-[10px] text-center shrink-0"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <div className="flex flex-col items-center w-[28px]">
            <span className="text-[8px] font-bold text-[var(--time-gray-400)]">
              {t('cart-col-um', { defaultValue: 'UM' })}
            </span>
            <span className="text-[var(--time-gray-600)]">
              {(item as any).uom || '—'}
            </span>
          </div>
          <div className="flex flex-col items-center w-[28px]">
            <span className="text-[8px] font-bold text-[var(--time-gray-400)]">
              {t('cart-col-mv', { defaultValue: 'MV' })}
            </span>
            <span className="text-[var(--time-gray-600)]">
              {(item as any).mvQty || '—'}
            </span>
          </div>
          <div className="flex flex-col items-center w-[28px]">
            <span className="text-[8px] font-bold text-[var(--time-gray-400)]">
              {t('cart-col-cf', { defaultValue: 'CF' })}
            </span>
            <span className="text-[var(--time-gray-600)]">
              {(item as any).cfQty || '—'}
            </span>
          </div>
        </div>

        {/* Unit price */}
        <div className="text-right tabular-nums">
          {gross > net && (
            <div className="text-[10px] text-[var(--time-gray-400)] line-through">
              {money(gross)}
            </div>
          )}
          <div className="text-[13px] font-bold text-[var(--time-dark)]">
            {money(net)}
          </div>
        </div>

        {/* Promo */}
        <div className="flex flex-col items-center gap-0.5">
          {discountLabel ? (
            <span
              className={cn(
                'text-[10px] font-bold text-white px-2 py-0.5 rounded-[5px] whitespace-nowrap',
                discount >= 40
                  ? 'bg-[var(--time-red)]'
                  : discount >= 25
                    ? 'bg-amber-500'
                    : 'bg-gray-500',
              )}
            >
              {discountLabel}
            </span>
          ) : (
            !promoCode && (
              <span className="text-[var(--time-gray-300)] text-[10px]">—</span>
            )
          )}
          {promoCode && (
            <span
              className="text-[9px] font-semibold text-[var(--time-gray-400)] font-mono uppercase tracking-wide whitespace-nowrap"
              title={promoCode}
            >
              {promoCode}
            </span>
          )}
        </div>

        {/* Quantity */}
        <div className="flex justify-center">
          <UpdateCart
            item={item}
            lang={lang}
            className="time-stepper time-stepper-color"
          />
        </div>

        {/* Line total */}
        <div className="text-right text-[14px] font-extrabold text-[var(--time-dark)] tabular-nums">
          {money(lineTotal)}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => clearItemFromCart(item)}
            title={t('text-remove', { defaultValue: 'Rimuovi' })}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--time-gray-400)] hover:text-[var(--time-red)] transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Mobile card */}
      <div className="md:hidden py-3 border-b border-[var(--time-gray-100)] last:border-b-0">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => openPreview(item)}
            aria-label={t('text-view-product', {
              defaultValue: 'Visualizza prodotto',
            })}
            className="w-[52px] h-[52px] shrink-0 rounded-[10px] bg-gradient-to-br from-[#f8f9fb] to-[#eef0f4] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--time-red)]/40"
          >
            <Image
              src={
                prefixImageUrl(item?.image, 'gallery_') ??
                item?.image ??
                '/assets/placeholders/no-image.jpeg'
              }
              width={52}
              height={52}
              alt={item?.name || ''}
              className="h-full w-full object-cover"
            />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {item.sku && (
                <span className="font-[var(--font-mono)] text-[10px] font-semibold text-[var(--time-red)] bg-[rgba(230,57,70,0.08)] px-1.5 py-0.5 rounded-[4px]">
                  {item.sku}
                </span>
              )}
              {discountLabel && (
                <span
                  className={cn(
                    'text-[10px] font-bold text-white px-1.5 py-0.5 rounded-[4px] whitespace-nowrap',
                    discount >= 40
                      ? 'bg-[var(--time-red)]'
                      : discount >= 25
                        ? 'bg-amber-500'
                        : 'bg-gray-500',
                  )}
                >
                  {discountLabel}
                </span>
              )}
              {promoCode && (
                <span
                  className="text-[9px] font-semibold text-[var(--time-gray-400)] font-mono uppercase tracking-wide whitespace-nowrap"
                  title={promoCode}
                >
                  {promoCode}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => openPreview(item)}
              className="block text-left text-[13px] font-semibold text-[var(--time-dark)] truncate w-full hover:text-[var(--time-red)] transition-colors"
              title={item.name || ''}
            >
              {item.name}
            </button>
            <div className="text-[11px] text-[var(--time-gray-400)] mt-0.5">
              {money(net)} × {qty} ={' '}
              <span className="font-bold text-[var(--time-dark)]">
                {money(lineTotal)}
              </span>
            </div>
          </div>
          <button
            onClick={() => clearItemFromCart(item)}
            className="self-start text-[var(--time-gray-400)] hover:text-[var(--time-red)] transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
        <div className="mt-2 pl-[64px]">
          <UpdateCart
            item={item}
            lang={lang}
            className="time-stepper time-stepper-color"
          />
        </div>
        {showLineNote && (
          <div className="mt-2 pl-[64px]">
            {showNote ? (
              <input
                type="text"
                value={noteDraft}
                onChange={(e) => handleNoteChange(e.target.value)}
                onBlur={() => {
                  if (!noteDraft) setShowNote(false);
                }}
                autoFocus
                placeholder={t('line-item-note-placeholder', {
                  defaultValue: 'Aggiungi una nota...',
                })}
                className="w-full h-7 rounded-md border border-[var(--time-gray-200)] px-2 text-[11px] text-[var(--time-dark)] outline-none focus:border-[var(--time-red)] transition-colors"
              />
            ) : hasNote ? (
              <button
                onClick={() => setShowNote(true)}
                className="flex items-center gap-1 text-[10px] text-[var(--time-red)] italic"
              >
                <NoteIcon />
                <span className="truncate max-w-[220px]">{noteDraft}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowNote(true)}
                className="flex items-center gap-1 text-[10px] text-[var(--time-gray-400)]"
              >
                <NoteIcon />
                <span>
                  + {t('line-item-note', { defaultValue: 'Aggiungi nota' })}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── main component ───────────────────────────────────────────────────────────

interface TimeCartTableProps {
  lang: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onContinue: () => void;
}

export default function TimeCartTable({
  lang,
  searchQuery,
  onSearchChange,
  onContinue,
}: TimeCartTableProps) {
  const { t } = useTranslation(lang, 'common');
  const { items, resetCart, meta } = useCart();
  const { settings: cartSettings } = useCartSettings();

  const baseRows = useMemo<Item[]>(() => items ?? [], [items]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return baseRows;
    const q = searchQuery.toLowerCase();
    return baseRows.filter(
      (r) =>
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.name ?? '').toLowerCase().includes(q) ||
        (r.model ?? '').toLowerCase().includes(q) ||
        (r.brand?.name ?? '').toLowerCase().includes(q),
    );
  }, [baseRows, searchQuery]);

  const unavailableItems = baseRows.filter((r) => (r as any).stock === 0);
  const availableCount = baseRows.length - unavailableItems.length;

  return (
    <div>
      {/* Title + clear */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-black text-[var(--time-dark)] font-[var(--font-display)] tracking-tight">
            {t('cart-summary-title', { defaultValue: 'Riepilogo Carrello' })}
          </h1>
          <p className="text-[13px] text-[var(--time-gray-500)] mt-1">
            {t('cart-summary-availability', {
              count: availableCount,
              total: baseRows.length,
              defaultValue: '{{count}} articoli disponibili · {{total}} totali',
            })}
          </p>
        </div>
        {baseRows.length > 0 && (
          <button
            onClick={() => resetCart()}
            className="h-9 px-3.5 rounded-lg border-[1.5px] border-[rgba(230,57,70,0.3)] bg-[rgba(230,57,70,0.04)] text-[var(--time-red)] text-[12px] font-semibold font-[var(--font-body)] hover:bg-[rgba(230,57,70,0.1)] transition-colors"
          >
            {t('cart-clear-cart', { defaultValue: 'Svuota carrello' })}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--time-gray-400)] flex">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder={t('text-search-cart', {
            defaultValue: 'Cerca nel carrello...',
          })}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-[42px] rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] pl-10 pr-4 text-[13px] font-[var(--font-body)] text-[var(--time-dark)] bg-white outline-none transition-colors focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]"
        />
      </div>

      {/* Cart card */}
      <TimeCard className="overflow-hidden">
        {/* Table header (desktop) */}
        <div className="hidden md:grid grid-cols-[52px_1fr_auto_90px_70px_120px_90px_36px] gap-x-3 px-5 py-2.5 bg-[var(--time-gray-50)] border-b border-[var(--time-gray-100)] text-[9px] font-bold text-[var(--time-gray-400)] uppercase tracking-[0.08em]">
          <span />
          <span>{t('orders-item', { defaultValue: 'Articolo' })}</span>
          <span className="w-[84px] text-center">
            {t('text-details', { defaultValue: 'Dettagli' })}
          </span>
          <span className="text-right">
            {t('orders-unit-price', { defaultValue: 'Prezzo Unit.' })}
          </span>
          <span className="text-center">
            {t('cart-col-promo', { defaultValue: 'Promo' })}
          </span>
          <span className="text-center">
            {t('text-quantity', { defaultValue: 'Quantità' })}
          </span>
          <span className="text-right">
            {t('orders-total', { defaultValue: 'Totale' })}
          </span>
          <span />
        </div>

        {/* Items */}
        <div className="px-5">
          {filteredRows.length === 0 ? (
            <div className="py-16 text-center text-[var(--time-gray-400)]">
              <div className="text-[40px] mb-3">🛒</div>
              <div className="text-[15px] font-semibold text-[var(--time-gray-600)]">
                {baseRows.length === 0
                  ? t('text-cart-empty', {
                      defaultValue: 'Il carrello è vuoto',
                    })
                  : t('cart-no-results', { defaultValue: 'Nessun risultato' })}
              </div>
              <div className="text-[12px] mt-1">
                {baseRows.length === 0
                  ? t('cart-empty-hint', {
                      defaultValue: 'Aggiungi prodotti dal catalogo',
                    })
                  : t('cart-no-results-hint', {
                      defaultValue: 'Prova con un altro termine di ricerca',
                    })}
              </div>
            </div>
          ) : (
            filteredRows.map((item, i) => (
              <TimeCartRow
                key={getCartItemRenderKey(item, i)}
                item={item}
                index={i}
                lang={lang}
                showLineNote={cartSettings.showLineNote}
              />
            ))
          )}
        </div>

        {/* Continue button */}
        {baseRows.length > 0 && (
          <div className="px-5 py-4 border-t border-[var(--time-gray-100)] flex justify-end">
            <button
              onClick={onContinue}
              className="h-11 px-7 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white text-[13px] font-bold font-[var(--font-body)] flex items-center gap-2 transition-colors hover:bg-[var(--time-red)]"
            >
              {t('cart-continue-order', { defaultValue: 'Continua Ordine' })}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </button>
          </div>
        )}
      </TimeCard>

      {/* Unavailable warning */}
      {unavailableItems.length > 0 && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-[13px] text-red-800">
          <AlertIcon />
          <span>
            <strong>
              {t('cart-summary-unavailable-count', {
                count: unavailableItems.length,
                defaultValue: '{{count}} articoli',
              })}
            </strong>{' '}
            {t('cart-summary-unavailable-rest', {
              count: unavailableItems.length,
              defaultValue:
                'non disponibili — non saranno inclusi nell’ordine.',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
