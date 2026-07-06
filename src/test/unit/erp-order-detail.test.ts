import { describe, it, expect } from 'vitest';
import {
  buildOrderDetailResponse,
  buildOrderDetailResponseFromDocRows,
} from '@utils/transform/erp-order-detail';
import { transformOrder } from '@utils/transform/b2b-order';

// Real shapes captured live from MyMB for order OB2B/2/2026 (IDCarrello 12).
const testata = {
  CausaleDocDefinitivo: 'OB2B',
  NumeroDocDefinitivo: 2,
  AnnoDocDefinitivo: 2026,
  DataConsegna: '11/06/2026',
  DataRegistrazione: '04/06/2026',
  DescrizioneEstesaIndirizzo: 'VIA FIEGHI,1',
  CittaIndirizzo: 'SALA CONSILINA',
  StatoTestataOrdine: 'NE',
  IDCarrello: 12,
};

const righe = [
  {
    IdRiga: 10,
    CodiceArticolo: 'CB0105-BWA.W36',
    CodiceInternoArticolo: 'CB0105-BWA.W36',
    DescrizioneArticolo: 'W         /36 FRANKLIN',
    UMArticolo: 'PA',
    QuantitaImputata: 7,
    Valore: 195.43,
    PrezzaturaImputata: { Prezzo: 51.7 },
  },
];

describe('buildOrderDetailResponse', () => {
  it('maps testata + ListaRighe into the RawOrderResponse shape', () => {
    const res = buildOrderDetailResponse(testata, righe);
    expect(res.success).toBe(true);
    expect(res.message.causale).toBe('OB2B');
    expect(res.message.numero_documento).toBe('2');
    expect(res.message.anno).toBe('2026');
    expect(res.message.indirizzo).toBe('VIA FIEGHI,1');
    expect(res.message.citta).toBe('SALA CONSILINA');
    expect(res.message.order_details).toHaveLength(1);

    const item = res.message.order_details[0];
    expect(item.id_riga).toBe(10);
    expect(item.articolo).toBe('CB0105-BWA.W36');
    expect(item.descrizione_articolo).toBe('W         /36 FRANKLIN'.trim());
    expect(item.um).toBe('PA');
    expect(item.quantita.ordinato).toBe(7);
    // unit net = line net total / qty
    expect(item.netto).toBeCloseTo(195.43 / 7, 5);
    expect(item.valore.ordinato).toBe(195.43);
  });

  it('feeds cleanly into transformOrder (line total = sub_total)', () => {
    const order = transformOrder(buildOrderDetailResponse(testata, righe));
    expect(order.doc_number).toBe('2');
    expect(order.cause).toBe('OB2B');
    expect(order.items).toHaveLength(1);
    expect(order.items[0].sku).toBe('CB0105-BWA.W36');
    expect(order.items[0].quantity).toBe(7);
    // entity_code must be set so PIM image enrichment can find the product.
    expect(order.items[0].entityCode).toBe('CB0105-BWA.W36');
    // unit price * qty ≈ the line net total
    expect(order.sub_total).toBeCloseTo(195.43, 2);
  });

  it('falls back to the gross unit price when quantity is zero', () => {
    const res = buildOrderDetailResponse(testata, [
      {
        IdRiga: 1,
        QuantitaImputata: 0,
        Valore: 0,
        PrezzaturaImputata: { Prezzo: 51.7 },
      },
    ]);
    expect(res.message.order_details[0].netto).toBe(51.7);
  });

  it('handles a missing testata / empty rows safely', () => {
    const res = buildOrderDetailResponse(undefined, []);
    expect(res.success).toBe(true);
    expect(res.message.order_details).toEqual([]);
    expect(res.message.numero_documento).toBe('');
  });
});

