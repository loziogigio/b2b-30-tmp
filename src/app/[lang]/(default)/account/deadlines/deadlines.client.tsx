'use client';

import { useMemo } from 'react';
import {
  usePaymentDeadlineQuery,
  useCustomerQuery,
} from '@framework/acccount/fetch-account';
import { useTranslation } from 'src/app/i18n/client';
import { IoMdPrint } from 'react-icons/io';
import { openDeadlinesPrintWindow } from './deadlines-export';

// utils
const currency = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '';

const dateLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT');
};

export default function DeadlinesClient({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data, isLoading, isError, error } = usePaymentDeadlineQuery(true);
  const { data: customer } = useCustomerQuery(true);

  // Group items: header rows followed by their detail rows
  const rows = useMemo(() => {
    return data?.items ?? [];
  }, [data]);

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

  return (
    <main className="min-h-screen bg-gray-100" lang={lang} data-lang={lang}>
      <div className="mx-auto max-w-[1920px] px-4 pt-6 md:px-6 lg:px-8 2xl:px-10">
        {/* Summary Totals */}
        {!isLoading && data && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap gap-8">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {t('deadlines-total-general')}
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {currency(data.totalGeneral)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {t('deadlines-total-expired')}
                </span>
                <span className="text-lg font-bold text-red-600">
                  {currency(data.totalExpired)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {t('deadlines-total-to-expire')}
                </span>
                <span className="text-lg font-bold text-green-600">
                  {currency(data.totalToExpire)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Header with Print Button */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold text-gray-900 sr-only">
            {t('deadlines-title')}
          </h1>
          <div className="flex-1" />
          <button
            onClick={handlePrint}
            disabled={!data}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('deadlines-print')}
            <IoMdPrint className="text-lg" />
          </button>
        </div>

        {/* Alerts */}
        {isLoading && (
          <div className="mb-3 rounded-md border bg-white p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/4 rounded bg-gray-200" />
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        )}
        {isError && (
          <div className="mb-3 rounded-md border bg-red-50 p-4 text-sm text-red-700">
            Errore: {error?.message}
          </div>
        )}

        {/* ===== Desktop/Tablet: table ===== */}
        {!isLoading && data && (
          <div className="hidden rounded-md border border-gray-200 bg-white sm:block overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 border-b border-gray-300">
                  <tr>
                    <th className="w-[22%] px-4 py-3 text-left font-semibold">
                      {t('deadlines-col-type')}
                    </th>
                    <th className="w-[5%] px-2 py-3 text-center font-semibold"></th>
                    <th className="w-[12%] px-4 py-3 text-left font-semibold border-l border-gray-300">
                      {t('deadlines-col-date')}
                    </th>
                    <th className="w-[13%] px-4 py-3 text-right font-semibold border-l border-gray-300">
                      {t('deadlines-col-total')}
                    </th>
                    <th className="w-[18%] px-4 py-3 text-left font-semibold border-l border-gray-300">
                      {t('deadlines-col-document')}
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left font-semibold border-l border-gray-300">
                      {t('deadlines-col-date')}
                    </th>
                    <th className="w-[13%] px-4 py-3 text-right font-semibold border-l border-gray-300">
                      {t('deadlines-col-amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const isHeader = r.isDueView;
                    const isDetail = r.isReferenceView;

                    if (isHeader) {
                      // Header row: Tipo, status dot, Data, Totale
                      return (
                        <tr
                          key={`header-${idx}`}
                          className="hover:bg-gray-50 border-b border-gray-100 bg-gray-50/50"
                        >
                          <td className="px-4 py-3 text-gray-900 font-medium">
                            {r.description}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                          </td>
                          <td className="px-4 py-3 text-gray-900 border-l border-gray-100">
                            {dateLabel(r.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 border-l border-gray-100">
                            {currency(r.total)}
                          </td>
                          <td className="px-4 py-3 border-l border-gray-100"></td>
                          <td className="px-4 py-3 border-l border-gray-100"></td>
                          <td className="px-4 py-3 border-l border-gray-100"></td>
                        </tr>
                      );
                    }

                    if (isDetail) {
                      // Detail row: empty first cols, Documento, Data, Importo
                      return (
                        <tr
                          key={`detail-${idx}`}
                          className="hover:bg-gray-50 border-b border-gray-100"
                        >
                          <td className="px-4 py-3"></td>
                          <td className="px-2 py-3"></td>
                          <td className="px-4 py-3 border-l border-gray-100"></td>
                          <td className="px-4 py-3 border-l border-gray-100"></td>
                          <td className="px-4 py-3 text-gray-700 border-l border-gray-100">
                            {r.document}
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-l border-gray-100">
                            {dateLabel(r.referenceDate)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                            {currency(r.amount)}
                          </td>
                        </tr>
                      );
                    }

                    return null;
                  })}

                  {!rows.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        {t('deadlines-no-items')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Mobile: cards ===== */}
        {!isLoading && data && (
          <div className="sm:hidden space-y-2">
            {rows
              .filter((r) => r.isDueView)
              .map((r, idx) => {
                // Find associated detail rows
                const startIdx = rows.indexOf(r);
                const details = rows.slice(startIdx + 1).filter((d, i, arr) => {
                  // Stop at next header
                  const beforeNextHeader = arr
                    .slice(0, i + 1)
                    .every((x) => !x.isDueView || x === d);
                  return d.isReferenceView && beforeNextHeader;
                });

                return (
                  <div
                    key={`card-${idx}`}
                    className="rounded-xl border bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="font-semibold text-gray-900">
                          {r.description}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {currency(r.total)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {t('deadlines-col-date')}: {dateLabel(r.dueDate)}
                    </div>
                    {details.length > 0 && (
                      <div className="mt-2 border-t pt-2 space-y-1">
                        {details.map((d, dIdx) => (
                          <div
                            key={`detail-${dIdx}`}
                            className="flex justify-between text-sm text-gray-700"
                          >
                            <span>{d.document}</span>
                            <span>{currency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {!rows.filter((r) => r.isDueView).length && (
              <div className="rounded-md border bg-white px-4 py-6 text-center text-sm text-gray-500">
                {t('deadlines-no-items')}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
