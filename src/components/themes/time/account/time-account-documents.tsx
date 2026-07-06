'use client';

import { useMemo, useState } from 'react';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import type { DocumentRow } from '@framework/documents/types-b2b-documents';
import { ERP_STATIC } from '@framework/utils/static';
import { lastMonthRange, toErpNumericDate } from '@utils/date-to-erp';
import {
  useDocumentsListQuery,
  useOpenDocumentAction,
  fetchDocumentLines,
  type DocumentActionKind,
} from '@framework/documents/fetch-documents-list';
import {
  fetchBarcodes,
  downloadDocumentLinesExcel,
  openDocumentLinesPrintWindow,
} from '@framework/documents/documents-export';
import {
  TimeCard,
  TimeIconBox,
  TimeStatusBadge,
} from './time-account-primitives';
import { IconFile, IconDownload } from './time-account-icons';

type Tab = 'F' | 'DDT';
type SortKey = 'destination' | 'date' | 'document' | 'number';

interface TimeAccountDocumentsProps {
  lang: string;
}

export default function TimeAccountDocuments({
  lang,
}: TimeAccountDocumentsProps) {
  const { t } = useTranslation(lang, 'common');
  const [tab, setTab] = useState<Tab>('F');
  const [query, setQuery] = useState('');
  const [{ from, to }, setRange] = useState(lastMonthRange());
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

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
      ...ERP_STATIC,
    },
    true,
  );

  const {
    mutate: openDoc,
    isPending,
    variables,
    error: actionError,
  } = useOpenDocumentAction();
  const keyFor = (r: DocumentRow, kind: DocumentActionKind) =>
    `${r.document}:${kind}`;
  const loadingKey = variables ? keyFor(variables.row, variables.kind) : null;
  const isDDT = tab === 'DDT';

  // Barcode-PDF / CSV: MyMB has no legacy hub here, so fetch the document's
  // article lines from the ERP on demand, enrich with EAN from PIM, then feed
  // the shared client-side generator (same as the default theme).
  const [exportBusy, setExportBusy] = useState<{
    doc: string;
    kind: 'pdf' | 'excel';
  } | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const exportLines = async (r: DocumentRow, kind: 'pdf' | 'excel') => {
    if (exportBusy) return;
    setExportBusy({ doc: r.document, kind });
    setExportErr(null);
    try {
      const lines = await fetchDocumentLines(r);
      if (!lines.length) {
        setExportErr(
          t('text-no-document-lines', {
            defaultValue: 'Nessuna riga disponibile per questo documento.',
          }),
        );
        return;
      }
      const withLines = { ...r, lines };
      const barcodes = await fetchBarcodes(lines.map((l) => l.entityCode));
      if (kind === 'excel') downloadDocumentLinesExcel(withLines, barcodes);
      else openDocumentLinesPrintWindow(withLines, barcodes);
    } catch {
      setExportErr(
        t('order-detail-error', {
          defaultValue: 'Impossibile generare il documento.',
        }),
      );
    } finally {
      setExportBusy(null);
    }
  };

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

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({
    k,
    label,
    className,
  }: {
    k: SortKey;
    label: string;
    className?: string;
  }) => (
    <th
      className={cn('cursor-pointer select-none', className)}
      onClick={() => handleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (
          <span className="text-[9px]">{sortAsc ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-5 font-[var(--font-body)]">
      {/* Toolbar */}
      <TimeCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Tab switcher */}
            <div className="inline-flex overflow-hidden rounded-[var(--radius-btn)] border border-[var(--time-gray-200)]">
              <button
                type="button"
                className={cn(
                  'px-4 py-2 text-xs font-bold transition-colors',
                  tab === 'F'
                    ? 'bg-[var(--time-red)] text-white'
                    : 'bg-white text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)]',
                )}
                onClick={() => setTab('F')}
              >
                {t('documents-tab-invoices', { defaultValue: 'Fatture' })}
              </button>
              <button
                type="button"
                className={cn(
                  'px-4 py-2 text-xs font-bold border-l border-[var(--time-gray-200)] transition-colors',
                  tab === 'DDT'
                    ? 'bg-[var(--time-red)] text-white'
                    : 'bg-white text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)]',
                )}
                onClick={() => setTab('DDT')}
              >
                {t('doc-type-ddt', { defaultValue: 'DDT' })}
              </button>
            </div>

            {/* Search */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('text-search-documents', {
                defaultValue: 'Cerca per destinazione / documento…',
              })}
              className="h-10 w-full sm:w-80 rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] px-3 text-[13px] font-[var(--font-body)] text-[var(--time-dark)] bg-[var(--time-gray-50)] focus:border-[var(--time-red)] focus:ring-2 focus:ring-[rgba(230,57,70,0.1)] focus:outline-none transition-colors"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-xs text-[var(--time-gray-500)]">
            <span>{t('text-from', { defaultValue: 'Da' })}</span>
            <input
              type="date"
              value={from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
              className="h-9 rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] px-2 text-[12px] font-[var(--font-body)]"
            />
            <span>{t('text-to', { defaultValue: 'A' })}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-9 rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] px-2 text-[12px] font-[var(--font-body)]"
            />
            <button
              type="button"
              onClick={() => setRange(lastMonthRange())}
              className="h-9 rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] px-3 text-[12px] font-semibold text-[var(--time-gray-600)] hover:border-[var(--time-dark)] transition-colors"
            >
              {t('text-reset', { defaultValue: 'Reset' })}
            </button>
          </div>
        </div>
      </TimeCard>

      {/* Alerts */}
      {isLoading && (
        <TimeCard className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/4 rounded bg-[var(--time-gray-100)]" />
            <div className="h-10 w-full rounded bg-[var(--time-gray-100)]" />
            <div className="h-10 w-full rounded bg-[var(--time-gray-100)]" />
          </div>
        </TimeCard>
      )}
      {isError && (
        <TimeCard className="p-4">
          <div className="rounded-[var(--radius-btn)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error?.message}
          </div>
        </TimeCard>
      )}
      {actionError && (
        <TimeCard className="p-4">
          <div className="rounded-[var(--radius-btn)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(actionError as Error).message}
          </div>
        </TimeCard>
      )}
      {exportErr && (
        <TimeCard className="p-4">
          <div className="rounded-[var(--radius-btn)] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {exportErr}
          </div>
        </TimeCard>
      )}

      {/* Table */}
      {!isLoading && (
        <TimeCard className="overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-[800px] w-full text-[13px] font-[var(--font-body)]">
              <thead className="sticky top-0 z-10 bg-[var(--time-gray-100)] text-[var(--time-gray-400)] border-b border-[var(--time-gray-200)]">
                <tr className="text-[10px] font-bold uppercase tracking-[0.06em]">
                  <SortHeader
                    k="destination"
                    label={t('documents-col-destination', {
                      defaultValue: 'Destinazione',
                    })}
                    className="w-[220px] px-[22px] py-3 text-left"
                  />
                  <SortHeader
                    k="date"
                    label={t('text-date', { defaultValue: 'Data' })}
                    className="w-28 px-3 py-3 text-left"
                  />
                  <SortHeader
                    k="document"
                    label={t('deadlines-col-document', {
                      defaultValue: 'Documento',
                    })}
                    className="w-40 px-3 py-3 text-left"
                  />
                  <SortHeader
                    k="number"
                    label={t('documents-col-number', {
                      defaultValue: 'Numero',
                    })}
                    className="w-24 px-3 py-3 text-right"
                  />
                  {!isDDT && (
                    <th className="w-16 px-3 py-3 text-center">PDF</th>
                  )}
                  <th className="w-20 px-3 py-3 text-center">
                    {t('documents-col-barcode', { defaultValue: 'Barcode' })}
                  </th>
                  {!isDDT && (
                    <th className="w-16 px-3 py-3 text-center">CSV</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pdfLoading =
                    loadingKey === keyFor(r, 'pdf') && isPending;
                  const bcLoading =
                    exportBusy?.doc === r.document &&
                    exportBusy?.kind === 'pdf';
                  const csvLoading =
                    exportBusy?.doc === r.document &&
                    exportBusy?.kind === 'excel';

                  return (
                    <tr
                      key={r.document}
                      className="border-b border-[var(--time-gray-50)] hover:bg-[var(--time-gray-50)] transition-colors"
                    >
                      <td className="px-[22px] py-3 text-[var(--time-dark)]">
                        {r.destination}
                      </td>
                      <td className="px-3 py-3 text-[var(--time-gray-500)] text-[12px]">
                        {r.date_label}
                      </td>
                      <td className="px-3 py-3 font-bold text-[var(--time-dark)] font-[var(--font-mono)] text-[12px]">
                        {r.document}
                      </td>
                      <td className="px-3 py-3 text-right text-[var(--time-gray-500)] tabular-nums">
                        {r.number}
                      </td>
                      {!isDDT && (
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openDoc({ kind: 'pdf', row: r })}
                            disabled={pdfLoading}
                            className="rounded-[var(--radius-btn)] px-2 py-1 text-[11px] font-semibold text-[var(--time-red)] hover:bg-[rgba(230,57,70,0.06)] disabled:opacity-50"
                          >
                            {pdfLoading ? '...' : 'PDF'}
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => exportLines(r, 'pdf')}
                          disabled={bcLoading}
                          className="rounded-[var(--radius-btn)] px-2 py-1 text-[11px] font-semibold text-[var(--time-red)] hover:bg-[rgba(230,57,70,0.06)] disabled:opacity-50"
                        >
                          {bcLoading ? '...' : 'PDF▮▮'}
                        </button>
                      </td>
                      {!isDDT && (
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => exportLines(r, 'excel')}
                            disabled={csvLoading}
                            className="rounded-[var(--radius-btn)] px-2 py-1 text-[11px] font-semibold text-[var(--time-red)] hover:bg-[rgba(230,57,70,0.06)] disabled:opacity-50"
                          >
                            {csvLoading ? '...' : 'CSV'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {rows.length === 0 && !isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-sm text-[var(--time-gray-400)]"
                    >
                      {t('text-no-documents', {
                        defaultValue: 'Nessun documento trovato',
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TimeCard>
      )}
    </div>
  );
}
