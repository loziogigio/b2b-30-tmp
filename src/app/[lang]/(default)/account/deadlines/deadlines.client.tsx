'use client';

import { useMemo, useState } from 'react';
import cn from 'classnames';
import { usePaymentDeadlineQuery } from '@framework/acccount/fetch-account';

// utils
const currency = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
    : '—';

const dateLabel = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

// build a stable, unique key even when "document" repeats
const makeKey = (
  r: { document?: string; referenceDate?: string; dueDate?: string; type?: string },
  idx: number,
  suffix: 'row' | 'card'
) =>
  [
    r.document ?? 'no-doc',
    r.referenceDate ?? '',
    r.dueDate ?? '',
    r.type ?? '',
    idx, // last-resort uniqueness
    suffix,
  ].join('|');

export default function DeadlinesClient({ lang }: { lang: string }) {
  const [q, setQ] = useState('');
  const { data, isLoading, isError, error } = usePaymentDeadlineQuery(true);

  const rows = useMemo(() => {
    const list = data?.items ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (r) =>
        (r.description || '').toLowerCase().includes(term) ||
        (r.document || '').toLowerCase().includes(term) ||
        (r.type || '').toLowerCase().includes(term)
    );
  }, [data, q]);

  return (
    <main className="min-h-screen bg-gray-100" lang={lang} data-lang={lang}>
      <div className="mx-auto max-w-[1920px] px-4 pt-6 md:px-6 lg:px-8 2xl:px-10">
        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Scadenze Pagamento</h1>
          <div className="flex w-full max-w-xl items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Cerca per descrizione / documento / tipo…"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
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

        {/* ===== Desktop/Tablet: table (fixed height + sticky header) ===== */}
        {!isLoading && (
          <div className="hidden rounded-md border border-gray-200 bg-white sm:block">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="min-w-[980px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
                  <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                    <th className="w-44">Documento</th>
                    <th className="w-40">Data riferimento</th>
                    <th>Descrizione</th>
                    <th className="w-16 text-center">Stato</th> {/* NEW */}
                    <th className="w-40">Data scadenza</th>
                    <th className="w-32 text-right">Importo</th>
                    <th className="w-32 text-right">Totale</th>
                    <th className="w-24">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, idx) => {
                    const key = makeKey(r, idx, 'row');
                    const showStatus = !!r.total; // mimic v-if="item.Totale"
                    const isPositive = (r.total ?? 0) > 0;

                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium text-gray-900">{r.document ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-900">{dateLabel(r.referenceDate)}</td>
                        <td className="px-3 py-3 text-gray-900">{r.description || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          {showStatus ? (
                            <span
                              className={cn(
                                'inline-block h-2.5 w-2.5 rounded-full',
                                isPositive ? 'bg-green-500' : 'bg-red-500'
                              )}
                              aria-label={isPositive ? 'positivo' : 'negativo'}
                            />
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-gray-900">{dateLabel(r.dueDate)}</td>
                        <td className="px-3 py-3 text-right">{currency(r.amount)}</td>
                        <td className="px-3 py-3 text-right">{currency(r.total)}</td>
                        <td className="px-3 py-3 text-gray-900">{r.type || '—'}</td>
                      </tr>
                    );
                  })}

                  {!rows.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                        Nessun elemento trovato.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Mobile: cards ===== */}
        {!isLoading && (
          <div className="sm:hidden space-y-2">
            {rows.map((r, idx) => {
              const key = makeKey(r, idx, 'card');
              const showStatus = !!r.total;
              const isPositive = (r.total ?? 0) > 0;

              return (
                <div key={key} className="rounded-xl border bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {r.document ?? r.type ?? '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dateLabel(r.referenceDate)} → {dateLabel(r.dueDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showStatus ? (
                        <span
                          className={cn(
                            'inline-block h-2.5 w-2.5 rounded-full',
                            isPositive ? 'bg-green-500' : 'bg-red-500'
                          )}
                          aria-label={isPositive ? 'positivo' : 'negativo'}
                        />
                      ) : null}
                      <div className="text-sm font-semibold text-gray-900">{currency(r.amount)}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-700">{r.description || '—'}</div>
                  {r.total ? (
                    <div className="mt-1 text-xs text-gray-500">Totale: {currency(r.total)}</div>
                  ) : null}
                </div>
              );
            })}

            {!rows.length && (
              <div className="rounded-md border bg-white px-4 py-6 text-center text-sm text-gray-500">
                Nessun elemento trovato.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
