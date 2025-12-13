'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import OrderDetails from '@components/orders/order-details';
import OrdersFilter from '@components/orders/orders-filter';
import OrdersList from '@components/orders/orders-list';

import type { OrderSummary } from '@framework/order/types-b2b-orders-list';
import { useOrdersListQuery } from '@framework/order/fetch-orders-list';
import { ERP_STATIC } from '@framework/utils/static';
import { useOrderDetailsQuery } from '@framework/order/fetch-order';

// ---------------- helpers ----------------
function pad(n: number) {
  return `${n}`.padStart(2, '0');
}
function toInputDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toErpDateFromInput(input: string) {
  const [y, m, d] = input.split('-');
  return `${d}${m}${y}`; // DDMMYYYY
}
type Criteria = {
  date_from: string; // DDMMYYYY
  date_to: string; // DDMMYYYY
  type: 'T' | 'NE' | 'E' | 'IA';
  address_code: string;
};
function lastMonthDefaults(): Criteria {
  const today = new Date();
  const fromDate = new Date();
  fromDate.setDate(today.getDate() - 30);
  return {
    date_from: toErpDateFromInput(toInputDate(fromDate)),
    date_to: toErpDateFromInput(toInputDate(today)),
    type: 'T',
    address_code: '',
  };
}
// -----------------------------------------

export default function OrderPageClient() {
  // Get lang only if OrderDetails needs it
  const params = useParams<{ lang?: string }>();
  const lang = (params?.lang as string) || 'en';

  // destinations dropdown (stub)
  const destinationOptions = useMemo(() => [{ value: '', label: 'Tutti' }], []);

  // criteria
  const [criteria, setCriteria] = useState<Criteria>(() => lastMonthDefaults());

  // list
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useOrdersListQuery(
    {
      date_from: criteria.date_from,
      date_to: criteria.date_to,
      type: criteria.type,
      ...ERP_STATIC,
    },
    true,
  );

  // selection
  const [selectedId, setSelectedId] = useState<string>('');
  useEffect(() => {
    if (!orders.length) return setSelectedId('');
    if (!selectedId || !orders.some((o) => o.id === selectedId)) {
      setSelectedId(orders[0].id);
    }
  }, [orders, selectedId]);

  // filter initial values (yyyy-mm-dd)
  const initialForFilter = useMemo(() => {
    const toInput = (ddmmyyyy: string) =>
      `${ddmmyyyy.slice(4)}-${ddmmyyyy.slice(2, 4)}-${ddmmyyyy.slice(0, 2)}`;
    return {
      from: toInput(criteria.date_from),
      to: toInput(criteria.date_to),
      type: criteria.type,
      address_code: criteria.address_code,
    };
  }, [criteria]);

  // selected summary
  const selected: OrderSummary | null = useMemo(
    () => orders.find((o) => o.id === selectedId) || null,
    [orders, selectedId],
  );

  // detail params
  const detailParams = useMemo(() => {
    if (!selected) return null;
    const doc_number = (selected as any).doc_number;
    const cause = (selected as any).cause;
    const doc_year = (selected as any).doc_year;
    if (!doc_number || !cause || !doc_year) return null;
    return {
      doc_number: String(doc_number),
      cause: String(cause),
      doc_year: String(doc_year),
    };
  }, [selected]);

  const {
    data: orderDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useOrderDetailsQuery(detailParams as any, !!detailParams);

  // ── Render only page content; the account layout provides the outer shell ──
  return (
    <div className="space-y-6">
      {/* Filter */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <OrdersFilter
          initial={initialForFilter}
          destinations={destinationOptions}
          onApply={(payload) =>
            setCriteria((prev) => ({
              ...prev,
              date_from: payload.date_from,
              date_to: payload.date_to,
              type: payload.type,
              address_code: payload.address_code,
            }))
          }
          onReset={() => setCriteria(lastMonthDefaults())}
        />
      </section>

      {/* List + Details */}
      <section className="flex-1 min-h-0 overflow-hidden pb-6">
        <div
          className="grid h-[calc(100vh-100px)] min-h-0 items-stretch gap-6
                  xl:grid-cols-[18rem_minmax(0,1fr)]
                  2xl:grid-cols-[22rem_minmax(0,1fr)]"
        >
          {/* LEFT: let OrdersList render its own card; wrapper is just sizing */}
          <div className="h-full min-h-0">
            <OrdersList
              orders={orders as any}
              selectedId={selectedId || null}
              onSelect={setSelectedId}
              lang={lang}
            />
          </div>

          {/* RIGHT: details card fills height */}
          <div className="h-full min-h-0 overflow-hidden rounded-2xl bg-white p-6 shadow-sm flex flex-col">
            <OrderDetails lang={lang} order={orderDetail as any} />
            {isDetailError && (
              <p className="mt-3 text-sm text-red-600">
                {(detailError as Error)?.message ||
                  'Failed to load order details.'}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
