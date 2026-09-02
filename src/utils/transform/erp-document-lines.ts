// Map MyMB document line rows (GetRigheDDTConInfo / GetRigheFATTConInfo →
// ListaRigheDDTConInfo) into the DocumentLine[] the per-line barcode/CSV
// export (documents-export.ts) consumes. Shape captured live from DFL for
// DDT F/2026/75208: `Valore` is a [net, vat, gross] triple, unit price nests
// in `PrezzaturaImputata`, `CodiceInternoArticolo` is the PIM entity code.
// The six `ScontoORicarica*` percentages sit on the row itself (the `*T`
// twins are the header discounts already reported in `ScontiDiTestata`).
import type { DocumentLine } from '@framework/documents/types-b2b-documents';

export type MyMbDocRow = {
  IdRiga?: number;
  CodiceArticolo?: string;
  CodiceInternoArticolo?: string;
  DescrizioneArticolo?: string;
  UMArticolo?: string | null;
  Quantita?: number;
  Valore?: number[]; // [net, vat, gross]
  PrezzaturaImputata?: { Prezzo?: number; IVAPercentuale?: number } | null;
  ScontoORicarica1?: number;
  ScontoORicarica2?: number;
  ScontoORicarica3?: number;
  ScontoORicarica4?: number;
  ScontoORicarica5?: number;
  ScontoORicarica6?: number;
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? Number(n) : 0;
}

/** First element (net amount) of a MyMB `[net, vat, gross]` value triple. */
function netOf(v: number[] | undefined): number {
  return Array.isArray(v) ? num(v[0]) : 0;
}

/** The six line discount percentages, in ERP order, zeros included. */
function discountsOf(r: MyMbDocRow): number[] {
  return [
    r.ScontoORicarica1,
    r.ScontoORicarica2,
    r.ScontoORicarica3,
    r.ScontoORicarica4,
    r.ScontoORicarica5,
    r.ScontoORicarica6,
  ].map(num);
}

function rowToLine(r: MyMbDocRow): DocumentLine {
  const qty = num(r.Quantita);
  const lineNet = netOf(r.Valore);
  const unitPrice =
    qty > 0 && lineNet ? lineNet / qty : num(r.PrezzaturaImputata?.Prezzo);
  const code = r.CodiceArticolo ?? r.CodiceInternoArticolo ?? '';
  const listPrice = r.PrezzaturaImputata?.Prezzo;
  return {
    lineNumber: num(r.IdRiga),
    sku: code,
    // entity_code drives the PIM EAN lookup (fetchBarcodes).
    entityCode: r.CodiceInternoArticolo ?? code,
    name: (r.DescrizioneArticolo ?? '').trim(),
    quantity: qty,
    uom: r.UMArticolo ?? '',
    unitPrice,
    listPrice: listPrice == null ? undefined : num(listPrice),
    vatRate: num(r.PrezzaturaImputata?.IVAPercentuale),
    lineTotal: lineNet,
    discounts: discountsOf(r),
  };
}

/** Map raw ERP document rows into DocumentLine[] (skips empty rows). */
export function mapErpDocRowsToLines(
  rows: MyMbDocRow[] | null | undefined,
): DocumentLine[] {
  return (Array.isArray(rows) ? rows : []).map(rowToLine);
}
