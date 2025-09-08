export type RawOrderListItem = {
  AnnoDocDefinitivo: number;
  CausaleDocDefinitivo: string;
  NumeroDocDefinitivo: number;
  DataRegistrazione: string; // "03/09/2025"
  DataConsegna: string;      // "03/09/2025"
  DescrizioneEstesaIndirizzo: string; // "VIA FIEGHI,1"
  CittaIndirizzo: string;            // "SALA CONSILINA"
  TotaliDocumentoQuantita: number[]; // first element = ordered total (net)
  StatoTestataOrdine: string;        // e.g. "NE"
  // ...many other fields (not needed for list)
};

export type OrdersListParams = {
  date_from: string;     // "04082025" (DDMMYYYY)
  date_to: string;       // "04092025"
  customer_code: string; // "9757"
  type: string;          // "T"
  address_code: string;  // "" or code
};

// What the UI table needs:
export type OrderSummary = {
  id: string;               // stable key: `${Causale}/${Numero}/${Anno}`
  destination: string;      // "VIA FIEGHI,1 - SALA CONSILINA"
  date_label: string;       // "03/09/2025"
  document: string;         // "OBU/162043"
  delivery_label: string;   // "03/09/2025"
  ordered_total: number;    // 291.55
  status_code: string;      // "NE"
  status_label: string;     // "Da evadere"
  doc_number: number;     // "${Numero}"
  cause: string;     // "${Causale}"
  doc_year: number;     // "${Anno}"
};
