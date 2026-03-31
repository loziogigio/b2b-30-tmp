'use client';

import { useEffect, useState } from 'react';
import cn from 'classnames';
import {
  useProcessingOrders,
  type ProcessingOrder,
} from '@/hooks/use-processing-orders';
import { formatAnomalyFlags, type ErpAnomaly } from '@/hooks/use-order-submit';

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

function StatusBadge({ status }: { status?: string }) {
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
          <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        In elaborazione...
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Anomalie riscontrate
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </svg>
        Ordine completato
      </span>
    );
  }
  return null;
}

// ── Single order row ────────────────────────────────────────────────────────

function OrderRow({
  order,
  onRevert,
  onResubmit,
}: {
  order: ProcessingOrder;
  onRevert: (id: string) => void;
  onResubmit: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const anomalies: ErpAnomaly[] = order.erp_data?.anomalies || [];
  const isFailed = order.processing_status === 'failed';
  const isProcessing = order.processing_status === 'processing';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Main row */}
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              Ordine #{order.order_number || order.cart_number || order.order_id}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {fmtDate(order.submitted_at || order.created_at)}
              {order.order_total != null && (
                <span className="ml-2 font-medium text-gray-700">
                  {money(order.order_total)}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={order.processing_status} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isFailed && (
            <>
              <button
                onClick={() => onRevert(order.order_id)}
                className="h-8 px-3 rounded-md border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Modifica ordine
              </button>
              <button
                onClick={() => onResubmit(order.order_id)}
                className="h-8 px-3 rounded-md bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                Riinvia
              </button>
            </>
          )}
          {isFailed && anomalies.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
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

      {/* Expanded anomaly details */}
      {expanded && anomalies.length > 0 && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100">
          {order.processing_errors?.map((err, i) => (
            <p key={i} className="text-xs text-red-700 mb-1">
              {err}
            </p>
          ))}
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="pb-1 pr-2 font-medium">Articolo</th>
                <th className="pb-1 font-medium">Problema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {anomalies.map((a: ErpAnomaly, i: number) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 font-semibold text-red-800">
                    Riga {a.IdRiga}
                  </td>
                  <td className="py-1.5 text-red-700">
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

export default function ProcessingOrdersTable() {
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
      <div className="py-6 text-center text-sm text-gray-500">
        Caricamento ordini in elaborazione...
      </div>
    );
  }

  if (orders.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">
          Ordini in elaborazione
          {hasProcessing && (
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </h3>
        <button
          onClick={fetchProcessingOrders}
          disabled={isLoading}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Aggiorna
        </button>
      </div>

      {orders.map((order) => (
        <OrderRow
          key={order.order_id}
          order={order}
          onRevert={revertToCart}
          onResubmit={resubmitOrder}
        />
      ))}
    </div>
  );
}
