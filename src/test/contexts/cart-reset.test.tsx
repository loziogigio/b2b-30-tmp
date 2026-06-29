import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// The backing cart API is mocked so the test asserts on the calls the
// context makes, not on real network behaviour.
vi.mock('@framework/cart/b2b-cart', () => ({
  deleteCart: vi.fn().mockResolvedValue({ ok: true }),
  fetchCartData: vi.fn().mockResolvedValue({ items: [], summary: null }),
  addOrUpdateCartItem: vi.fn().mockResolvedValue({ status: 'ok' }),
  ensureActiveCart: vi.fn().mockResolvedValue('NEW-CART'),
}));

// Mutable ERP_STATIC stand-in so the context can resolve the active cart id.
// Defined via vi.hoisted because vi.mock factories are hoisted above the file.
const erpStatic = vi.hoisted(() => ({
  vinc_order_id: 'ORDER123' as string | undefined,
}));
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: erpStatic,
  setErpStatic: vi.fn((next: any) => Object.assign(erpStatic, next)),
}));

import { deleteCart } from '@framework/cart/b2b-cart';
import { setErpStatic } from '@framework/utils/static';
import { CartProvider, useCart } from '@/contexts/cart/cart.context';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CartProvider, null, children);

describe('CartProvider resetCart — Svuota carrello', () => {
  beforeEach(() => {
    (deleteCart as any).mockClear();
    (setErpStatic as any).mockClear();
    erpStatic.vinc_order_id = 'ORDER123';
  });

  // Regression: the "Svuota carrello" button calls resetCart() with no id.
  // Previously deleteCart was guarded behind a provided id, so the backing
  // VINC cart was never deleted and re-appeared on the next add.
  it('deletes the backing VINC cart even when called with no id', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.resetCart();
    });

    expect(deleteCart).toHaveBeenCalledTimes(1);
    expect(deleteCart).toHaveBeenCalledWith('ORDER123');
  });

  it('drops the deleted cart reference so the next add provisions a fresh cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.resetCart();
    });

    expect(setErpStatic).toHaveBeenCalledWith({ vinc_order_id: undefined });
  });

  it('still deletes the cart when an explicit id is passed', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.resetCart('EXPLICIT-9');
    });

    expect(deleteCart).toHaveBeenCalledWith('EXPLICIT-9');
  });
});
