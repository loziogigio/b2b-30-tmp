'use client';

import { useExpositionQuery } from '@framework/acccount/fetch-account';
import cn from 'classnames';

const money = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
    : '—';

export default function FidoClient({ lang }: { lang: string }) {
  const { data, isLoading, isError, error } = useExpositionQuery(true);

  return (
    <main className="min-h-screen bg-gray-100" lang={lang} data-lang={lang}>
      <div className="mx-auto max-w-[1920px] px-4 pt-6 md:px-6 lg:px-8 2xl:px-10">
        {/* Header / Toolbar */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Exposition</h1>
          <a
            href={`/${lang}/shop`}
            className="hidden sm:inline-flex rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Back to shop
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
          <div className="hidden rounded-md border border-gray-200 bg-white sm:block">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="min-w-[880px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-red-600 text-white">
                  <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                    <th className="w-1/3"></th>
                    <th className="w-1/5">Expired</th>
                    <th className="w-1/5">To expire</th>
                    <th className="w-1/5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Direct remittances</td>
                    <td className="px-3 py-3">{money(data.directRemittancesExpired)}</td>
                    <td className="px-3 py-3">{money(data.directRemittancesToExpire)}</td>
                    <td className="px-3 py-3">{money(data.directRemittancesTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Ri.Ba.</td>
                    <td className="px-3 py-3">{money(data.ribaExpired)}</td>
                    <td className="px-3 py-3">{money(data.ribaToExpire)}</td>
                    <td className="px-3 py-3">{money(data.ribaTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Unbilled delivery notes</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">{money(data.unbilledBillsToExpire)}</td>
                    <td className="px-3 py-3">{money(data.unbilledBillsTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Orders not fulfilled</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">{money(data.ordersNotFulfilledToExpire)}</td>
                    <td className="px-3 py-3">{money(data.ordersNotFulfilledTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Pre-bills</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">{money(data.prebillsToExpire)}</td>
                    <td className="px-3 py-3">{money(data.prebillsTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Advanced payments</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">{money(data.advancesTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold">
                    <td className="px-3 py-3">Total</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">{money(data.total2Total)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Trust assured</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">{money(data.trustAssuredTotal)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3">Difference</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">—</td>
                    <td
                      className={cn(
                        'px-3 py-3 font-semibold',
                        data.differenceTotal > 0 ? 'text-green-600' : 'text-red-600'
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
                title: 'Direct remittances',
                expired: data.directRemittancesExpired,
                toExpire: data.directRemittancesToExpire,
                total: data.directRemittancesTotal,
              },
              {
                title: 'Ri.Ba.',
                expired: data.ribaExpired,
                toExpire: data.ribaToExpire,
                total: data.ribaTotal,
              },
              {
                title: 'Unbilled delivery notes',
                expired: undefined,
                toExpire: data.unbilledBillsToExpire,
                total: data.unbilledBillsTotal,
              },
              {
                title: 'Orders not fulfilled',
                expired: undefined,
                toExpire: data.ordersNotFulfilledToExpire,
                total: data.ordersNotFulfilledTotal,
              },
              {
                title: 'Pre-bills',
                expired: undefined,
                toExpire: data.prebillsToExpire,
                total: data.prebillsTotal,
              },
              { title: 'Advanced payments', expired: undefined, toExpire: undefined, total: data.advancesTotal },
              { title: 'Total', expired: undefined, toExpire: undefined, total: data.total2Total },
              { title: 'Trust assured', expired: undefined, toExpire: undefined, total: data.trustAssuredTotal },
              { title: 'Difference', expired: undefined, toExpire: undefined, total: data.differenceTotal },
            ].map((x) => (
              <div key={x.title} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">{x.title}</div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>
                    <div className="text-[11px] uppercase">Expired</div>
                    <div className="text-base font-semibold text-gray-900">
                      {x.expired == null ? '—' : money(x.expired)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase">To expire</div>
                    <div className="text-base font-semibold text-gray-900">
                      {x.toExpire == null ? '—' : money(x.toExpire)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase">Total</div>
                    <div
                      className={cn(
                        'text-base font-semibold',
                        x.title === 'Difference'
                          ? data.differenceTotal > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-gray-900'
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
