'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useOrderDetailsQuery } from '@framework/order/fetch-order';
import AddressCard from '@components/orders/address-card';
import OrderItemsTable from '@components/orders/order-items-table';
import OrderProgress from '@components/orders/order-progress';

// ---- tiny helpers ---------------------------------------------------------
function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toDisplayDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
function getStatusFromOrder(o: any):
  'pending' | 'processing' | 'at-local-facility' | 'out-for-delivery' | 'completed' {
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
  const params = useMemo(() => {
    const { cause, doc_year, doc_number } = initialParams;
    if (!cause || !doc_year || !doc_number) return null;
    return { cause, doc_year, doc_number };
  }, [initialParams]);

  const { data: order, isLoading, isError, error } = useOrderDetailsQuery(params as any);

  if (!params) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-red-600">
        Missing query parameters. Please provide <code>cause</code>, <code>doc_year</code>, and <code>doc_number</code>.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading order details…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-red-600">
        {(error as Error)?.message || 'Failed to load order details.'}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        No order found.
      </div>
    );
  }

  const status = getStatusFromOrder(order);
  const totalItems =
    (order as any).items?.reduce((acc: number, it: any) => acc + Number(it.quantity ?? 0), 0) ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header badges */}
      <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Order Status:&nbsp;</span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {status === 'completed' ? 'Order Completed' :
             status === 'out-for-delivery' ? 'Out For Delivery' :
             status === 'at-local-facility' ? 'At Local Facility' :
             status === 'processing' ? 'Order Processing' :
             'Order Pending'}
          </span>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Payment Status:&nbsp;</span>
          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
            {/* replace when you have a real field */}
            Cash On Delivery
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 border-b px-6 py-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Order Number" value={(order as any).tracking_number ?? (order as any).number ?? '—'} />
        <StatCard label="Date" value={toDisplayDate((order as any).created_at)} />
        <StatCard label="Total" value={`$${money((order as any).total).toFixed(2)}`} />
        <StatCard label="Payment Method" value={(order as any).payment_method ?? 'CASH_ON_DELIVERY'} />
      </div>

      {/* Progress */}
      <div className="px-2 pt-2 md:px-6">
        <OrderProgress status={status} />
      </div>

      {/* Two columns: totals + order info */}
      <div className="grid gap-6 px-6 pb-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Total Amount</h3>
          </div>
          <div className="px-5 py-4">
            <InfoRow label="Sub Total" value={`$${money((order as any).sub_total).toFixed(2)}`} />
            <InfoRow label="Shipping Charge" value={`$${money((order as any).delivery_fee).toFixed(2)}`} />
            <InfoRow label="Tax" value={`$${money((order as any).tax).toFixed(2)}`} />
            <InfoRow label="Discount" value={`$${money((order as any).discount).toFixed(2)}`} />
            <div className="mt-3 border-t pt-3">
              <InfoRow label="Total" value={`$${money((order as any).total).toFixed(2)}`} bold />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
          </div>
          <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
            <div className="space-y-2">
              <MiniLine label="Name" value={(order as any).customer_name ?? 'Customer'} />
              <MiniLine label="Total Item" value={`${totalItems} items`} />
              <MiniLine label="Delivery Time" value={(order as any).delivery_time ?? 'Express Delivery'} />
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-900">Shipping Address</p>
                <AddressCard title="" a={(order as any).shipping_address} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-900">Billing Address</p>
                <AddressCard title="" a={(order as any).billing_address} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items table with internal scroll */}
      <div className="px-6 pb-6">
        <OrderItemsTable items={(order as any).items ?? []} height={360} />
      </div>

      {/* Back link (optional) */}
      <div className="border-t px-6 py-4">
        <Link href={`/${lang}/account/orders`} className="text-sm text-teal-600 hover:underline">
          ← Back to orders
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

function InfoRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between text-sm last:mb-0">
      <span className="text-gray-600">{label}</span>
      <span className={bold ? 'font-semibold text-gray-900' : 'text-gray-900'}>{value}</span>
    </div>
  );
}

function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
