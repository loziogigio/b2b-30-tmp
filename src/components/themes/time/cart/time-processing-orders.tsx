'use client';

import { useEffect, useState } from 'react';
import cn from 'classnames';
import {
  useProcessingOrders,
  type ProcessingOrder,
} from '@/hooks/use-processing-orders';
import { formatAnomalyFlags, type ErpAnomaly } from '@/hooks/use-order-submit';
import { TimeCard } from '@/components/themes/time/account/time-account-primitives';
import { useTranslation } from 'src/app/i18n/client';

type TFn = (key: string, options?: Record<string, unknown>) => string;

const money = (n: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(n ?? 0);

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status?: string; t: TFn }) {
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 font-[var(--font-body)]">
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.3"
          />
          <path
            d="M12 2a10 10 0 019.95 9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {t('processing-status-processing', {
          defaultValue: 'In elaborazione...',
        })}
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--time-red)]/8 px-2.5 py-1 text-[11px] font-bold text-[var(--time-red)] font-[var(--font-body)]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {t('anomaly-title', { defaultValue: 'Anomalie riscontrate' })}
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 font-[var(--font-body)]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </svg>
        {t('order-status-completed', { defaultValue: 'Ordine completato' })}
      </span>
    );
  }
  return null;
}

// ── Single order row ────────────────────────────────────────────────────────

function TimeOrderRow({
  order,
  onRevert,
  onResubmit,
  t,
}: {
  order: ProcessingOrder;
  onRevert: (id: string) => void;
  onResubmit: (id: string) => void;
  t: TFn;
}) {
  const [expanded, setExpanded] = useState(false);
  const anomalies: ErpAnomaly[] = order.erp_data?.anomalies || [];
  const isFailed = order.processing_status === 'failed';

  return (
    <div className="border border-[var(--time-gray-100)] rounded-[var(--radius-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)] truncate">
              {t('processing-order-number', {
                number:
                  order.order_number || order.cart_number || order.order_id,
                defaultValue: 'Ordine #{{number}}',
              })}
            </div>
            <div className="text-[11px] text-[var(--time-gray-500)] mt-0.5 font-[var(--font-body)]">
              {fmtDate(order.submitted_at || order.created_at)}
              {order.order_total != null && (
                <span className="ml-2 font-bold text-[var(--time-dark)]">
                  {money(order.order_total)}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={order.processing_status} t={t} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isFailed && (
            <>
              <button
                onClick={() => onRevert(order.order_id)}
                className="h-8 px-3 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] text-[11px] font-bold text-[var(--time-gray-600)] hover:border-[var(--time-dark)] transition-colors font-[var(--font-body)]"
              >
                {t('processing-edit-order', {
                  defaultValue: 'Modifica ordine',
                })}
              </button>
              <button
                onClick={() => onResubmit(order.order_id)}
                className="h-8 px-3 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-[11px] font-bold text-white hover:bg-[var(--time-red)] transition-colors font-[var(--font-body)]"
              >
                {t('processing-resubmit', { defaultValue: 'Riinvia' })}
              </button>
            </>
          )}
          {isFailed && anomalies.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] text-[var(--time-gray-500)] hover:border-[var(--time-dark)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={cn('transition-transform', expanded && 'rotate-180')}
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {expanded && anomalies.length > 0 && (
        <div className="px-4 py-3 bg-[var(--time-red)]/4 border-t border-[var(--time-red)]/10">
          {order.processing_errors?.map((err, i) => (
            <p
              key={i}
              className="text-[11px] text-[var(--time-red)] mb-1 font-[var(--font-body)]"
            >
              {err}
            </p>
          ))}
          <table className="w-full text-[11px] font-[var(--font-body)] mt-2">
            <thead>
              <tr className="text-left text-[var(--time-gray-600)]">
                <th className="pb-1 pr-2 font-bold">
                  {t('orders-item', { defaultValue: 'Articolo' })}
                </th>
                <th className="pb-1 font-bold">
                  {t('anomaly-col-problem', { defaultValue: 'Problema' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--time-red)]/10">
              {anomalies.map((a: ErpAnomaly, i: number) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-[var(--time-red)]/8 text-[var(--time-red)] font-bold font-[var(--font-mono)]">
                      {t('processing-row', {
                        n: a.IdRiga,
                        defaultValue: 'Riga {{n}}',
                      })}
                    </span>
                  </td>
                  <td className="py-1.5 text-[var(--time-gray-600)]">
                    {formatAnomalyFlags(a)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TimeProcessingOrders({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const {
    orders,
    isLoading,
    hasProcessing,
    fetchProcessingOrders,
    revertToCart,
    resubmitOrder,
  } = useProcessingOrders();

  useEffect(() => {
    fetchProcessingOrders();
  }, [fetchProcessingOrders]);

  if (isLoading && orders.length === 0) {
    return (
      <div className="py-6 text-center text-[13px] text-[var(--time-gray-500)] font-[var(--font-body)]">
        {t('processing-loading', {
          defaultValue: 'Caricamento ordini in elaborazione...',
        })}
      </div>
    );
  }

  if (orders.length === 0) return null;

  return (
    <TimeCard className="overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--time-gray-100)] flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)]">
          {t('processing-title', { defaultValue: 'Ordini in elaborazione' })}
          {hasProcessing && (
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </h3>
        <button
          onClick={fetchProcessingOrders}
          disabled={isLoading}
          className="text-[11px] text-[var(--time-gray-500)] hover:text-[var(--time-dark)] font-[var(--font-body)] font-bold"
        >
          {t('text-refresh', { defaultValue: 'Aggiorna' })}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {orders.map((order) => (
          <TimeOrderRow
            key={order.order_id}
            order={order}
            onRevert={revertToCart}
            onResubmit={resubmitOrder}
            t={t}
          />
        ))}
      </div>
    </TimeCard>
  );
}