// GetRigheConInfoConsegna rows (historical/ERP-native orders, no web cart).
// Row shape captured live from MyMB for order B05/15199938/2026: `Valore*`
// fields are [net, vat, ...] triples, unit price nested in PrezzaturaImputata.
describe('buildOrderDetailResponseFromDocRows', () => {
  const b05Testata = {
    CausaleDocDefinitivo: 'B05',
    NumeroDocDefinitivo: 15199938,
    AnnoDocDefinitivo: 2026,
    DataRegistrazione: '25/06/2026',
    DescrizioneEstesaIndirizzo: "VIA SLOVENIA,9 LOCALITA' ZAU",
    CittaIndirizzo: 'UDINE',
    StatoTestataOrdine: 'EV',
    IDCarrello: 0,
  };

  // Live-captured row (irrelevant PrezzaturaImputata fields trimmed).
  const b05Riga = {
    IdRiga: 1,
    CodiceArticolo: 'CB1211-0WA.W42',
    CodiceInternoArticolo: 'CB1211-0WA.W42',
    DescrizioneArticolo: 'W         /42 I-ROBOX TOP',
    DescrizioneTaglia: null,
    UMArticolo: 'PA',
    Quantita: 3,
    QuantitaSaldata: 0,
    QuantitaBollettata: 0,
    QuantitaResidua: 0,
    QuantitaEvadibile: 0,
    Valore: [254.4, 55.97, 0],
    ValoreQuantitaSaldata: [0, 0, 0],
    ValoreQuantitaBollettata: [0, 0, 0],
    ValoreQuantitaResidua: [0, 0, 0],
    ValoreQuantitaEvadibile: [0, 0, 0],
    PrezzaturaImputata: {
      Prezzo: 84.8,
      ValutaNumeroDecimaliXPrezzo: 4,
      ValutaNumeroDecimaliXValore: 2,
    },
  };

  it('maps the live-captured row: net from Valore[0], unit net derived', () => {
    const res = buildOrderDetailResponseFromDocRows(b05Testata, [b05Riga]);
    expect(res.success).toBe(true);
    expect(res.message.causale).toBe('B05');
    expect(res.message.numero_documento).toBe('15199938');
    const item = res.message.order_details[0];
    expect(item.id_riga).toBe(1);
    expect(item.articolo).toBe('CB1211-0WA.W42');
    expect(item.descrizione_articolo).toBe('W         /42 I-ROBOX TOP'.trim());
    expect(item.um).toBe('PA');
    expect(item.quantita.ordinato).toBe(3);
    expect(item.quantita.consegnato).toBe(0);
    expect(item.valore.ordinato).toBe(254.4);
    expect(item.netto).toBeCloseTo(84.8, 5); // 254.40 / 3
  });

  it('maps the delivery breakdown (bollettata → consegnato)', () => {
    const res = buildOrderDetailResponseFromDocRows(b05Testata, [
      {
        ...b05Riga,
        QuantitaBollettata: 2,
        QuantitaResidua: 1,
        ValoreQuantitaBollettata: [169.6, 37.31, 0],
        ValoreQuantitaResidua: [84.8, 18.66, 0],
      },
    ]);
    const item = res.message.order_details[0];
    expect(item.quantita.consegnato).toBe(2);
    expect(item.quantita.residuo).toBe(1);
    expect(item.valore.consegnato).toBe(169.6);
    expect(item.valore.residuo).toBe(84.8);
  });

  it('falls back to the imputed unit price when quantity is zero', () => {
    const res = buildOrderDetailResponseFromDocRows(b05Testata, [
      { ...b05Riga, Quantita: 0, Valore: [0, 0, 0] },
    ]);
    expect(res.message.order_details[0].netto).toBe(84.8);
  });

  it('feeds cleanly into transformOrder', () => {
    const order = transformOrder(
      buildOrderDetailResponseFromDocRows(b05Testata, [b05Riga]),
    );
    expect(order.cause).toBe('B05');
    expect(order.doc_number).toBe('15199938');
    expect(order.items).toHaveLength(1);
    expect(order.items[0].sku).toBe('CB1211-0WA.W42');
    expect(order.items[0].quantity).toBe(3);
    expect(order.items[0].entityCode).toBe('CB1211-0WA.W42');
    expect(order.sub_total).toBeCloseTo(254.4, 2);
  });

  it('handles empty rows and missing testata safely', () => {
    const res = buildOrderDetailResponseFromDocRows(undefined, null);
    expect(res.success).toBe(true);
    expect(res.message.order_details).toEqual([]);
  });
});
