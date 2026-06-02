import { describe, it, expect } from 'vitest';
import { vincCreditExposureToExposition } from '@/utils/transform/vinc-credit-exposure';

const rec = {
  _id: 'e1',
  data: {
    snapshot_date: '2026-06-02T00:00:00.000Z',
    currency: 'EUR',
    lines: [
      { code: 'rimesse', label: 'Rimesse Dirette', scaduto: 10, da_scadere: 5, totale: 15 },
      { code: 'cambiaria', label: 'RIBA', scaduto: 2, da_scadere: 3, totale: 5 },
      { code: 'bolle_nf', label: 'Bolle non fatturate', da_scadere: 7, totale: 7 },
      { code: 'ordini_ne', label: 'Ordini non evasi', da_scadere: 8, totale: 8 },
      { code: 'prebolle', label: 'Da scadere', da_scadere: 9, totale: 9 },
      { code: 'acconti', label: 'Acconti', totale: 4 },
    ],
    scaduto_totale: 12,
    da_scadere_totale: 32,
    totale_esposizione: 48,
    fido_assicurato: 50,
    differenza: 2,
  },
};

describe('vincCreditExposureToExposition', () => {
  it('maps the 6 coded lines + header to the Exposition shape', () => {
    const e = vincCreditExposureToExposition(rec);
    expect(e.directRemittancesExpired).toBe(10);
    expect(e.directRemittancesToExpire).toBe(5);
    expect(e.directRemittancesTotal).toBe(15);
    expect(e.ribaExpired).toBe(2);
    expect(e.ribaToExpire).toBe(3);
    expect(e.ribaTotal).toBe(5);
    expect(e.unbilledBillsToExpire).toBe(7);
    expect(e.unbilledBillsTotal).toBe(7);
    expect(e.ordersNotFulfilledToExpire).toBe(8);
    expect(e.ordersNotFulfilledTotal).toBe(8);
    expect(e.prebillsToExpire).toBe(9);
    expect(e.prebillsTotal).toBe(9);
    expect(e.advancesTotal).toBe(4);
    expect(e.total2Total).toBe(48);
    expect(e.trustAssuredTotal).toBe(50);
    expect(e.differenceTotal).toBe(2);
    expect(e.currencyCode).toBe('EUR');
  });

  it('defaults missing lines/fields to 0 (and unused trust fields to 0)', () => {
    const e = vincCreditExposureToExposition({ _id: '', data: {} } as any);
    expect(e.directRemittancesTotal).toBe(0);
    expect(e.advancesTotal).toBe(0);
    expect(e.total2Total).toBe(0);
    expect(e.trustAssuredTotal).toBe(0);
    expect(e.differenceTotal).toBe(0);
    expect(e.trustInternalTotal).toBe(0);
    expect(e.creditLimitTotal).toBe(0);
    expect(e.returnCode).toBe(0);
  });
});
