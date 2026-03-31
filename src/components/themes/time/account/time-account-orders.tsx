'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import OrderDetails from '@components/orders/order-details';
import OrdersFilter from '@components/orders/orders-filter';
import type { OrderSummary } from '@framework/order/types-b2b-orders-list';
import { useOrdersListQuery } from '@framework/order/fetch-orders-list';
import { ERP_STATIC } from '@framework/utils/static';
import { useOrderDetailsQuery } from '@framework/order/fetch-order';
import {
  TimeCard,
  TimeIconBox,
  TimeStatusBadge,
} from './time-account-primitives';
import { IconPackage, IconCheck, IconTruck } from './time-account-icons';

const money = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '';

function pad(n: number) {
  return `${n}`.padStart(2, '0');
}
function toInputDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toErpDateFromInput(input: string) {
  const [y, m, d] = input.split('-');
  return `${d}${m}${y}`;
}
type Criteria = {
  date_from: string;
  date_to: string;
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

const statusMap: Record<string, { color: string; bg: string; label: string }> =
  {
    NE: { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', label: 'Da evadere' },
    E: { color: '#059669', bg: 'rgba(5,150,105,0.08)', label: 'Evaso' },
    IA: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', label: 'In attesa' },
  };

export default function TimeAccountOrders() {
  const params = useParams<{ lang?: string }>();
  const lang = (params?.lang as string) || 'it';
  const { t } = useTranslation(lang, 'common');

  const destinationOptions = useMemo(() => [{ value: '', label: 'Tutti' }], []);
  const [criteria, setCriteria] = useState<Criteria>(() => lastMonthDefaults());

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

  const [selectedId, setSelectedId] = useState<string>('');
  useEffect(() => {
    if (!orders.length) return setSelectedId('');
    if (!selectedId || !orders.some((o) => o.id === selectedId)) {
      setSelectedId(orders[0].id);
    }
  }, [orders, selectedId]);

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

  const selected: OrderSummary | null = useMemo(
    () => orders.find((o) => o.id === selectedId) || null,
    [orders, selectedId],
  );

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
    isError: isDetailError,
    error: detailError,
  } = useOrderDetailsQuery(detailParams as any, !!detailParams);

  return (
    <div className="space-y-5 font-[var(--font-body)]">
      {/* Filter */}
      <TimeCard className="p-5">
        <div className="time-orders-filter">
          <style>{`
            .time-orders-filter input,
            .time-orders-filter select {
              border-radius: var(--radius-btn) !important;
              border-color: var(--time-gray-200) !important;
              font-family: var(--font-body) !important;
              font-size: 13px !important;
            }
            .time-orders-filter input:focus,
            .time-orders-filter select:focus {
              border-color: var(--time-red) !important;
              box-shadow: 0 0 0 3px rgba(230,57,70,0.1) !important;
            }
            .time-orders-filter button[type="submit"],
            .time-orders-filter button[type="button"] {
              border-radius: var(--radius-btn) !important;
              font-family: var(--font-body) !important;
              font-size: 12px !important;
            }
          `}</style>
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
        </div>
      </TimeCard>

      {isLoading && (
        <TimeCard className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/4 rounded bg-[var(--time-gray-100)]" />
            <div className="h-12 w-full rounded bg-[var(--time-gray-100)]" />
            <div className="h-12 w-full rounded bg-[var(--time-gray-100)]" />
          </div>
        </TimeCard>
      )}

      {isError && (
        <TimeCard className="p-4">
          <div className="rounded-[var(--radius-btn)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(error as Error)?.message || 'Error loading orders'}
          </div>
        </TimeCard>
      )}

      {/* List + Detail */}
      {!isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(300px,400px)_minmax(0,1fr)] gap-4 items-start">
          {/* Order List */}
          <TimeCard className="max-h-[calc(100vh-220px)] overflow-y-auto">
            <div className="px-[22px] pt-4 pb-3 border-b border-[var(--time-gray-100)]">
              <h3 className="text-[15px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)]">
                {t('text-my-orders', { defaultValue: 'I Miei Ordini' })}
              </h3>
              <span className="text-[11px] text-[var(--time-gray-400)]">
                {orders.length}{' '}
                {t('text-results', { defaultValue: 'risultati' })}
              </span>
            </div>
            {orders.map((o: OrderSummary) => {
              const st = statusMap[o.status_code] || statusMap.NE;
              const isActive = o.id === selectedId;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-[22px] py-3.5 border-b border-[var(--time-gray-50)] text-left transition-colors',
                    isActive
                      ? 'bg-[rgba(230,57,70,0.04)]'
                      : 'hover:bg-[var(--time-gray-50)]',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TimeIconBox
                      icon={
                        o.status_code === 'E' ? (
                          <IconCheck />
                        ) : o.status_code === 'NE' ? (
                          <IconPackage />
                        ) : (
                          <IconTruck />
                        )
                      }
                      color={st.color}
                      bg={st.bg}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[var(--time-dark)] font-[var(--font-mono)] tracking-[-0.01em] truncate">
                        {o.document}
                      </div>
                      <div className="text-[11px] text-[var(--time-gray-400)] mt-px">
                        {o.date_label}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-extrabold text-[var(--time-dark)] tabular-nums">
                      {money(o.ordered_total)}
                    </div>
                    <TimeStatusBadge
                      label={st.label}
                      color={st.color}
                      bg={st.bg}
                    />
                  </div>
                </button>
              );
            })}
            {orders.length === 0 && (
              <div className="px-[22px] py-8 text-center text-sm text-[var(--time-gray-400)]">
                {t('text-no-orders', { defaultValue: 'Nessun ordine trovato' })}
              </div>
            )}
          </TimeCard>

          {/* Order Detail */}
          <TimeCard className="p-6 max-h-[calc(100vh-220px)] overflow-y-auto">
            <div className="time-order-detail">
              <style>{`
                .time-order-detail table {
                  font-family: var(--font-body) !important;
                  font-size: 13px !important;
                }
                .time-order-detail th {
                  font-family: var(--font-body) !important;
                  font-weight: 700 !important;
                  font-size: 11px !important;
                  text-transform: uppercase !important;
                  letter-spacing: 0.06em !important;
                  color: var(--time-gray-400) !important;
                }
              `}</style>
              <OrderDetails lang={lang} order={orderDetail as any} />
              {isDetailError && (
                <p className="mt-3 text-sm text-red-600">
                  {(detailError as Error)?.message || 'Error loading detail'}
                </p>
              )}
            </div>
          </TimeCard>
        </div>
      )}
    </div>
  );
}
