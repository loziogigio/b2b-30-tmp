// Build the order-detail payload (RawOrderResponse, the shape transformOrder
// consumes) from raw MyMB data: an order testata (GetTestateConInfoConsegna)
// plus its cart rows (GetRigheCarrello → ListaRighe). MyMB has no single-order
// detail endpoint, so detail = testata (header) + the testata's IDCarrello rows.
import type { RawOrderResponse, RawOrderItem } from './b2b-order';

/** Subset of GetTestateConInfoConsegna testata fields we read. */
export type MyMbTestata = {
  CausaleDocDefinitivo?: string;
  NumeroDocDefinitivo?: number | string;
  AnnoDocDefinitivo?: number | string;
  DataConsegna?: string;
  DataRegistrazione?: string;
  DescrizioneEstesaIndirizzo?: string;
  CittaIndirizzo?: string;
  StatoTestataOrdine?: string;
  IDCarrello?: number | string;
};

/** Subset of GetRigheCarrello → ListaRighe row fields we read. */
export type MyMbRiga = {
  IdRiga?: number;
  CodiceArticolo?: string;
  CodiceInternoArticolo?: string;
  DescrizioneArticolo?: string;
  DescrizioneTaglia?: string | null;
  UMArticolo?: string | null;
  QuantitaImputata?: number;
  Valore?: number; // line net total
  PrezzaturaImputata?: { Prezzo?: number } | null;
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? Number(n) : 0;
}

function rigaToOrderItem(r: MyMbRiga): RawOrderItem {
  const ordered = num(r.QuantitaImputata);
  const lineNet = num(r.Valore);
  // `Valore` is the line net total; derive the unit net. Fall back to the
  // imputed gross unit price when quantity is missing.
  const unitNet =
    ordered > 0 ? lineNet / ordered : num(r.PrezzaturaImputata?.Prezzo);

  return {
    taglie: [],
    id_riga: num(r.IdRiga),
    descrizione_articolo: (r.DescrizioneArticolo ?? '').trim(),
    articolo: r.CodiceArticolo ?? '',
    codice_interno_articolo: r.CodiceInternoArticolo ?? r.CodiceArticolo ?? '',
    um: r.UMArticolo ?? null,
    descrizione_taglia: r.DescrizioneTaglia ?? null,
    // GetRigheCarrello only carries the ordered quantity; per-line delivery
    // breakdown isn't available from this source, so residuo == ordinato.
    quantita: {
      ordinato: ordered,
      saldato: 0,
      consegnato: 0,
      residuo: ordered,
      evadibile: ordered,
    },
    valore: {
      ordinato: lineNet,
      saldato: 0,
      consegnato: 0,
      residuo: lineNet,
      evadibile: lineNet,
    },
    netto: unitNet,
    decimali_prezzo: 2,
    decimali_valore: 2,
    image: '',
    link: '',
  };
}

export function buildOrderDetailResponse(
  testata: MyMbTestata | null | undefined,
  righe: MyMbRiga[] | null | undefined,
): RawOrderResponse {
  const rows = Array.isArray(righe) ? righe : [];
  return wrapOrderDetail(testata, rows.map(rigaToOrderItem));
}

/**
 * Row from GetRigheConInfoConsegna → ListaRigheConInfoConsegna (shape
 * captured live from MyMB for order B05/15199938/2026). Unlike
 * GetRigheCarrello these rows come straight off the ERP document — they
 * exist for historical orders that never had a web cart — and carry the
 * per-line delivery breakdown. The `Valore*` fields are `[net, vat, …]`
 * triples; the unit price sits in `PrezzaturaImputata` like cart rows.
 */
