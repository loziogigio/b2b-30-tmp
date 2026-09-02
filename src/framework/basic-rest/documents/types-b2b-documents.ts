// src/framework/documents/types-b2b-documents.ts
export type RawDocumentItem = {
  destination: string;
  date: string; // "21/08/2025"
  document: string; // "F/2025/90540"
  doc_type: 'F' | 'DDT';
  invoice_number?: number;
  taxable?: number;
  total?: number;
  scope: string; // "F"
  year: number; // 2025
  number: number; // 90540
  type?: string; // "105"
  type_bar_code: string; // "I"
  bar_code_request?: string; // "F/2025/90540/D"
};

/** Back-reference from an invoice line to its source DDT / order. */
export type DocumentLineRef = {
  causale: string; // "BC" (DDT), "OC" (order), "FA" (acconto)
  ycale: number; // year, e.g. 2026
  nprot: number; // protocol number
  nriga: number; // line within that source document
};

/**
 * A single article line of an invoice (F) or DDT. Sourced from the VINC
 * data-model `data.items[]` (default theme only). `entityCode` is the ERP
 * article code used to look up the EAN/barcode in PIM.
 */
export type DocumentLine = {
  lineNumber: number;
  sku: string;
  entityCode: string;
  name: string;
  quantity: number;
  uom: string;
  /** Effective unit price — the line net divided by the quantity. */
  unitPrice: number;
  /**
   * The ERP's own unit price, the one `discounts` are applied to
   * (MyMB `PrezzaturaImputata.Prezzo`). Equals `unitPrice` on an undiscounted
   * line; absent when the ERP sends no pricing block.
   */
  listPrice?: number;
  vatRate: number;
  lineTotal: number;
  /** Line % discounts in ERP order (MyMB `ScontoORicarica1..6`). */
  discounts?: number[];
  discountsJson?: string; // JSON array of % discounts, e.g. "[5, 2.5]"
  ddtRef?: DocumentLineRef; // invoice line generated from a DDT
  orderRef?: DocumentLineRef; // invoice line generated from an order
};

export type DocumentRow = {
  destination: string;
  dateISO: string;
  date_label: string;
  document: string;
  doc_type: 'F' | 'DDT';
  number: string;

  // per le azioni click
  scope: string;
  year: number;
  number_raw: number;
  type_bar_code: string;

  // opzionali (se vuoi link diretti precalcolati)
  pdf?: string;
  barcodePdf?: string;
  csv?: string;

  // article lines (default-theme VINC documents only)
  lines?: DocumentLine[];
};

/**  (payload to ERP) */
export type DocumentsListParams = {
  /** format DDMMYYYY, es. "08082025" */
  date_from: string;
  /** Forformatmato DDMMYYYY, es. "09082025" */
  date_to: string;
  /** Tab: 'F' (fatture) | 'DDT' | '' */
  type?: 'F' | 'DDT' | '';
  customer_code: string;
  ext_call?: boolean;
  address_code?: string;
};
