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
