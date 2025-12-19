'use client';

import React, { useCallback, useMemo, useState } from 'react';
import cn from 'classnames';
import { useQueryClient } from '@tanstack/react-query';
import { Item } from '@contexts/cart/cart.utils';
import { useCart } from '@contexts/cart/cart.context';
import CartTotals from './cart-totals';
import CartMobileList from './cart-mobile-list';
import CartDesktopTable from './cart-desktop-table';
import {
  buildCartExportSnapshot,
  renderCartExcelHtml,
  renderCartPdfHtml,
} from './export/cart-export';
import { BsFiletypePdf, BsFiletypeXlsx } from 'react-icons/bs';
import { ImSpinner2 } from 'react-icons/im';
import { HiOutlineSave, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import { useTranslation } from 'src/app/i18n/client';
import { saveCart as saveCurrentCart } from '@framework/cart/saved-carts';

type SortKey =
  | 'rowId'
  | 'sku'
  | 'name'
  | 'priceDiscount'
  | 'quantity'
  | 'lineTotal';

const unitNet = (r: Item) =>
  Number(r.priceDiscount ?? r.__cartMeta?.price_discount ?? r.price ?? 0);
const unitGross = (r: Item) =>
  Number(
    r.priceGross ??
      r.__cartMeta?.gross_price ??
      r.gross_price ??
      r.price_gross ??
      r.price ??
      0,
  );

const SORT_LABELS: Record<SortKey, string> = {
  rowId: 'Row',
  sku: 'SKU',
  name: 'Name',
  priceDiscount: 'Unit net price',
  quantity: 'Quantity',
  lineTotal: 'Line total',
};

export default function CartTableB2B({ lang = 'it' }: { lang?: string }) {
  const { t } = useTranslation(lang, 'common');
  const { items, setItemQuantity, resetCart, meta } = useCart();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rowId');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const baseRows = useMemo<Item[]>(() => items ?? [], [items]);

  const rows = useMemo(() => {
    let list = [...baseRows];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          (r.sku ?? '').toLowerCase().includes(q) ||
          (r.name ?? '').toLowerCase().includes(q) ||
          (r.model ?? '').toLowerCase().includes(q),
      );
    }

    if (onlyPromo) list = list.filter((r) => Boolean(r.isPromo));

    list.sort((a, b) => {
      const lineA = unitNet(a) * Number(a.quantity ?? 0);
      const lineB = unitNet(b) * Number(b.quantity ?? 0);
      const dir = sortAsc ? 1 : -1;

      switch (sortKey) {
        case 'rowId':
          return (
            ((Number(a.rowId ?? a.id) || 0) - (Number(b.rowId ?? b.id) || 0)) *
            dir
          );
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

  const totals = useMemo(() => {
    const net = baseRows.reduce(
      (s, r) => s + unitNet(r) * Number(r.quantity ?? 0),
      0,
    );
    const gross = baseRows.reduce(
      (s, r) => s + unitGross(r) * Number(r.quantity ?? 0),
      0,
    );
    const vat = net * 0.22; // demo VAT
    return { net, gross, vat, doc: net + vat };
  }, [baseRows]);

  const filtersSummary = useMemo(() => {
    const parts: string[] = [];
    const trimmed = query.trim();
    if (trimmed) parts.push(`Search "${trimmed}"`);
    if (onlyPromo) parts.push('Promo only');
    return parts.length ? `${parts.join(' | ')} (UI view)` : 'None';
  }, [query, onlyPromo]);

  const filtersDiffer = rows.length !== baseRows.length;
  const sortLabel = `${SORT_LABELS[sortKey]} (${sortAsc ? 'asc' : 'desc'})`;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const inc = (r: Item) => setItemQuantity(r, Number(r.quantity ?? 0) + 1);
  const dec = (r: Item) =>
    setItemQuantity(r, Math.max(0, Number(r.quantity ?? 0) - 1));

  const handleDeleteCart = async () => {
    if (!resetCart) return;
    if (!confirm(t('text-confirm-delete-cart'))) return;
    setIsDeleting(true);
    try {
      const idCart = (meta as any)?.idCart ?? (meta as any)?.id_cart;
      await resetCart(idCart);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCart = useCallback(async () => {
    const trimmed = saveLabel.trim();
    if (!trimmed) {
      setSaveError(t('text-saved-cart-name-required'));
      return;
    }

    const cartId = (meta as any)?.idCart ?? (meta as any)?.id_cart;
    if (!cartId) {
      setSaveError(t('text-saved-cart-no-active'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveCurrentCart({ cartId, label: trimmed });
      setSaveLabel('');
      setShowSaveForm(false);
      // Refresh the saved carts list in the sidebar
      await queryClient.invalidateQueries({ queryKey: ['saved-carts'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [saveLabel, meta, t, queryClient]);

  const handleExportPdf = useCallback(() => {
    if (typeof window === 'undefined') return;
    const snapshot = buildCartExportSnapshot({
      items: baseRows,
      meta,
      totals: { net: totals.net, gross: totals.gross, vat: totals.vat },
      filteredDiffers: filtersDiffer,
      filtersSummary,
      sortLabel,
    });

    if (!snapshot) {
      alert(t('text-cart-empty'));
      return;
    }

    setIsExportingPdf(true);

    try {
      const html = renderCartPdfHtml(snapshot, { includeImages: true });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const popup = window.open(url, '_blank');

      if (!popup) {
        URL.revokeObjectURL(url);
        alert(t('text-enable-popups'));
        setIsExportingPdf(false);
        return;
      }

      let pollId: number | undefined;
      let fallbackTimer: number | undefined;
      let completed = false;

      const waitForImagesToSettle = () => {
        try {
          const doc = popup.document;
          if (!doc) return Promise.resolve();
          const images = Array.from(doc.images ?? []);
          if (!images.length) return Promise.resolve();
          const pending = images.filter((img) => !img.complete);
          if (!pending.length) return Promise.resolve();
          return new Promise<void>((resolve) => {
            let remaining = pending.length;
            const timer = window.setTimeout(() => resolve(), 4000);
            const settle = () => {
              remaining -= 1;
              if (remaining <= 0) {
                window.clearTimeout(timer);
                resolve();
              }
            };
            pending.forEach((img) => {
              const onDone = () => {
                img.removeEventListener('load', onDone);
                img.removeEventListener('error', onDone);
                settle();
              };
              img.addEventListener('load', onDone, { once: true });
              img.addEventListener('error', onDone, { once: true });
            });
          });
        } catch {
          return Promise.resolve();
        }
      };

      const cleanup = () => {
        if (completed) return;
        completed = true;
        if (pollId != null) window.clearInterval(pollId);
        if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
        popup.removeEventListener('load', onLoad);
        URL.revokeObjectURL(url);
        setIsExportingPdf(false);
      };

      const triggerPrint = () => {
        if (completed) return;
        waitForImagesToSettle()
          .catch(() => null)
          .finally(() => {
            if (completed) return;
            try {
              popup.focus();
              popup.print();
            } catch (err) {
              console.error('Print failed', err);
            } finally {
              cleanup();
            }
          });
      };

      const onLoad = () => {
        triggerPrint();
      };

      popup.addEventListener('load', onLoad);

      pollId = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
        } else if (popup.document?.readyState === 'complete') {
          triggerPrint();
        }
      }, 400);

      fallbackTimer = window.setTimeout(() => {
        if (!popup.closed) triggerPrint();
        else cleanup();
      }, 8000);
    } catch (error) {
      console.error('Failed to export cart PDF', error);
      alert('Unable to generate cart PDF.');
      setIsExportingPdf(false);
    }
  }, [baseRows, filtersDiffer, filtersSummary, meta, sortLabel, totals]);

  const handleExportExcel = useCallback(() => {
    if (typeof window === 'undefined') return;
    const snapshot = buildCartExportSnapshot({
      items: baseRows,
      meta,
      totals: { net: totals.net, gross: totals.gross, vat: totals.vat },
      filteredDiffers: filtersDiffer,
      filtersSummary,
      sortLabel,
    });

    if (!snapshot) {
      alert(t('text-cart-empty'));
      return;
    }

    setIsExportingExcel(true);

    let url: string | null = null;

    try {
      const html = renderCartExcelHtml(snapshot);
      const blob = new Blob([html], {
        type: 'application/vnd.ms-excel;charset=utf-8;',
      });
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cart-${snapshot.filenameStamp}.xls`;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export cart Excel', error);
      alert(t('text-cart-empty'));
    } finally {
      if (url) URL.revokeObjectURL(url);
      setIsExportingExcel(false);
    }
  }, [baseRows, filtersDiffer, filtersSummary, meta, sortLabel, totals, t]);

  return (
    <section className="w-full">
      {/* Controls */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('text-search-sku-name-model')}
            className="h-10 w-full sm:w-80 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={onlyPromo}
              onChange={(e) => setOnlyPromo(e.target.checked)}
            />
            {t('text-promo-only')}
          </label>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{t('text-sort-by')}:</span>
          <select
            className="h-10 rounded-md border border-gray-300 px-2"
            value={`${sortKey}:${sortAsc ? 'asc' : 'desc'}`}
            onChange={(e) => {
              const [k, dir] = e.target.value.split(':') as [
                SortKey,
                'asc' | 'desc',
              ];
              setSortKey(k);
              setSortAsc(dir === 'asc');
            }}
          >
            <option value="rowId:desc">{t('text-row-desc')}</option>
            <option value="rowId:asc">{t('text-row-asc')}</option>
            <option value="sku:asc">{t('text-sku-az')}</option>
            <option value="sku:desc">{t('text-sku-za')}</option>
            <option value="name:asc">{t('text-name-az')}</option>
            <option value="name:desc">{t('text-name-za')}</option>
            <option value="priceDiscount:desc">
              {t('text-unit-price-high-low')}
            </option>
            <option value="priceDiscount:asc">
              {t('text-unit-price-low-high')}
            </option>
            <option value="quantity:desc">{t('text-qty-high-low')}</option>
            <option value="quantity:asc">{t('text-qty-low-high')}</option>
            <option value="lineTotal:desc">
              {t('text-line-total-high-low')}
            </option>
            <option value="lineTotal:asc">
              {t('text-line-total-low-high')}
            </option>
          </select>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf || !baseRows.length}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50',
              (isExportingPdf || !baseRows.length) &&
                'cursor-not-allowed opacity-60',
            )}
            title="Export cart as PDF"
          >
            {isExportingPdf ? (
              <ImSpinner2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <BsFiletypePdf
                className="h-5 w-5 text-red-600"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel || !baseRows.length}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50',
              (isExportingExcel || !baseRows.length) &&
                'cursor-not-allowed opacity-60',
            )}
            title="Export cart as Excel"
          >
            {isExportingExcel ? (
              <ImSpinner2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <BsFiletypeXlsx
                className="h-5 w-5 text-emerald-600"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">Export Excel</span>
          </button>

          {/* Save cart button/form */}
          {showSaveForm ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveCart();
                  } else if (e.key === 'Escape') {
                    setShowSaveForm(false);
                    setSaveLabel('');
                    setSaveError(null);
                  }
                }}
                placeholder={t('text-saved-cart-name-placeholder', {
                  defaultValue: 'Nome carrello...',
                })}
                className="h-10 w-36 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={handleSaveCart}
                disabled={isSaving}
                className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                title={t('text-save', { defaultValue: 'Salva' })}
              >
                {isSaving ? (
                  <ImSpinner2 className="h-4 w-4 animate-spin" />
                ) : (
                  <HiOutlineCheck className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaveForm(false);
                  setSaveLabel('');
                  setSaveError(null);
                }}
                disabled={isSaving}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                title={t('text-cancel', { defaultValue: 'Annulla' })}
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              disabled={!baseRows.length}
              className={cn(
                'flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium border whitespace-nowrap',
                !baseRows.length
                  ? 'opacity-60 cursor-not-allowed border-gray-300 text-gray-400'
                  : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50',
              )}
              title={t('text-save-for-later', {
                defaultValue: 'Salva per dopo',
              })}
            >
              <HiOutlineSave className="h-4 w-4" />
              {t('text-save-for-later', {
                defaultValue: 'Salva per dopo',
              })}
            </button>
          )}

          {/* Delete cart button */}
          <button
            type="button"
            onClick={handleDeleteCart}
            disabled={isDeleting}
            className={cn(
              'h-10 rounded-md px-3 font-semibold border',
              isDeleting
                ? 'opacity-60 cursor-not-allowed'
                : 'border-red-600 text-red-600 hover:bg-red-50',
            )}
            title={t('text-delete-cart')}
          >
            {isDeleting ? t('text-deleting') : t('text-delete-cart')}
          </button>
        </div>

        {/* Save error display */}
        {saveError && (
          <div className="mt-2 text-sm text-red-600">{saveError}</div>
        )}
      </div>

      {/* ===== Mobile cards (< md) ===== */}
      <CartMobileList rows={rows} onInc={inc} onDec={dec} lang={lang} />

      {/* ===== Desktop table (≥ md) ===== */}
      <CartDesktopTable
        rows={rows}
        onInc={(r) => inc(r)}
        onDec={(r) => dec(r)}
        onRequestSort={(k: SortKey) => toggleSort(k)}
        sortKey={sortKey}
        sortAsc={sortAsc}
        lang={lang}
      />

      {/* Totals */}
      <CartTotals totals={totals} />
    </section>
  );
}
