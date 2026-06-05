import type {
  DocumentRow,
  DocumentLine,
  DocumentLineRef,
} from '@framework/documents/types-b2b-documents';

/** Raw article line as stored on the VINC data-model `data.items[]`. */
type RawDocLineRef = {
  causale?: string;
  ycale?: number;
  nprot?: number;
  nriga?: number;
};
type RawDocLine = {
  line_number?: number;
  sku?: string;
  entity_code?: string;
  name?: string;
  quantity?: number;
  uom?: string;
  unit_price?: number;
  vat_rate?: number;
  line_total?: number;
  discounts_json?: string;
  ddt_ref?: RawDocLineRef;
  order_ref?: RawDocLineRef;
};

function mapRef(r?: RawDocLineRef): DocumentLineRef | undefined {
  if (!r || r.nprot == null) return undefined;
  return {
    causale: String(r.causale ?? ''),
    ycale: Number(r.ycale ?? 0),
    nprot: Number(r.nprot ?? 0),
    nriga: Number(r.nriga ?? 0),
  };
}

/** Map raw `data.items[]` (if present) into typed DocumentLine[]. */
export function mapDocumentLines(
  items?: RawDocLine[],
): DocumentLine[] | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  return items.map((it) => ({
    lineNumber: Number(it.line_number ?? 0),
    sku: String(it.sku ?? ''),
    entityCode: String(it.entity_code ?? it.sku ?? ''),
    name: String(it.name ?? ''),
    quantity: Number(it.quantity ?? 0),
    uom: String(it.uom ?? ''),
    unitPrice: Number(it.unit_price ?? 0),
    vatRate: Number(it.vat_rate ?? 0),
    lineTotal: Number(it.line_total ?? 0),
    discountsJson: it.discounts_json,
    ddtRef: mapRef(it.ddt_ref),
    orderRef: mapRef(it.order_ref),
  }));
}

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
    items?: RawDocLine[];
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
    items?: RawDocLine[];
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

/** Same-origin broker link for a document; gated on the real file existing. */
function brokerDocUrl(
  model: 'delivery_note' | 'invoice',
  id: string,
  kind: 'pdf' | 'barcode' | 'csv',
  realFileUrl?: string,
): string | undefined {
  if (!httpUrl(realFileUrl) || !id) return undefined;
  return `/api/profile/document/${model}/${encodeURIComponent(id)}?kind=${kind}`;
}

export function vincDeliveryNoteToRow(
  rec: VincDeliveryNoteRecord,
): DocumentRow {
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
    pdf: brokerDocUrl('delivery_note', rec._id, 'pdf', d.pdf_url),
    barcodePdf: brokerDocUrl(
      'delivery_note',
      rec._id,
      'barcode',
      d.pdf_barcode_url,
    ),
    lines: mapDocumentLines(d.items),
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
    pdf: brokerDocUrl('invoice', rec._id, 'pdf', d.pdf_url),
    barcodePdf: brokerDocUrl('invoice', rec._id, 'barcode', d.pdf_barcode_url),
    csv: brokerDocUrl('invoice', rec._id, 'csv', d.csv_url),
    lines: mapDocumentLines(d.items),
  };
}

export type DirectKind = 'pdf' | 'barcode' | 'csv';

/** The VINC-provided document URL for an action kind, if the row carries it. */
export function pickDirectUrl(
  kind: DirectKind,
  row: DocumentRow,
): string | undefined {
  return kind === 'pdf'
    ? row.pdf
    : kind === 'barcode'
      ? row.barcodePdf
      : row.csv;
}
