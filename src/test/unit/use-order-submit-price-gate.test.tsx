import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const post = vi.hoisted(() => vi.fn());
vi.mock('@framework/utils/httpPIM', () => ({ post }));
vi.mock('@framework/cart/b2b-cart', () => ({ ensureActiveCart: vi.fn() }));
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({
    meta: { orderId: 'ord-1' },
    resetCart: vi.fn(),
    items: [{ id: 'E1', rowId: '20', sku: 'S-20', quantity: 1 }],
  }),
}));
vi.mock('@/hooks/use-cart-settings', () => ({
  useCartSettings: () => ({
    settings: { orderSuccessPages: [] },
    isLoading: false,
  }),
}));
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { vinc_order_id: 'ord-1' },
}));

import { useOrderSubmit } from '@/hooks/use-order-submit';

const reject422 = (data: unknown) =>
  post.mockRejectedValue({ response: { status: 422, data } });

beforeEach(() => {
  // Block body on purpose: `post.mockReset()` returns `post` itself, and an
  // implicit-return arrow here (`() => post.mockReset()`) would hand that
  // function back to Vitest, which treats any function returned from
  // `beforeEach` as an implicit `afterEach` cleanup — silently re-invoking
  // the still-configured `mockRejectedValue` after the test as an unawaited
  // call, which then surfaces as a spurious unhandled-rejection failure.
  post.mockReset();
});

describe('useOrderSubmit — CS price gate', () => {
  it('maps CART_PRICES_CHANGED to a native anomaly result', async () => {
    reject422({
      error: 'Prezzi o promozioni variati nel carrello',
      code: 'CART_PRICES_CHANGED',
      price_check: {
        anomalies: [
          {
            IdRiga: 20,
            entity_code: 'E1',
            IsPromozioneScaduta: true,
            unit_price: 3.95,
            expected_unit_price: null,
          },
        ],
      },
    });
    const { result } = renderHook(() => useOrderSubmit('it'));
    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-09-24',
        delivery_type: 'courier',
      });
    });
    expect(outcome.type).toBe('anomalies');
    expect(outcome.result.source).toBe('native');
    expect(outcome.result.anomalies[0].IdRiga).toBe(20);
    expect(outcome.result.erpItems).toEqual([
      { erp_line_number: 20, erp_data: { oarti: 'S-20' } },
    ]);
    expect(result.current.anomalyResult?.source).toBe('native');
  });

  it('keeps the MyMB anomaly envelope as an ERP result', async () => {
    reject422({
      error: '1 anomalie trovate',
      windmill: {
        modified_data: {
          erp_data: { anomalies: [{ IdRiga: 1, IsListinoNonValido: true }] },
          erp_items: [],
        },
      },
    });
    const { result } = renderHook(() => useOrderSubmit('it'));
    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-09-24',
        delivery_type: 'courier',
      });
    });
    expect(outcome.type).toBe('anomalies');
    expect(outcome.result.source).toBeUndefined();
  });
});
