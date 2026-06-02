import type { DocumentRow } from '@framework/documents/types-b2b-documents';

type VincDest = {
  code?: string;
  label?: string;
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
};

export interface VincDeliveryNoteRecord {
  _id: string;
  data: {
    numero_ddt?: string;
    numero_documento?: string;
    data?: string;
    data_consegna?: string | null;
    stato?: string;
    destinazione?: VincDest;
    totale?: number;
    pdf_url?: string;
    pdf_barcode_url?: string;
  };
}

export interface VincInvoiceRecord {
  _id: string;
  data: {
    numero_fattura?: string;
    numero_documento?: string;
    data?: string;
    data_scadenza?: string | null;
    tipo?: string;
    stato_pagamento?: string;
    destinazione?: VincDest;
    totale?: number;
    pdf_url?: string;
    pdf_barcode_url?: string;
    csv_url?: string;
  };
}

/** ISO ("2026-05-28T…" or "2026-05-28") → "DD/MM/YYYY". '' on empty. */
export function isoToDmy(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

/** DDMMYYYY → YYYY-MM-DD; undefined for malformed input. */
export function ddmmyyyyToIso(s?: string): string | undefined {
  if (!s || !/^\d{8}$/.test(s)) return undefined;
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`;
}

function destinationOf(a?: VincDest): string {
  if (!a) return '';
  if (a.label) return a.label;
  return [a.street, a.city].filter(Boolean).join(' - ');
}

/**
 * Return the value only if it's a real http(s) URL; otherwise undefined.
 * Hides legacy non-URL fallback strings (e.g. "BC/2026/9345/D") so they never
 * render as a broken link. (Default-theme VINC documents only.)
 */
function httpUrl(u?: string): string | undefined {
  return u && /^https?:\/\//i.test(u) ? u : undefined;
}

export function vincDeliveryNoteToRow(rec: VincDeliveryNoteRecord): DocumentRow {
  const d = rec.data ?? {};
  return {
    destination: destinationOf(d.destinazione),
    dateISO: (d.data ?? '').slice(0, 10),
    date_label: isoToDmy(d.data),
    document: d.numero_documento || d.numero_ddt || '',
    doc_type: 'DDT',
    number: String(d.numero_ddt ?? d.numero_documento ?? ''),
    scope: '',
    year: 0,
    number_raw: 0,
    type_bar_code: '',
    pdf: httpUrl(d.pdf_url),
    barcodePdf: httpUrl(d.pdf_barcode_url),
  };
}

export function vincInvoiceToRow(rec: VincInvoiceRecord): DocumentRow {
  const d = rec.data ?? {};
  return {
    destination: destinationOf(d.destinazione),
    dateISO: (d.data ?? '').slice(0, 10),
    date_label: isoToDmy(d.data),
    document: d.numero_documento || d.numero_fattura || '',
    doc_type: 'F',
    number: String(d.numero_fattura ?? d.numero_documento ?? ''),
    scope: '',
    year: 0,
    number_raw: 0,
    type_bar_code: '',
    pdf: httpUrl(d.pdf_url),
    barcodePdf: httpUrl(d.pdf_barcode_url),
    csv: httpUrl(d.csv_url),
  };
}

export type DirectKind = 'pdf' | 'barcode' | 'csv';

/** The VINC-provided document URL for an action kind, if the row carries it. */
export function pickDirectUrl(
  kind: DirectKind,
  row: DocumentRow,
): string | undefined {
  return kind === 'pdf' ? row.pdf : kind === 'barcode' ? row.barcodePdf : row.csv;
}
