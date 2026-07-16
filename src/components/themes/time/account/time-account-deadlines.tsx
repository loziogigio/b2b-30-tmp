'use client';

import { useMemo } from 'react';
import { useTranslation } from 'src/app/i18n/client';
import {
  usePaymentDeadlineQuery,
  useCustomerQuery,
} from '@framework/acccount/fetch-account';
import { openDeadlinesPrintWindow } from '@/app/[lang]/(default)/account/deadlines/deadlines-export';
import {
  groupDeadlineRows,
  isDeadlineExpired,
} from '@/utils/transform/group-deadline-rows';
import { TimeCard } from './time-account-primitives';
import { IconPrint } from './time-account-icons';

const money = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '';

const dateLabel = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT');
};

interface TimeAccountDeadlinesProps {
  lang: string;
}

export default function TimeAccountDeadlines({
  lang,
}: TimeAccountDeadlinesProps) {
  const { t } = useTranslation(lang, 'common');
  const { data, isLoading, isError, error } = usePaymentDeadlineQuery(true);
  const { data: customer } = useCustomerQuery(true);

  const groups = useMemo(() => groupDeadlineRows(data?.items ?? []), [data]);

  const handlePrint = () => {
    if (!data) return;
    openDeadlinesPrintWindow({
      data,
      customer,
      translations: {
        title: t('deadlines-title'),
        totalGeneral: t('deadlines-total-general'),
        totalExpired: t('deadlines-total-expired'),
        totalToExpire: t('deadlines-total-to-expire'),
        colType: t('deadlines-col-type'),
        colDate: t('deadlines-col-date'),
        colTotal: t('deadlines-col-total'),
        colDocument: t('deadlines-col-document'),
        colAmount: t('deadlines-col-amount'),
      },
    });
  };

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

  const th =
    'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-white';
  const cell = 'px-4 py-3 border-b border-[var(--time-gray-100)]';

  return (
    <div className="space-y-5 font-[var(--font-body)]">
      {/* Summary + Print */}
      {data && (
        <TimeCard className="px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--time-gray-400)]">
                  {t('deadlines-total-general', {
                    defaultValue: 'Totale Generale',
                  })}
                </span>
                <span className="text-lg font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums">
                  {money(data.totalGeneral)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--time-gray-400)]">
                  {t('deadlines-total-expired', {
                    defaultValue: 'Totale Scaduto',
                  })}
                </span>
                <span className="text-lg font-black text-red-600 font-[var(--font-display)] tabular-nums">
                  {money(data.totalExpired)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--time-gray-400)]">
                  {t('deadlines-total-to-expire', {
                    defaultValue: 'Totale A Scadere',
                  })}
                </span>
                <span className="text-lg font-black text-emerald-600 font-[var(--font-display)] tabular-nums">
                  {money(data.totalToExpire)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!data}
              className="inline-flex items-center gap-2 rounded-[var(--radius-btn)] bg-[var(--time-dark)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--time-red)] transition-colors disabled:opacity-50"
            >
              <IconPrint />
              {t('text-print', { defaultValue: 'Stampa' })}
            </button>
          </div>
        </TimeCard>
      )}

      {/* ===== Desktop/Tablet: two-tier table ===== */}
      <TimeCard className="hidden sm:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[980px] w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--time-dark)]">
              <tr>
                <th className={`${th} w-[22%]`}>
                  {t('deadlines-col-type', { defaultValue: 'Tipo' })}
                </th>
                <th className={`${th} w-[5%]`} aria-label="stato" />
                <th className={`${th} w-[13%]`}>
                  {t('deadlines-col-date', { defaultValue: 'Data' })}
                </th>
                <th className={`${th} w-[14%] text-right`}>
                  {t('deadlines-col-total', { defaultValue: 'Totale' })}
                </th>
                <th className={`${th} w-[18%]`}>
                  {t('deadlines-col-document', { defaultValue: 'Documento' })}
                </th>
                <th className={`${th} w-[13%]`}>
                  {t('deadlines-col-date', { defaultValue: 'Data' })}
                </th>
                <th className={`${th} w-[15%] text-right`}>
                  {t('deadlines-col-amount', { defaultValue: 'Importo' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, gIdx) => {
                const expired = isDeadlineExpired(group.header);
                return [
                  <tr
                    key={`header-${gIdx}`}
                    className="bg-[var(--time-gray-50)] hover:bg-[var(--time-gray-100)] transition-colors"
                  >
                    <td
                      className={`${cell} font-semibold text-[var(--time-dark)]`}
                    >
                      {group.header.description}
                    </td>
                    <td className={`${cell} text-center`}>
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: expired ? '#dc2626' : '#059669',
                        }}
                        title={
                          expired
                            ? t('deadline-status-expired', {
                                defaultValue: 'Scaduta',
                              })
                            : t('deadline-status-due', {
                                defaultValue: 'In scadenza',
                              })
                        }
                      />
                    </td>
                    <td className={`${cell} text-[var(--time-dark)]`}>
                      {dateLabel(group.header.dueDate)}
                    </td>
                    <td
                      className={`${cell} text-right font-bold tabular-nums ${
                        group.header.total < 0
                          ? 'text-red-600'
                          : 'text-[var(--time-dark)]'
                      }`}
                    >
                      {money(group.header.total)}
                    </td>
                    <td className={cell} />
                    <td className={cell} />
                    <td className={cell} />
                  </tr>,
                  ...group.details.map((d, dIdx) => (
                    <tr
                      key={`detail-${gIdx}-${dIdx}`}
                      className="hover:bg-[var(--time-gray-50)] transition-colors"
                    >
                      <td className={cell} />
                      <td className={cell} />
                      <td className={cell} />
                      <td className={cell} />
                      <td
                        className={`${cell} font-[var(--font-mono)] text-[var(--time-gray-400)]`}
                      >
                        {d.document}
                      </td>
                      <td className={`${cell} text-[var(--time-gray-400)]`}>
                        {dateLabel(d.referenceDate)}
                      </td>
                      <td
                        className={`${cell} text-right tabular-nums ${
                          d.amount < 0
                            ? 'text-red-600'
                            : 'text-[var(--time-dark)]'
                        }`}
                      >
                        {money(d.amount)}
                      </td>
                    </tr>
                  )),
                ];
              })}

              {!groups.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-[var(--time-gray-400)]"
                  >
                    {t('text-no-deadlines', {
                      defaultValue: 'Nessuna scadenza trovata',
                    })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TimeCard>

      {/* ===== Mobile: one card per group ===== */}
      <div className="space-y-3 sm:hidden">
        {groups.map((group, gIdx) => {
          const expired = isDeadlineExpired(group.header);
          return (
            <TimeCard key={`card-${gIdx}`} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: expired ? '#dc2626' : '#059669' }}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--time-dark)] truncate">
                      {group.header.description}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--time-gray-400)]">
                      {dateLabel(group.header.dueDate)}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[15px] font-extrabold tabular-nums ${
                    group.header.total < 0
                      ? 'text-red-600'
                      : 'text-[var(--time-dark)]'
                  }`}
                >
                  {money(group.header.total)}
                </span>
              </div>

              {group.details.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-[var(--time-gray-100)] pt-2.5">
                  {group.details.map((d, dIdx) => (
                    <div
                      key={`m-detail-${dIdx}`}
                      className="flex items-center justify-between gap-3 text-[12px]"
                    >
                      <span className="font-[var(--font-mono)] text-[var(--time-gray-400)] truncate">
                        {d.document}
                        {d.referenceDate && ` · ${dateLabel(d.referenceDate)}`}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          d.amount < 0
                            ? 'text-red-600'
                            : 'text-[var(--time-dark)]'
                        }`}
                      >
                        {money(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TimeCard>
          );
        })}

        {!groups.length && (
          <TimeCard className="py-8 text-center text-sm text-[var(--time-gray-400)]">
            {t('text-no-deadlines', {
              defaultValue: 'Nessuna scadenza trovata',
            })}
          </TimeCard>
        )}
      </div>
    </div>
  );
}
