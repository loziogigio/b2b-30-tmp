'use client';

import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
import { useOrderDetailsQuery } from '@framework/order/fetch-order';
import AddressCard from '@components/orders/address-card';
import OrderItemsTable from '@components/orders/order-items-table';
import { useTranslation } from 'src/app/i18n/client';
import {
  renderOrderPrintHtml,
  OrderExportSnapshot,
} from '@components/orders/export/order-export';

// ---- tiny helpers ---------------------------------------------------------
function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toDisplayDate(iso?: string, lang?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'it' ? 'it-IT' : undefined,
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
  } catch {
    return '—';
  }
}
function getStatusFromOrder(
  o: any,
):
  | 'pending'
  | 'processing'
  | 'at-local-facility'
  | 'out-for-delivery'
  | 'completed' {
  const raw = o?.order_status ?? o?.status ?? 'completed';
  switch (raw) {
    case 'order-pending':
    case 'pending':
      return 'pending';
    case 'order-processing':
    case 'processing':
      return 'processing';
    case 'order-at-local-facility':
    case 'at-local-facility':
      return 'at-local-facility';
    case 'order-out-for-delivery':
    case 'out-for-delivery':
      return 'out-for-delivery';
    default:
      return 'completed';
  }
}
// --------------------------------------------------------------------------

type Props = {
  lang: string;
  initialParams: {
    cause: string;
    doc_year: string;
    doc_number: string;
  };
};

export default function OrderDetailClient({ lang, initialParams }: Props) {
  const { t } = useTranslation(lang, 'common');
  const [isPrinting, setIsPrinting] = useState(false);

  const params = useMemo(() => {
    const { cause, doc_year, doc_number } = initialParams;
    if (!cause || !doc_year || !doc_number) return null;
    return { cause, doc_year, doc_number };
  }, [initialParams]);

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useOrderDetailsQuery(params as any);

  const handlePrint = useCallback(() => {
    if (!order || isPrinting) return;
    setIsPrinting(true);

    try {
      const orderNumber = `${initialParams.cause}/${initialParams.doc_number}/${initialParams.doc_year}`;
      const items = ((order as any).items ?? []).map((it: any) => ({
        sku: it.sku ?? '',
        name: it.name ?? '',
        image: it.image,
        unit: it.unit ?? '',
        price: Number(it.price ?? 0),
        ordered_in_quantity: Number(it.ordered_in_quantity ?? 0),
        delivered_in_quantity: Number(it.delivered_in_quantity ?? 0),
        delivered_in_price: Number(it.delivered_in_price ?? 0),
      }));

      const shippingAddress = (order as any).shipping_address ?? {};
      const snapshot: OrderExportSnapshot = {
        orderNumber,
        orderDate: toDisplayDate((order as any).created_at, lang),
        status:
          getStatusFromOrder(order) === 'completed'
            ? t('order-status-completed')
            : getStatusFromOrder(order) === 'out-for-delivery'
              ? t('order-status-out-for-delivery')
              : getStatusFromOrder(order) === 'at-local-facility'
                ? t('order-status-at-local-facility')
                : getStatusFromOrder(order) === 'processing'
                  ? t('order-status-processing')
                  : t('order-status-pending'),
        shippingAddress: {
          line1:
            shippingAddress.street_address ??
            shippingAddress.address ??
            shippingAddress.line1,
          city: shippingAddress.city,
          country: shippingAddress.country,
        },
        items,
        total: money((order as any).total),
        exportDateLabel: new Intl.DateTimeFormat('it-IT', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date()),
      };

      const html = renderOrderPrintHtml(snapshot, { includeImages: true });
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const popup = window.open(
        url,
        '_blank',
        'width=900,height=700,scrollbars=yes,resizable=yes',
      );

      if (!popup) {
        alert(
          'Impossibile aprire la finestra di stampa. Controlla il blocco popup.',
        );
        setIsPrinting(false);
        return;
      }

      let completed = false;
      let pollId: ReturnType<typeof setInterval> | null = null;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (completed) return;
        completed = true;
        if (pollId != null) clearInterval(pollId);
        if (fallbackTimer != null) clearTimeout(fallbackTimer);
        URL.revokeObjectURL(url);
        setIsPrinting(false);
      };

      pollId = setInterval(() => {
        if (popup.closed) cleanup();
      }, 500);

      fallbackTimer = setTimeout(() => {
        cleanup();
      }, 60000);
    } catch (err) {
      console.error('Print failed', err);
      alert('Errore durante la stampa.');
      setIsPrinting(false);
    }
  }, [order, isPrinting, initialParams, lang, t]);

  if (!params) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-red-600">
        {t('order-detail-missing-params')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        {t('order-detail-loading')}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-red-600">
        {(error as Error)?.message || t('order-detail-error')}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        {t('order-detail-not-found')}
      </div>
    );
  }

  const status = getStatusFromOrder(order);

  const statusLabel =
    status === 'completed'
      ? t('order-status-completed')
      : status === 'out-for-delivery'
        ? t('order-status-out-for-delivery')
        : status === 'at-local-facility'
          ? t('order-status-at-local-facility')
          : status === 'processing'
            ? t('order-status-processing')
            : t('order-status-pending');

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header badges */}
      <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {t('order-detail-status')}:&nbsp;
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {statusLabel}
          </span>
        </div>
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          {isPrinting ? t('order-printing') : t('order-print')}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 border-b px-6 py-4 md:grid-cols-3">
        <StatCard
          label={t('order-detail-number')}
          value={`${initialParams.cause}/${initialParams.doc_number}/${initialParams.doc_year}`}
        />
        <StatCard
          label={t('order-detail-date')}
          value={toDisplayDate((order as any).created_at, lang)}
        />
        <StatCard
          label={t('orders-total')}
          value={`€${money((order as any).total).toFixed(2)}`}
        />
      </div>

      {/* Shipping Address */}
      <div className="px-6 py-6">
        <AddressCard
          title={t('orders-shipping-address')}
          a={(order as any).shipping_address}
        />
      </div>

      {/* Items table with internal scroll */}
      <div className="px-6 pb-6">
        <OrderItemsTable
          items={(order as any).items ?? []}
          height={360}
          lang={lang}
        />
      </div>

      {/* Back link */}
      <div className="border-t px-6 py-4">
        <Link
          href={`/${lang}/account/orders`}
          className="text-sm text-teal-600 hover:underline"
        >
          ← {t('order-detail-back')}
        </Link>
      </div>
    </div>
  );
}

/* ---------- small bits ---------- */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
