import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const post = vi.hoisted(() => vi.fn());
const resetCart = vi.hoisted(() => vi.fn());
const ensureActiveCart = vi.hoisted(() => vi.fn());

vi.mock('@framework/utils/httpPIM', () => ({ post }));
vi.mock('@framework/cart/b2b-cart', () => ({ ensureActiveCart }));
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({ meta: { orderId: 'ord-1' }, resetCart }),
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

beforeEach(() => {
  post.mockReset();
  resetCart.mockReset();
  ensureActiveCart.mockReset();
});

describe('useOrderSubmit — redirectOnComplete: false', () => {
  it('returns success + orderNumber without navigating or resetting the cart', async () => {
    post.mockResolvedValue({ order_number: 'N-99', sync: true });
    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-07-16',
        delivery_type: 'courier',
        redirectOnComplete: false,
      });
    });

    expect(outcome).toEqual({ type: 'success', orderNumber: 'N-99' });
    expect(resetCart).not.toHaveBeenCalled();
    expect(ensureActiveCart).not.toHaveBeenCalled();
    // The submit POST must carry no client timeout — the server decides when
    // to hand back 202, which can exceed the shared httpPIM 30s default.
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/submit'),
      expect.any(Object),
      expect.objectContaining({ timeout: 0 }),
    );
  });

  it('returns processing without navigating when async', async () => {
    post.mockResolvedValue({ processing: true, processing_phase: 'before' });
    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-07-16',
        delivery_type: 'courier',
        redirectOnComplete: false,
      });
    });

    expect(outcome).toEqual({ type: 'processing', orderId: 'ord-1' });
    expect(resetCart).not.toHaveBeenCalled();
  });

  it('parses erp_item_errors from a 422 (export failure) into result.itemErrors', async () => {
    post.mockRejectedValue({
      response: {
        status: 422,
        data: {
          error: '2 articoli non esportati',
          windmill: {
            modified_data: {
              erp_data: { anomalies: [] },
              erp_item_errors: [
                {
                  oarti: '60256',
                  line_number: 10,
                  error: 'Failed after 3 attempts',
                },
                {
                  oarti: '52621',
                  line_number: 20,
                  error: 'Failed after 3 attempts',
                },
              ],
            },
          },
        },
      },
    });
    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-07-16',
        delivery_type: 'courier',
        redirectOnComplete: false,
      });
    });

    expect(outcome.type).toBe('anomalies');
    expect(outcome.result.anomalies).toEqual([]);
    expect(outcome.result.itemErrors).toHaveLength(2);
    expect(outcome.result.itemErrors[0].oarti).toBe('60256');
  });
});
