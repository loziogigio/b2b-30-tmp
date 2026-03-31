'use client';

import { useMemo } from 'react';
import { useTranslation } from 'src/app/i18n/client';
import {
  usePaymentDeadlineQuery,
  useCustomerQuery,
} from '@framework/acccount/fetch-account';
import { openDeadlinesPrintWindow } from '@/app/[lang]/(default)/account/deadlines/deadlines-export';
import {
  TimeCard,
  TimeIconBox,
  TimeStatusBadge,
} from './time-account-primitives';
import { IconCalendar, IconCheck, IconPrint } from './time-account-icons';

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

  const rows = useMemo(() => data?.items ?? [], [data]);

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

      {/* Deadline Rows */}
      <TimeCard>
        {rows.map((d, i) => {
          const isPaid = d.amount <= 0;
          const isExpired = d.dueDate
            ? new Date(d.dueDate) < new Date()
            : false;
          return (
            <div
              key={`${d.document}-${i}`}
              className="flex items-center justify-between px-[22px] py-4 border-b border-[var(--time-gray-50)] last:border-b-0 hover:bg-[var(--time-gray-50)] transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <TimeIconBox
                  icon={isPaid ? <IconCheck /> : <IconCalendar />}
                  color={isPaid ? '#059669' : isExpired ? '#dc2626' : '#2563eb'}
                  bg={
                    isPaid
                      ? 'rgba(5,150,105,0.08)'
                      : isExpired
                        ? 'rgba(220,38,38,0.08)'
                        : 'rgba(37,99,235,0.08)'
                  }
                  size={40}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--time-dark)] truncate">
                    {d.description}
                  </div>
                  <div className="text-[11px] text-[var(--time-gray-400)] mt-0.5">
                    {d.document && (
                      <span className="font-[var(--font-mono)] text-[11px]">
                        {d.document}
                      </span>
                    )}
                    {d.dueDate && ` · ${dateLabel(d.dueDate)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <TimeStatusBadge
                  label={
                    isPaid ? 'Pagata' : isExpired ? 'Scaduta' : 'In scadenza'
                  }
                  color={isPaid ? '#059669' : isExpired ? '#dc2626' : '#2563eb'}
                  bg={
                    isPaid
                      ? 'rgba(5,150,105,0.08)'
                      : isExpired
                        ? 'rgba(220,38,38,0.08)'
                        : 'rgba(37,99,235,0.08)'
                  }
                />
                <span className="text-base font-extrabold text-[var(--time-dark)] tabular-nums min-w-[90px] text-right">
                  {money(d.amount)}
                </span>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--time-gray-400)]">
            {t('text-no-deadlines', {
              defaultValue: 'Nessuna scadenza trovata',
            })}
          </div>
        )}
      </TimeCard>
    </div>
  );
}
