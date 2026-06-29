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
  const t = testata ?? {};
  const rows = Array.isArray(righe) ? righe : [];
  return {
    success: true,
    message: {
      order_details: rows.map(rigaToOrderItem),
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
