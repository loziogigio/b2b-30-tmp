'use client';

import { useQuery } from '@tanstack/react-query';
import type { MyMbCartClosureInfo } from 'vinc-erp';

/**
 * The ERP's order-header info for the current cart — above all its
 * minimum-order rule (IMPMIN).
 *
 * IMPMIN is an order-HEADER rule, so it does not ride along with the per-article
 * prices; GetInfoTestataOrdineXControlloChiusura is the only ERP call that
 * exposes it. The route derives the ERP cart id server-side from the order, so
 * the browser only ever sends its own `order_id`.
 *
 * Returns `undefined` while loading, and on any failure — including the case
 * where the order has no ERP cart yet (409 NO_ERP_CART). Callers must treat that
 * as "no minimum known", never as "compliant": a missing threshold must not
 * block checkout.
 */
export function useCartClosureInfo(
  orderId: string | undefined,
  enabled = true,
): MyMbCartClosureInfo | undefined {
  const query = useQuery({
    queryKey: ['b2b-cart-closure', orderId],
    queryFn: async (): Promise<MyMbCartClosureInfo | null> => {
      const res = await fetch('/api/b2b/cart-closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!res.ok) return null; // incl. 409 NO_ERP_CART — not an error worth retrying
      const json = await res.json();
      return json?.data ?? null;
    },
    enabled: enabled && Boolean(orderId),
    // The threshold is customer configuration, not cart state — it does not
    // change as lines are added, so it does not need to be refetched per edit.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return query.data ?? undefined;
}
