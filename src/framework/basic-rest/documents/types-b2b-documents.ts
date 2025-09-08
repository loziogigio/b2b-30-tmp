// src/framework/documents/types-b2b-documents.ts
export type RawDocumentItem = {
  destination: string;
  date: string;               // "21/08/2025"
  document: string;           // "F/2025/90540"
  doc_type: 'F' | 'DDT';
  invoice_number?: number;
  taxable?: number;
  total?: number;
  scope: string;              // "F"
  year: number;               // 2025
  number: number;             // 90540
  type?: string;              // "105"
  type_bar_code: string;      // "I"
  bar_code_request?: string;  // "F/2025/90540/D"
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
