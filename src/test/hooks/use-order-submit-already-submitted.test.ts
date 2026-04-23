import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@framework/utils/httpPIM', () => ({
  post: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({
    meta: { orderId: 'ORDER123' },
    resetCart: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('@framework/cart/b2b-cart', () => ({
  ensureActiveCart: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { vinc_order_id: null },
}));

import { post } from '@framework/utils/httpPIM';
import { useOrderSubmit } from '@/hooks/use-order-submit';

const mockPost = post as unknown as ReturnType<typeof vi.fn>;

// Keep window.location.href assignments from actually navigating.
beforeEach(() => {
  mockPost.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
});

describe('useOrderSubmit — already-submitted detection (200 body)', () => {
  it('returns already_submitted when backend replies 200 with code ORDER_NOT_DRAFT', async () => {
    mockPost.mockResolvedValueOnce({
      code: 'ORDER_NOT_DRAFT',
      error: 'Ordine già inviato',
    });

    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-04-24',
        delivery_type: 'courier',
      });
    });

    expect(outcome).toEqual({
      type: 'already_submitted',
      message: 'Ordine già inviato',
    });
    expect(result.current.orderAlreadySubmitted).toEqual({
      message: 'Ordine già inviato',
    });
  });

  it('also detects ORDER_NOT_RESUBMITTABLE in 200 body', async () => {
    mockPost.mockResolvedValueOnce({
      code: 'ORDER_NOT_RESUBMITTABLE',
    });

    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-04-24',
        delivery_type: 'courier',
      });
    });

    expect(outcome.type).toBe('already_submitted');
  });
});
