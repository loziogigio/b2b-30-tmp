import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({ t: (k: string, o?: any) => o?.defaultValue ?? k }),
}));
vi.mock('@contexts/address/address.context', () => ({
  useDeliveryAddress: () => ({
    selected: {
      id: 1,
      address: { street_address: 'Via Roma 1', city: 'Roma' },
    },
  }),
}));
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({ meta: { totalNet: 100 } }),
}));
vi.mock('@/contexts/cart-anomalies.context', () => ({
  useCartAnomalies: () => ({ setAnomalies: vi.fn() }),
}));

const submitOrder = vi.hoisted(() => vi.fn());
const resubmitWithAutofix = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-order-submit', async (orig) => ({
  ...(await orig<typeof import('@/hooks/use-order-submit')>()),
  useOrderSubmit: () => ({
    submitOrder,
    resubmitWithAutofix,
    confirmDuplicateSubmit: vi.fn(),
    isSubmitting: false,
    anomalyResult: null,
    duplicateWarning: null,
    orderAlreadySubmitted: null,
    submitError: null,
    clearAnomalies: vi.fn(),
    clearDuplicateWarning: vi.fn(),
  }),
}));

const priceCheck = vi.hoisted(() => ({
  enabled: true,
  status: 'clean',
  recheck: vi.fn(),
  fix: vi.fn(),
  fixing: false,
  fixFailed: false,
}));
vi.mock('@/contexts/cart-price-check.context', () => ({
  useCartPriceCheck: () => priceCheck,
}));

import CheckoutSendOrder from '@components/checkout/checkout-send-order';

const NATIVE = {
  anomalies: [{ IdRiga: 10, IsPromozioneScaduta: true }],
  erpItems: [{ erp_line_number: 10, erp_data: { oarti: 'S-1' } }],
  source: 'native' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  priceCheck.enabled = true;
  submitOrder.mockResolvedValue({ type: 'success' });
  priceCheck.fix.mockResolvedValue(true);
});

describe('CheckoutSendOrder — cart price check', () => {
  it('blocks sending and opens the modal when the cart changed', async () => {
    priceCheck.recheck.mockResolvedValue({ status: 'changed', result: NATIVE });
    render(<CheckoutSendOrder lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }));
    await screen.findByText('Anomalie riscontrate');
    expect(submitOrder).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Aggiorna carrello con listino variato/i,
      }),
    );
    await waitFor(() => expect(priceCheck.fix).toHaveBeenCalledWith(NATIVE));
    expect(resubmitWithAutofix).not.toHaveBeenCalled();
  });

  it('sends when the cart is clean', async () => {
    priceCheck.recheck.mockResolvedValue({ status: 'clean', result: null });
    render(<CheckoutSendOrder lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }));
    await waitFor(() => expect(submitOrder).toHaveBeenCalledTimes(1));
  });

  it('sends without checking when the check is off', async () => {
    priceCheck.enabled = false;
    render(<CheckoutSendOrder lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }));
    await waitFor(() => expect(submitOrder).toHaveBeenCalledTimes(1));
    expect(priceCheck.recheck).not.toHaveBeenCalled();
  });
});
