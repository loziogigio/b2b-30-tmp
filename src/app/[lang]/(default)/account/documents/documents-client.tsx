// app/[lang]/account/documents/documents-client.tsx
'use client';

import { useMemo, useState } from 'react';
import cn from 'classnames';
import type { DocumentRow } from '@framework/documents/types-b2b-documents';
import { ERP_STATIC } from '@framework/utils/static';
import { lastMonthRange, toErpNumericDate } from '@utils/date-to-erp';
import { useDocumentsListQuery } from '@framework/documents/fetch-documents-list';
import {
  fetchBarcodes,
  downloadDocumentLinesExcel,
  openDocumentLinesPrintWindow,
} from '@framework/documents/documents-export';
import { BsFiletypePdf, BsFiletypeXlsx } from 'react-icons/bs';
import { ImSpinner2 } from 'react-icons/im';

type Tab = 'F' | 'DDT';
type SortKey = 'destination' | 'date' | 'document' | 'number';

export default function DocumentsClient({ lang }: { lang: string }) {
  const [tab, setTab] = useState<Tab>('F');
  const [query, setQuery] = useState('');
  const [{ from, to }, setRange] = useState(lastMonthRange());
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [busy, setBusy] = useState<{
    doc: string;
    kind: 'excel' | 'pdf';
  } | null>(null);

  // Enrich the document's lines with EAN/barcode (by entity_code) then export.
  const exportLines = async (r: DocumentRow, kind: 'excel' | 'pdf') => {
    if (!r.lines?.length || busy) return;
    setBusy({ doc: r.document, kind });
    try {
      const barcodes = await fetchBarcodes(r.lines.map((l) => l.entityCode));
      if (kind === 'excel')
        downloadDocumentLinesExcel(r, barcodes, undefined, {
          customerCode: ERP_STATIC.customer_code,
        });
      else openDocumentLinesPrintWindow(r, barcodes);
    } finally {
      setBusy(null);
    }
  };

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useDocumentsListQuery(
    {
      date_from: toErpNumericDate(from),
      date_to: toErpNumericDate(to),
      type: tab,
      ...ERP_STATIC, // { customer_code, ext_call, address_code }
    },
    true,
  );

  const isDDT = tab === 'DDT';
  // DDT: …PDF, Codice a barre PDF (7). Fatture: …+CSV (8).
  const emptyColSpan = isDDT ? 7 : 8;

  // Default-theme documents come from VINC and carry direct document URLs
  // (r.pdf / r.barcodePdf / r.csv). Render each as a link only when present.
  const docLink = (href: string | undefined, label: string) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
      >
        {label}
      </a>
    ) : (
      <span className="text-gray-300">—</span>
    );

  // A single per-document line-export icon (Excel or Barcode PDF).
  const exportIcon = (r: DocumentRow, kind: 'excel' | 'pdf') => {
    if (!r.lines?.length) return null;
    const docBusy = busy?.doc === r.document;
    const thisBusy = docBusy && busy?.kind === kind;
    const Icon = kind === 'excel' ? BsFiletypeXlsx : BsFiletypePdf;
    const color = kind === 'excel' ? 'text-emerald-600' : 'text-red-600';
    return (
      <button
        type="button"
        onClick={() => exportLines(r, kind)}
        disabled={docBusy}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50',
          docBusy && 'cursor-not-allowed opacity-60',
        )}
        title={
          kind === 'excel'
            ? 'Esporta righe in Excel (articolo, barcode, quantità, importi, sconti)'
            : 'Esporta righe in PDF con barcode'
        }
      >
        {thisBusy ? (
          <ImSpinner2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />
        )}
        <span className="sr-only">
          {kind === 'excel' ? 'Esporta Excel' : 'Esporta Barcode PDF'}
        </span>
      </button>
    );
  };

  // One export icon per cell, or "—" when the document carries no lines.
  const exportCell = (r: DocumentRow, kind: 'excel' | 'pdf') =>
    r.lines?.length ? (
      <span className="inline-flex justify-center">{exportIcon(r, kind)}</span>
    ) : (
      <span className="text-gray-300">—</span>
    );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (data as DocumentRow[]).filter(
      (r) =>
        !q ||
        r.destination.toLowerCase().includes(q) ||
        r.document.toLowerCase().includes(q) ||
        r.number.toLowerCase().includes(q),
    );

    list.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortKey) {
        case 'destination':
          return a.destination.localeCompare(b.destination) * dir;
        case 'document':
          return a.document.localeCompare(b.document) * dir;
        case 'number':
          return (Number(a.number) - Number(b.number)) * dir;
        case 'date':
        default:
          return (
            (new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()) *
            dir
          );
      }
    });
    return list;
  }, [data, query, sortKey, sortAsc]);

  const sortBtn = (key: SortKey, label: React.ReactNode, extraClass = '') => (
    <th
      className={cn('cursor-pointer select-none', extraClass)}
      onClick={() =>
        key === sortKey
          ? setSortAsc(!sortAsc)
          : (setSortKey(key), setSortAsc(false))
      }
      aria-sort={
        sortKey === key ? (sortAsc ? 'ascending' : 'descending') : 'none'
      }
      title="Ordina"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key ? (
          <span className="text-xs">{sortAsc ? '▲' : '▼'}</span>
        ) : null}
      </span>
    </th>
  );

  return (
    <main className="min-h-screen bg-gray-100" lang={lang} data-lang={lang}>
      <div className="mx-auto w-full px-4">
        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex overflow-hidden rounded-md border">
              <button
                className={cn(
                  'px-3 py-2 text-sm font-semibold',
                  tab === 'F'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50',
                )}
                onClick={() => setTab('F')}
              >
                Fatture
              </button>
              <button
                className={cn(
                  'px-3 py-2 text-sm font-semibold border-l',
                  tab === 'DDT'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50',
                )}
                onClick={() => setTab('DDT')}
              >
                DDT
              </button>
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per destinazione / documento / numero…"
              className="h-10 w-full sm:w-96 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Da</span>
            <input
              type="date"
              value={from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
              className="h-10 rounded-md border border-gray-300 px-2"
            />
            <span className="text-gray-600">A</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-10 rounded-md border border-gray-300 px-2"
            />
            <button
              onClick={() => setRange(lastMonthRange())}
              className="h-10 rounded-md border px-3 text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Alerts */}
        {isLoading && (
          <div className="mb-2 rounded-md border bg-white px-4 py-3 text-sm text-gray-600">
            Caricamento documenti…
          </div>
        )}
        {isError && (
          <div className="mb-2 rounded-md border bg-red-50 px-4 py-3 text-sm text-red-700">
            Errore: {error?.message}
          </div>
        )}

        {/* ===== Desktop/Tablet: Tabella ===== */}
        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 bg-white overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-[1040px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-200 text-gray-800 border-b border-gray-300">
                <tr>
                  {sortBtn(
                    'destination',
                    'Destinazione',
                    'w-[260px] px-4 py-3 text-left font-semibold',
                  )}
                  {sortBtn(
                    'date',
                    'Data',
                    'w-36 px-4 py-3 text-left font-semibold border-l border-gray-300',
                  )}
                  {sortBtn(
                    'document',
                    'Documento',
                    'w-44 px-4 py-3 text-left font-semibold border-l border-gray-300',
                  )}
                  <th className="w-24 px-4 py-3 text-left font-semibold border-l border-gray-300">
                    Tipo
                  </th>
                  {sortBtn(
                    'number',
                    'Numero',
                    'w-28 px-4 py-3 text-right font-semibold border-l border-gray-300',
                  )}
                  <th className="w-20 px-4 py-3 text-center font-semibold border-l border-gray-300">
                    PDF
                  </th>
                  <th className="w-36 px-4 py-3 text-center font-semibold border-l border-gray-300">
                    Codice a barre PDF
                  </th>
                  {!isDDT && (
                    <th className="w-20 px-4 py-3 text-center font-semibold border-l border-gray-300">
                      CSV
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.document}
                    className="hover:bg-gray-50 border-b border-gray-100"
                  >
                    <td className="px-4 py-3 text-gray-900">{r.destination}</td>
                    <td className="px-4 py-3 text-gray-900 border-l border-gray-100">
                      {r.date_label}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 border-l border-gray-100">
                      {r.document}
                    </td>
                    <td className="px-4 py-3 text-gray-700 border-l border-gray-100">
                      {r.doc_type}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 border-l border-gray-100">
                      {r.number}
                    </td>

                    <td className="px-4 py-3 text-center border-l border-gray-100">
                      {docLink(r.pdf, 'PDF')}
                    </td>

                    <td className="px-4 py-3 text-center border-l border-gray-100">
                      {exportCell(r, 'pdf')}
                    </td>

                    {!isDDT && (
                      <td className="px-4 py-3 text-center border-l border-gray-100">
                        {exportCell(r, 'excel')}
                      </td>
                    )}
                  </tr>
                ))}

                {!isLoading && !rows.length && (
                  <tr>
                    <td
                      colSpan={emptyColSpan}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      Nessun documento trovato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== Mobile: Cards ===== */}
        <div className="sm:hidden space-y-2">
          {rows.map((r) => {
            const mLink = (href: string | undefined, label: string) =>
              href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-3 py-1.5 text-sm text-red-600"
                >
                  {label}
                </a>
              ) : null;

            return (
              <div
                key={r.document}
                className="rounded-xl border bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {r.document}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.date_label} • {r.doc_type} • n. {r.number}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  {r.destination}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {mLink(r.pdf, 'PDF')}
                  {!isDDT && exportIcon(r, 'excel')}
                  {exportIcon(r, 'pdf')}
                </div>
              </div>
            );
          })}

          {!isLoading && !rows.length && (
            <div className="rounded-md border bg-white px-4 py-6 text-center text-sm text-gray-500">
              Nessun documento trovato.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
