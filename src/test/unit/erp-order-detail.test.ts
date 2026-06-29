import { describe, it, expect } from 'vitest';
import { buildOrderDetailResponse } from '@utils/transform/erp-order-detail';
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
