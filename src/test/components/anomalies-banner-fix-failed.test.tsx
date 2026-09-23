import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Minimal i18next-like mock: substitutes {{key}} placeholders so the
// "lost SKU" interpolated message can be asserted on real rendered text.
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => {
      let s = String(o?.defaultValue ?? k);
      if (o) {
        for (const key of Object.keys(o)) {
          if (key === 'defaultValue') continue;
          s = s.replace(`{{${key}}}`, String(o[key]));
        }
      }
      return s;
    },
  }),
}));

const anomalies = vi.hoisted(() => ({ result: null as any, clear: vi.fn() }));
vi.mock('@/contexts/cart-anomalies.context', () => ({
  useCartAnomalies: () => anomalies,
}));

const priceCheck = vi.hoisted(() => ({
  enabled: true,
  status: 'clean',
  recheck: vi.fn(),
  fix: vi.fn(),
  fixing: false,
  fixFailed: false,
  fixLostSkus: [] as string[],
}));
vi.mock('@/contexts/cart-price-check.context', () => ({
  useCartPriceCheck: () => priceCheck,
}));

import { AnomaliesBanner } from '@components/cart/checkout-flow';

beforeEach(() => {
  vi.clearAllMocks();
  anomalies.result = null;
  priceCheck.fixing = false;
  priceCheck.fixFailed = false;
  priceCheck.fixLostSkus = [];
});

describe('AnomaliesBanner — a failed cart update must never go unseen', () => {
  it('renders nothing when there is no result and no failure', () => {
    const { container } = render(<AnomaliesBanner lang="it" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the failure notice and the lost SKU when a fix failed with no anomalies published', () => {
    priceCheck.fixFailed = true;
    priceCheck.fixLostSkus = ['S-1'];
    render(<AnomaliesBanner lang="it" />);
    expect(
      screen.getByText('Aggiornamento non completato, riprova'),
    ).toBeInTheDocument();
    expect(screen.getByText('Controlla e riaggiungi: S-1')).toBeInTheDocument();
    // No anomaly list/title was published — this is the failure-only path.
    expect(screen.queryByText(/Anomalie riscontrate/i)).not.toBeInTheDocument();
  });

  it('shows the lost-SKU line alongside the existing anomaly banner when a result is also published', () => {
    anomalies.result = {
      anomalies: [{ IdRiga: 10, IsPrezzoVariato: true }],
      erpItems: [{ erp_line_number: 10, erp_data: { oarti: 'S-1' } }],
      source: 'native' as const,
    };
    priceCheck.fixFailed = true;
    priceCheck.fixLostSkus = ['S-1'];
    render(<AnomaliesBanner lang="it" />);
    expect(
      screen.getByText('Anomalie riscontrate nel carrello'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aggiornamento non completato, riprova'),
    ).toBeInTheDocument();
    expect(screen.getByText('Controlla e riaggiungi: S-1')).toBeInTheDocument();
  });
});
