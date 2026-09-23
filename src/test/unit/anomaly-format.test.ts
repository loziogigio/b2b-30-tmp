import { describe, it, expect } from 'vitest';
import { formatAnomalyFlags } from '@/hooks/use-order-submit';

describe('formatAnomalyFlags', () => {
  it('labels the new native flags', () => {
    expect(formatAnomalyFlags({ IdRiga: 1, IsScontiVariati: true })).toBe(
      'Sconti variati',
    );
    expect(formatAnomalyFlags({ IdRiga: 1, IsPromozioneScaduta: true })).toBe(
      'Promozione scaduta',
    );
  });

  it('shows old and new price on a price change', () => {
    expect(
      formatAnomalyFlags({
        IdRiga: 1,
        IsPrezzoVariato: true,
        unit_price: 7.18,
        expected_unit_price: 7.5,
      }),
    ).toBe('Prezzo variato (7,18 € → 7,50 €)');
  });

  it('leaves ERP anomalies unchanged', () => {
    expect(formatAnomalyFlags({ IdRiga: 1, IsListinoNonValido: true })).toBe(
      'Listino non valido',
    );
    expect(formatAnomalyFlags({ IdRiga: 1, Messaggio: 'Testo ERP' })).toBe(
      'Testo ERP',
    );
  });

  it('omits the price detail when a price is missing', () => {
    expect(
      formatAnomalyFlags({
        IdRiga: 1,
        IsPrezzoVariato: true,
        unit_price: 7.18,
        expected_unit_price: null,
      }),
    ).toBe('Prezzo variato');
  });
});
