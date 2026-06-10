import { describe, it, expect } from 'vitest';
import { vincPaymentScheduleToSummary } from '@/utils/transform/vinc-payment-schedule';

const recs = [
  {
    _id: 'a',
    data: {
      scadenza_id: '1',
      data_scadenza: '2026-01-03T00:00:00Z', // past (vs today 2026-06-02)
      tipo_code: 'C3',
      tipo_label: 'Bonifico',
      importo: 100,
      residuo: 100,
      valuta: 'EUR',
      documento: {
        numero_documento: 'F/2026/54',
        data_documento: '2026-01-02T00:00:00Z',
      },
    },
  },
  {
    _id: 'b',
    data: {
      scadenza_id: '2',
      data_scadenza: '2026-12-31T00:00:00Z', // future
      tipo_code: 'RB',
      tipo_label: 'Ricevuta bancaria',
      importo: 40,
      residuo: 40,
      valuta: 'EUR',
      documento: {
        numero_documento: 'F/2026/99',
        data_documento: '2026-06-01T00:00:00Z',
      },
    },
  },
];

describe('vincPaymentScheduleToSummary', () => {
  it('emits a header+detail pair per scadenza and computes totals', () => {
    const s = vincPaymentScheduleToSummary(recs, '2026-06-02');
    expect(s.items).toHaveLength(4);

    const [h1, d1, h2, d2] = s.items;
    expect(h1.isDueView).toBe(true);
    expect(h1.isReferenceView).toBe(false);
    expect(h1.description).toBe('Bonifico');
    expect(h1.dueDate).toBe('2026-01-03T00:00:00Z');
    expect(h1.total).toBe(100);
    expect(d1.isReferenceView).toBe(true);
    expect(d1.isDueView).toBe(false);
    expect(d1.document).toBe('F/2026/54');
    expect(d1.referenceDate).toBe('2026-01-02T00:00:00Z');
    expect(d1.amount).toBe(100);
    expect(h2.description).toBe('Ricevuta bancaria');
    expect(d2.document).toBe('F/2026/99');

    expect(s.currencyCode).toBe('EUR');
    expect(s.totalGeneral).toBe(140);
    expect(s.totalExpired).toBe(100);
    expect(s.totalToExpire).toBe(40);
  });

  it('returns an empty summary for no records', () => {
    const s = vincPaymentScheduleToSummary([], '2026-06-02');
    expect(s.items).toEqual([]);
    expect(s.totalGeneral).toBe(0);
    expect(s.totalExpired).toBe(0);
    expect(s.totalToExpire).toBe(0);
    expect(s.currencyCode).toBe('');
  });
});
