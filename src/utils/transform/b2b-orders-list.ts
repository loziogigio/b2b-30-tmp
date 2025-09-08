// src/utils/transform/b2b-orders-list.ts
import { RawOrderListItem, OrderSummary } from '@framework/order/types-b2b-orders-list';

const STATUS_MAP: Record<string, string> = {
  IA: 'In accettazione',
  NE: 'Da evadere',
  EV: 'Evaso',
  PR: 'Parzialmente evaso',
  AN: 'Annullato',
  // add other codes when you meet them
};

function toLabelOrFallback(dmy?: string): string {
  // backend already gives DD/MM/YYYY; keep as-is for the table
  return dmy || '';
}

function money(n?: number): number {
  return Number.isFinite(n as number) ? Number(n) : 0;
}

export function transformOrderSummary(row: RawOrderListItem): OrderSummary {
  const destination = [
    (row.DescrizioneEstesaIndirizzo || '').trim(),
    (row.CittaIndirizzo || '').trim(),
  ]
    .filter(Boolean)
    .join(' - ');

  const ordered = Array.isArray(row.TotaliDocumentoQuantita) && row.TotaliDocumentoQuantita.length
    ? row.TotaliDocumentoQuantita[0]
    : 0;

  const doc = `${row.CausaleDocDefinitivo}/${row.NumeroDocDefinitivo}`;

  const id = `${row.CausaleDocDefinitivo}/${row.NumeroDocDefinitivo}/${row.AnnoDocDefinitivo}`;

  return {
    id,
    destination,
    date_label: toLabelOrFallback(row.DataRegistrazione),
    document: doc,
    delivery_label: toLabelOrFallback(row.DataConsegna),
    ordered_total: money(ordered),
    status_code: row.StatoTestataOrdine || '',
    status_label: STATUS_MAP[row.StatoTestataOrdine || ''] || (row.StatoTestataOrdine || ''),
    cause:row.CausaleDocDefinitivo|| '',
    doc_number:row.NumeroDocDefinitivo,
    doc_year:row.AnnoDocDefinitivo
  };
}

export function transformOrdersList(rows: RawOrderListItem[]): OrderSummary[] {
  return (rows || []).map(transformOrderSummary);
}
