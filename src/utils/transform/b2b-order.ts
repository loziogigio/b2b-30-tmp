// src/utils/transform/b2b-order.ts
export type RawOrderItem = {
  taglie: any[];
  id_riga: number;
  descrizione_articolo: string;
  articolo: string; // sku
  codice_interno_articolo: string;
  um: string | null; // unit
  descrizione_taglia: string | null;
  quantita: {
    ordinato: number;
    saldato: number;
    consegnato: number;
    residuo: number;
    evadibile: number;
  };
  valore: {
    ordinato: number;
    saldato: number;
    consegnato: number;
    residuo: number;
    evadibile: number;
  };
  netto: number; // unit price (pre-tax/net)
  decimali_prezzo: number;
  decimali_valore: number;
  image: string;
  link: string; // e.g. "/prodotto/529836"
};

export type RawOrderResponse = {
  success: boolean;
  message: {
    order_details: RawOrderItem[];
    causale: string; // "OBUI"
    numero_documento: string; // "162043"
    anno: string; // "2025"
    data_consegna: string; // "03/09/2025" (DD/MM/YYYY)
    data_registrazione: string; // "03/09/2025"
    indirizzo: string; // "VIA FIEGHI,1"
    citta: string; // "SALA CONSILINA"
    stato: string; // ""
    rif_cliente: number;
    type: string;
  };
};

// Friendly request shape
export type OrderParams = {
  doc_number: string; // NumeroDocDefinitivo
  cause: string; // CausaleDocDefinitivo
  doc_year: string; // AnnoDocDefinitivo
};

export type TransformedOrderItem = {
  id: number | string;
  name: string;
  image?: string;
  unit?: string;
  price: number; // unit price (from netto)
  quantity: number; // ordered qty
  sku: string;
  reviewUrl?: string; // product detail link if available
  delivered_in_quantity: number;
  ordered_in_quantity: number;
  delivered_in_price: number;
  ordered_in_price: number;
};

export type TransformedOrder = {
  id: string; // `${numero_documento}/${anno}`
  cause: string;
  doc_number: string;
  doc_year: string;
  tracking_number: string; // reusing numero_documento
  sub_total: number; // sum of item.price * item.quantity (net)
  discount: number; // 0 for now (no field in payload)
  delivery_fee: number; // 0 for now (no field in payload)
  tax: number; // 0 for now (no field in payload)
  total: number; // = sub_total (+fees -discount +tax) => same as sub_total
  created_at: string; // ISO date from data_registrazione
  shipping_address: {
    street_address: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
  billing_address: {
    street_address: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
  meta: {
    cause: string;
    year: string;
    delivery_date: string; // ISO
    registration_date: string; // ISO
  };
  items: TransformedOrderItem[];
};

function parseItalianDate(ddmmyyyy?: string): string | undefined {
  if (!ddmmyyyy) return undefined;
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return undefined;
  // Keep as UTC midnight to avoid TZ drift in UI
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`;
}

function toMoney(n?: number): number {
  return Number.isFinite(n as number) ? Number(n) : 0;
}

export function transformOrderItem(row: RawOrderItem): TransformedOrderItem {
  const qty = row.quantita?.ordinato ?? 0;
  const unitPrice = row.netto ?? 0;
  return {
    id: row.id_riga,
    name:
      row.descrizione_articolo || row.codice_interno_articolo || row.articolo,
    image: row.image || undefined,
    unit: row.um || undefined,
    price: toMoney(unitPrice),
    quantity: qty,
    sku: row.articolo,
    reviewUrl: row.link || undefined,
    delivered_in_quantity: row.quantita.consegnato,
    ordered_in_quantity: row.quantita.ordinato,
    delivered_in_price: row.valore.consegnato,
    ordered_in_price: row.valore.ordinato,
  };
}

export function transformOrder(raw: RawOrderResponse): TransformedOrder {
  const msg = raw.message;

  const items = (msg.order_details || []).map(transformOrderItem);
  const subTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const createdISO = parseItalianDate(msg.data_registrazione);
  const deliveryISO = parseItalianDate(msg.data_consegna);

  const addressLine = (msg.indirizzo || '').trim();
  const city = (msg.citta || '').trim();

  const baseAddr = {
    street_address: addressLine || '',
    city: city || '',
    state: '',
    zip: '',
    country: 'Italy',
  };

  return {
    id: `${msg.numero_documento}/${msg.anno}`,
    tracking_number: msg.numero_documento,
    sub_total: Number(subTotal.toFixed(2)),
    discount: 0,
    delivery_fee: 0,
    tax: 0,
    total: Number(subTotal.toFixed(2)),
    created_at: createdISO || new Date().toISOString(),
    cause: msg.causale,
    doc_number: msg.numero_documento,
    doc_year: msg.anno,
    shipping_address: { ...baseAddr },
    billing_address: { ...baseAddr },
    items,
    meta: {
      cause: msg.causale,
      year: msg.anno,
      delivery_date: deliveryISO || '',
      registration_date: createdISO || '',
    },
  };
}