export type MyMbRigaConInfo = {
  IdRiga?: number;
  CodiceArticolo?: string;
  CodiceInternoArticolo?: string;
  DescrizioneArticolo?: string;
  DescrizioneTaglia?: string | null;
  UMArticolo?: string | null;
  Quantita?: number;
  QuantitaSaldata?: number;
  QuantitaBollettata?: number;
  QuantitaResidua?: number;
  QuantitaEvadibile?: number;
  Valore?: number[]; // [net, vat, ...] line totals
  ValoreQuantitaSaldata?: number[];
  ValoreQuantitaBollettata?: number[];
  ValoreQuantitaResidua?: number[];
  ValoreQuantitaEvadibile?: number[];
  PrezzaturaImputata?: {
    Prezzo?: number;
    ValutaNumeroDecimaliXPrezzo?: number;
    ValutaNumeroDecimaliXValore?: number;
  } | null;
};

/** First element (net amount) of a MyMB `[net, vat, …]` value triple. */
function netOf(v: number[] | undefined): number {
  return Array.isArray(v) ? num(v[0]) : 0;
}

function rigaConInfoToOrderItem(r: MyMbRigaConInfo): RawOrderItem {
  const ordered = num(r.Quantita);
  const lineNet = netOf(r.Valore);
  // Prefer deriving the unit net from the line total (consistent with the
  // cart-rows mapper); fall back to the imputed unit price.
  const unitNet =
    ordered > 0 && lineNet
      ? lineNet / ordered
      : num(r.PrezzaturaImputata?.Prezzo);

  return {
    taglie: [],
    id_riga: num(r.IdRiga),
    descrizione_articolo: (r.DescrizioneArticolo ?? '').trim(),
    articolo: r.CodiceArticolo ?? '',
    codice_interno_articolo: r.CodiceInternoArticolo ?? r.CodiceArticolo ?? '',
    um: r.UMArticolo ?? null,
    descrizione_taglia: r.DescrizioneTaglia ?? null,
    quantita: {
      ordinato: ordered,
      saldato: num(r.QuantitaSaldata),
      // "Bollettata" = on a delivery note, the closest MyMB has to delivered.
      consegnato: num(r.QuantitaBollettata),
      residuo: num(r.QuantitaResidua),
      evadibile: num(r.QuantitaEvadibile),
    },
    valore: {
      ordinato: lineNet,
      saldato: netOf(r.ValoreQuantitaSaldata),
      consegnato: netOf(r.ValoreQuantitaBollettata),
      residuo: netOf(r.ValoreQuantitaResidua),
      evadibile: netOf(r.ValoreQuantitaEvadibile),
    },
    netto: unitNet,
    decimali_prezzo: 2,
    decimali_valore: r.PrezzaturaImputata?.ValutaNumeroDecimaliXValore ?? 2,
    image: '',
    link: '',
  };
}

/**
 * Detail built from GetRigheConInfoConsegna document rows — the fallback for
 * orders with no usable web cart (historical/ERP-native orders, e.g. B05).
 */
export function buildOrderDetailResponseFromDocRows(
  testata: MyMbTestata | null | undefined,
  rows: MyMbRigaConInfo[] | null | undefined,
): RawOrderResponse {
  const list = Array.isArray(rows) ? rows : [];
  return wrapOrderDetail(testata, list.map(rigaConInfoToOrderItem));
}

function wrapOrderDetail(
  testata: MyMbTestata | null | undefined,
  items: RawOrderItem[],
): RawOrderResponse {
  const t = testata ?? {};
  return {
    success: true,
    message: {
      order_details: items,
      causale: String(t.CausaleDocDefinitivo ?? ''),
      numero_documento: String(t.NumeroDocDefinitivo ?? ''),
      anno: String(t.AnnoDocDefinitivo ?? ''),
      data_consegna: t.DataConsegna ?? '',
      data_registrazione: t.DataRegistrazione ?? '',
      indirizzo: t.DescrizioneEstesaIndirizzo ?? '',
      citta: t.CittaIndirizzo ?? '',
      stato: t.StatoTestataOrdine ?? '',
      rif_cliente: 0,
      type: '',
    },
  };
}
