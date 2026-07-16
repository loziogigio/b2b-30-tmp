import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformPaymentDeadline } from '@/utils/transform/b2b-payment-deadline';

/**
 * Shape mirrors a real ERP Scadenzario payload: credit notes carry a negative
 * Totale on the header (due-view) row, sales invoices a positive one.
 */
const raw = {
  CodiceValuta: 'EUR',
  DescrizioneValuta: 'Euro',
  ListaScadenzaConInfo: [
    // credit note, past due
    {
      isRiga: true,
      isTipoVisualizzazioneScadenza: true,
      Descrizione: 'NOTE DI CREDITO CLIENTI',
      DataScadenza: '17/03/2026',
      Totale: -30.29,
      Importo: 0,
    },
    {
      isRiga: true,
      isTipoVisualizzazioneRiferimento: true,
      Documento: 'AC/2026/129',
      DataRiferimento: '03/07/2026',
      Importo: -30.29,
      Totale: 0,
    },
    // credit note, past due
    {
      isRiga: true,
      isTipoVisualizzazioneScadenza: true,
      Descrizione: 'NOTE DI CREDITO CLIENTI',
      DataScadenza: '10/07/2026',
      Totale: -12700.72,
      Importo: 0,
    },
    {
      isRiga: true,
      isTipoVisualizzazioneRiferimento: true,
      Documento: 'NC/2026/306',
      DataRiferimento: '10/07/2026',
      Importo: -12700.72,
      Totale: 0,
    },
    // bank transfer, future due
    {
      isRiga: true,
      isTipoVisualizzazioneScadenza: true,
      Descrizione: 'BONIFICO BANCARIO ATTIVO',
      DataScadenza: '30/11/2026',
      Totale: 24354.77,
      Importo: 0,
    },
    {
      isRiga: true,
      isTipoVisualizzazioneRiferimento: true,
      Documento: 'VEN/2026/2716',
      DataRiferimento: '15/07/2026',
      Importo: 12049.84,
      Totale: 0,
    },
  ],
} as any;

describe('transformPaymentDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts negative (credit note) totals toward the summary', () => {
    const s = transformPaymentDeadline(raw);

    // 24354.77 - 30.29 - 12700.72
    expect(s.totalGeneral).toBeCloseTo(11623.76, 2);
    // both credit notes are past due → negative expired total
    expect(s.totalExpired).toBeCloseTo(-12731.01, 2);
    // only the 30/11/2026 bank transfer is still to come
    expect(s.totalToExpire).toBeCloseTo(24354.77, 2);
  });

  it('ignores detail rows when summing totals', () => {
    const s = transformPaymentDeadline(raw);
    // detail rows carry Importo, never Totale — they must not be double-counted
    expect(s.totalGeneral).toBeCloseTo(s.totalExpired + s.totalToExpire, 2);
  });

  it('returns an empty summary for a missing list', () => {
    const s = transformPaymentDeadline({} as any);
    expect(s.items).toEqual([]);
    expect(s.totalGeneral).toBe(0);
    expect(s.totalExpired).toBe(0);
    expect(s.totalToExpire).toBe(0);
  });
});
