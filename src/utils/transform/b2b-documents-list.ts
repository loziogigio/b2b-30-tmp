// src/utils/transform/b2b-documents-list.ts
import {
  RawDocumentItem,
  DocumentRow,
} from '@framework/documents/types-b2b-documents';

function dmyToISO(dmy?: string): string {
  if (!dmy) return '';
  const [d, m, y] = dmy.split('/');
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';
}

/**
 * Build the gated stream URL for an invoice's fiscal PDF (time theme). Points at
 * /api/erp/invoice-pdf, which re-verifies ownership server-side and streams the
 * ArxivarIX PDF. Uses the identifiers already present on the row (scope/year/
 * number_raw) plus the caller-supplied customer/address codes.
 */
export function buildInvoicePdfUrl(args: {
  customerCode: string;
  addressCode?: string;
  row: DocumentRow;
}): string {
  const p = new URLSearchParams();
  p.set('customer_code', args.customerCode);
  if (args.addressCode) p.set('address_code', args.addressCode);
  p.set('year', String(args.row.year));
  p.set('number', String(args.row.number_raw));
  p.set('cause', 'VEN');
  return `/api/erp/invoice-pdf?${p.toString()}`;
}

export function transformDocumentsList(rows: RawDocumentItem[]): DocumentRow[] {
  return (rows || []).map((r) => ({
    destination: r.destination ?? '',
    dateISO: dmyToISO(r.date),
    date_label: r.date ?? '',
    document: r.document ?? '',
    doc_type: r.doc_type,
    number: String(r.number ?? ''),

    scope: r.scope,
    year: r.year,
    number_raw: r.number,
    type_bar_code: r.type_bar_code,

    pdf: undefined,
    barcodePdf: undefined,
    csv: undefined,
  }));
}
