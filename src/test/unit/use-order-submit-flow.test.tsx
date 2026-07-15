import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const submitOrder = vi.hoisted(() => vi.fn());
const resubmitWithAutofix = vi.hoisted(() => vi.fn());
const confirmDuplicateSubmit = vi.hoisted(() => vi.fn());
const clearSubmitError = vi.hoisted(() => vi.fn());
const pimGet = vi.hoisted(() => vi.fn());
const resetCart = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const ensureActiveCart = vi.hoisted(() => vi.fn().mockResolvedValue('ord-1'));

vi.mock('@/hooks/use-order-submit', () => ({
  useOrderSubmit: () => ({
    submitOrder,
    resubmitWithAutofix,
    confirmDuplicateSubmit,
    isSubmitting: false,
    anomalyResult: null,
    duplicateWarning: null,
    orderAlreadySubmitted: null,
    submitError: null,
    clearAnomalies: vi.fn(),
    clearDuplicateWarning: vi.fn(),
    clearOrderAlreadySubmitted: vi.fn(),
    clearSubmitError,
  }),
}));
vi.mock('@framework/utils/httpPIM', () => ({ get: pimGet }));
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

import { useOrderSubmitFlow } from '@/hooks/use-order-submit-flow';

const opts = { delivery_date: '2026-07-16', delivery_type: 'courier' };

beforeEach(() => {
  // @testing-library/react's waitFor() only recognizes fake timers via a
  // global `jest` (it checks `typeof jest !== 'undefined'`), so without this
  // shim its post-resolution microtask-drain `setTimeout(fn, 0)` never fires
  // under vi.useFakeTimers() and every waitFor() call here hangs until the
  // suite's real 10s timeout. Aliasing `jest.advanceTimersByTime` to Vitest's
  // fake clock is the standard fix for this Vitest/Testing Library gap.
  (globalThis as any).jest = {
    advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  };
  vi.useFakeTimers();
  submitOrder.mockReset();
  resubmitWithAutofix.mockReset();
  confirmDuplicateSubmit.mockReset();
  clearSubmitError.mockClear();
  pimGet.mockReset();
  resetCart.mockClear();
  ensureActiveCart.mockClear();
  // Prevent jsdom navigation errors on the success redirect.
  vi.stubGlobal('location', { href: '' } as any);
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis as any).jest;
});

describe('useOrderSubmitFlow', () => {
  it('open() → confirm', () => {
    const { result } = renderHook(() => useOrderSubmitFlow('it'));
    act(() => result.current.open(opts));
    expect(result.current.status).toBe('confirm');
  });

  it('confirm() with sync 200 → success + order number', async () => {
    submitOrder.mockResolvedValue({ type: 'success', orderNumber: 'N-1' });
    const { result } = renderHook(() => useOrderSubmitFlow('it'));
    act(() => result.current.open(opts));
    await act(async () => {
      result.current.confirm();
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.orderNumber).toBe('N-1');
    expect(submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ redirectOnComplete: false }),
    );
    expect(resetCart).toHaveBeenCalled();
  });

  it('confirm() with 202 → processing, polls phases, completes to success', async () => {
    submitOrder.mockResolvedValue({ type: 'processing', orderId: 'ord-1' });
    pimGet
      .mockResolvedValueOnce({
        processing_status: 'processing',
        processing_phase: 'before',
      })
      .mockResolvedValueOnce({
        processing_status: 'processing',
        processing_phase: 'on',
      })
      .mockResolvedValueOnce({
        processing_status: 'completed',
        order_number: 'N-2',
      });
    const { result } = renderHook(() => useOrderSubmitFlow('it'));
    act(() => result.current.open(opts));
    await act(async () => {
      result.current.confirm();
    });
    await waitFor(() => expect(result.current.status).toBe('processing'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.stage).toBe(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.stage).toBe(3);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.orderNumber).toBe('N-2');
  });

  it('poll failure ×5 → error', async () => {
    submitOrder.mockResolvedValue({ type: 'processing', orderId: 'ord-1' });
    pimGet.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useOrderSubmitFlow('it'));
    act(() => result.current.open(opts));
    await act(async () => {
      result.current.confirm();
    });
    await waitFor(() => expect(result.current.status).toBe('processing'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000 * 5);
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('anomalies outcome returns the flow to idle (existing modal takes over)', async () => {
    submitOrder.mockResolvedValue({
      type: 'anomalies',
      result: { anomalies: [], erpItems: [] },
    });
    const { result } = renderHook(() => useOrderSubmitFlow('it'));
    act(() => result.current.open(opts));
    await act(async () => {
      result.current.confirm();
    });
    await waitFor(() => expect(result.current.status).toBe('idle'));
  });

  it('error outcome clears submitError so the toast does not linger', async () => {
    submitOrder.mockResolvedValue({ type: 'error', message: 'boom' });
    const { result } = renderHook(() => useOrderSubmitFlow('it'));
    act(() => result.current.open(opts));
    await act(async () => {
      result.current.confirm();
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(clearSubmitError).toHaveBeenCalled();
    expect(result.current.submitError).toBeNull();
  });
});
