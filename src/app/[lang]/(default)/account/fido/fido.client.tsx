'use client';

import { useExpositionQuery } from '@framework/acccount/fetch-account';
import { useTranslation } from 'src/app/i18n/client';
import cn from 'classnames';

const money = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '';

export default function FidoClient({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data, isLoading, isError, error } = useExpositionQuery(true);

  return (
    <main className="min-h-screen bg-gray-100" lang={lang} data-lang={lang}>
      <div className="mx-auto max-w-[1920px] px-4 pt-6 md:px-6 lg:px-8 2xl:px-10">
        {/* Header / Toolbar */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            {t('exposition-title')}
          </h1>
          <a
            href={`/${lang}/shop`}
            className="hidden sm:inline-flex rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t('exposition-back-to-catalog')}
          </a>
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

        {/* ===== Desktop: Table with fixed height & sticky header ===== */}
        {!isLoading && data && (
          <div className="hidden rounded-md border border-gray-200 bg-white sm:block overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="min-w-[880px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 border-b border-gray-300">
                  <tr>
                    <th className="w-1/3 px-4 py-3 text-left font-semibold"></th>
                    <th className="w-1/5 px-4 py-3 text-right font-semibold border-l border-gray-300">
                      {t('exposition-col-expired')}
                    </th>
                    <th className="w-1/5 px-4 py-3 text-right font-semibold border-l border-gray-300">
                      {t('exposition-col-to-expire')}
                    </th>
                    <th className="w-1/5 px-4 py-3 text-right font-semibold border-l border-gray-300">
                      {t('exposition-col-total')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-direct-remittances')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.directRemittancesExpired)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.directRemittancesToExpire)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.directRemittancesTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-riba')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.ribaExpired)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.ribaToExpire)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.ribaTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-unbilled-notes')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.unbilledBillsToExpire)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.unbilledBillsTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-unfulfilled-orders')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.ordersNotFulfilledToExpire)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.ordersNotFulfilledTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-to-expire')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.prebillsToExpire)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.prebillsTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-advances')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.advancesTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100 bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {t('exposition-row-total')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 border-l border-gray-100">
                      {money(data.total2Total)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-trust-assured')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {money(data.trustAssuredTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">
                      {t('exposition-row-difference')}
                    </td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td className="px-4 py-3 border-l border-gray-100"></td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-semibold border-l border-gray-100',
                        data.differenceTotal > 0
                          ? 'text-green-600'
                          : 'text-red-600',
                      )}
                    >
                      {money(data.differenceTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Mobile: Cards (responsive) ===== */}
        {!isLoading && data && (
          <div className="sm:hidden space-y-2">
            {[
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
                expired: undefined,
                toExpire: data.unbilledBillsToExpire,
                total: data.unbilledBillsTotal,
              },
              {
                titleKey: 'exposition-row-unfulfilled-orders',
                expired: undefined,
                toExpire: data.ordersNotFulfilledToExpire,
                total: data.ordersNotFulfilledTotal,
              },
              {
                titleKey: 'exposition-row-to-expire',
                expired: undefined,
                toExpire: data.prebillsToExpire,
                total: data.prebillsTotal,
              },
              {
                titleKey: 'exposition-row-advances',
                expired: undefined,
                toExpire: undefined,
                total: data.advancesTotal,
              },
              {
                titleKey: 'exposition-row-total',
                expired: undefined,
                toExpire: undefined,
                total: data.total2Total,
              },
              {
                titleKey: 'exposition-row-trust-assured',
                expired: undefined,
                toExpire: undefined,
                total: data.trustAssuredTotal,
              },
              {
                titleKey: 'exposition-row-difference',
                expired: undefined,
                toExpire: undefined,
                total: data.differenceTotal,
              },
            ].map((x) => (
              <div
                key={x.titleKey}
                className="rounded-xl border bg-white p-3 shadow-sm"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {t(x.titleKey)}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>
                    <div className="text-[11px] uppercase">
                      {t('exposition-col-expired')}
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {x.expired == null ? '' : money(x.expired)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase">
                      {t('exposition-col-to-expire')}
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {x.toExpire == null ? '' : money(x.toExpire)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase">
                      {t('exposition-col-total')}
                    </div>
                    <div
                      className={cn(
                        'text-base font-semibold',
                        x.titleKey === 'exposition-row-difference'
                          ? data.differenceTotal > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-gray-900',
                      )}
                    >
                      {money(x.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
