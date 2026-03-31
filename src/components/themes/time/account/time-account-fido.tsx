'use client';

import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { useExpositionQuery } from '@framework/acccount/fetch-account';
import { TimeCard, TimeStatusBadge } from './time-account-primitives';

const money = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '';

interface TimeAccountFidoProps {
  lang: string;
}

type Row = {
  titleKey: string;
  expired?: number;
  toExpire?: number;
  total: number;
  isTotal?: boolean;
  isDifference?: boolean;
};

export default function TimeAccountFido({ lang }: TimeAccountFidoProps) {
  const { t } = useTranslation(lang, 'common');
  const { data, isLoading, isError, error } = useExpositionQuery(true);

  if (isLoading) {
    return (
      <TimeCard className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 rounded bg-[var(--time-gray-100)]" />
          <div className="h-40 w-full rounded bg-[var(--time-gray-100)]" />
        </div>
      </TimeCard>
    );
  }

  if (isError) {
    return (
      <TimeCard className="p-4">
        <div className="rounded-[var(--radius-btn)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error?.message}
        </div>
      </TimeCard>
    );
  }

  if (!data) return null;

  const creditPct =
    data.creditLimitTotal > 0
      ? ((data.creditLimitTotal - data.differenceTotal) /
          data.creditLimitTotal) *
        100
      : 0;

  const rows: Row[] = [
    {
      titleKey: 'exposition-row-direct-remittances',
      expired: data.directRemittancesExpired,
      toExpire: data.directRemittancesToExpire,
      total: data.directRemittancesTotal,
    },
    {
      titleKey: 'exposition-row-riba',
      expired: data.ribaExpired,
      toExpire: data.ribaToExpire,
      total: data.ribaTotal,
    },
    {
      titleKey: 'exposition-row-unbilled-notes',
      toExpire: data.unbilledBillsToExpire,
      total: data.unbilledBillsTotal,
    },
    {
      titleKey: 'exposition-row-unfulfilled-orders',
      toExpire: data.ordersNotFulfilledToExpire,
      total: data.ordersNotFulfilledTotal,
    },
    {
      titleKey: 'exposition-row-to-expire',
      toExpire: data.prebillsToExpire,
      total: data.prebillsTotal,
    },
    { titleKey: 'exposition-row-advances', total: data.advancesTotal },
    {
      titleKey: 'exposition-row-total',
      total: data.total2Total,
      isTotal: true,
    },
    { titleKey: 'exposition-row-trust-assured', total: data.trustAssuredTotal },
    {
      titleKey: 'exposition-row-difference',
      total: data.differenceTotal,
      isDifference: true,
    },
  ];

  return (
    <div className="space-y-5 font-[var(--font-body)]">
      {/* Summary Card */}
      <TimeCard className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--time-gray-400)] font-[var(--font-body)]">
              {t('exposition-title', { defaultValue: 'Esposizione Totale' })}
            </div>
            <div className="text-[28px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums mt-0.5">
              {money(data.total2Total)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data.creditLimitTotal > 0 && (
              <TimeStatusBadge
                label={`Fido: ${money(data.creditLimitTotal)}`}
                color="#7c3aed"
                bg="rgba(124,58,237,0.08)"
              />
            )}
            {data.differenceTotal > 0 ? (
              <TimeStatusBadge
                label={`Disponibile: ${money(data.differenceTotal)}`}
                color="#059669"
                bg="rgba(5,150,105,0.08)"
              />
            ) : (
              <TimeStatusBadge
                label={`Sforamento: ${money(Math.abs(data.differenceTotal))}`}
                color="#dc2626"
                bg="rgba(220,38,38,0.08)"
              />
            )}
          </div>
        </div>

        {/* Credit bar */}
        {data.creditLimitTotal > 0 && (
          <div className="mt-4">
            <div className="h-2.5 rounded-[5px] bg-[var(--time-gray-50)] overflow-hidden">
              <div
                className="h-full rounded-[5px] transition-[width] duration-1000 ease-out"
                style={{
                  width: `${Math.min(creditPct, 100)}%`,
                  background:
                    creditPct > 80
                      ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                      : creditPct > 60
                        ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                        : 'linear-gradient(90deg, #059669, #34d399)',
                }}
              />
            </div>
          </div>
        )}
      </TimeCard>

      {/* Table */}
      <TimeCard className="overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block">
          <table className="w-full text-[13px] font-[var(--font-body)]">
            <thead className="bg-[var(--time-gray-100)] text-[var(--time-gray-400)]">
              <tr className="text-[10px] font-bold uppercase tracking-[0.06em]">
                <th className="w-1/3 px-[22px] py-3 text-left">{''}</th>
                <th className="w-1/5 px-4 py-3 text-right">
                  {t('exposition-col-expired', { defaultValue: 'Scaduto' })}
                </th>
                <th className="w-1/5 px-4 py-3 text-right">
                  {t('exposition-col-to-expire', { defaultValue: 'A Scadere' })}
                </th>
                <th className="w-1/5 px-4 py-3 text-right">
                  {t('exposition-col-total', { defaultValue: 'Totale' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.titleKey}
                  className={cn(
                    'border-b border-[var(--time-gray-50)] hover:bg-[var(--time-gray-50)] transition-colors',
                    r.isTotal && 'bg-[var(--time-gray-50)]/50',
                  )}
                >
                  <td
                    className={cn(
                      'px-[22px] py-3 text-[var(--time-dark)]',
                      (r.isTotal || r.isDifference) && 'font-bold',
                    )}
                  >
                    {t(r.titleKey)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--time-gray-500)] tabular-nums">
                    {r.expired != null ? money(r.expired) : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--time-gray-500)] tabular-nums">
                    {r.toExpire != null ? money(r.toExpire) : ''}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right tabular-nums',
                      r.isDifference
                        ? r.total > 0
                          ? 'text-emerald-600 font-bold'
                          : 'text-red-600 font-bold'
                        : r.isTotal
                          ? 'font-bold text-[var(--time-dark)]'
                          : 'text-[var(--time-gray-500)]',
                    )}
                  >
                    {money(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-[var(--time-gray-50)]">
          {rows.map((r) => (
            <div key={r.titleKey} className="px-[22px] py-4">
              <div
                className={cn(
                  'text-[13px] text-[var(--time-dark)] mb-2',
                  (r.isTotal || r.isDifference) && 'font-bold',
                )}
              >
                {t(r.titleKey)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-[var(--time-gray-400)] mb-0.5">
                    {t('exposition-col-expired', { defaultValue: 'Scaduto' })}
                  </div>
                  <div className="font-semibold text-[var(--time-dark)] tabular-nums">
                    {r.expired != null ? money(r.expired) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[var(--time-gray-400)] mb-0.5">
                    {t('exposition-col-to-expire', {
                      defaultValue: 'A Scadere',
                    })}
                  </div>
                  <div className="font-semibold text-[var(--time-dark)] tabular-nums">
                    {r.toExpire != null ? money(r.toExpire) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-[var(--time-gray-400)] mb-0.5">
                    {t('exposition-col-total', { defaultValue: 'Totale' })}
                  </div>
                  <div
                    className={cn(
                      'font-semibold tabular-nums',
                      r.isDifference
                        ? r.total > 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                        : 'text-[var(--time-dark)]',
                    )}
                  >
                    {money(r.total)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TimeCard>
    </div>
  );
}
