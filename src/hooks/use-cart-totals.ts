'use client';

import { useMemo } from 'react';
import { useCart } from '@contexts/cart/cart.context';
import type { Item } from '@contexts/cart/cart.utils';
import type { CartTotalsData } from '@components/cart/cart-totals';

/** Demo VAT rate until the ERP returns a per-line / per-cart rate. */
export const CART_VAT_RATE = 0.22;

/** Unit NET price for a cart line, walking canonical → legacy fallbacks. */
export const unitNet = (r: Item) =>
  Number(r.priceDiscount ?? r.__cartMeta?.price_discount ?? r.price ?? 0);

/** Unit GROSS price for a cart line, walking canonical → legacy fallbacks. */
export const unitGross = (r: Item) =>
  Number(
    r.priceGross ??
      r.__cartMeta?.gross_price ??
      r.gross_price ??
      r.price_gross ??
      r.price ??
      0,
  );

/** Pure totals computation shared by the cart table and the checkout flow. */
export function computeCartTotals(items: Item[]): CartTotalsData {
  const net = items.reduce(
    (s, r) => s + unitNet(r) * Number(r.quantity ?? 0),
    0,
  );
  const gross = items.reduce(
    (s, r) => s + unitGross(r) * Number(r.quantity ?? 0),
    0,
  );
  const vat = net * CART_VAT_RATE;
  return {
    net,
    gross,
    vat,
    doc: net + vat,
    vatRate: Math.round(CART_VAT_RATE * 100),
  };
}

/** Reactive cart totals derived from the live cart items. */
export function useCartTotals(): CartTotalsData {
  const { items } = useCart();
  return useMemo(() => computeCartTotals(items ?? []), [items]);
}
