'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCart } from '@contexts/cart/cart.context';
import type { Item } from '@contexts/cart/cart.utils';
import { useCartSettings } from '@/hooks/use-cart-settings';
import { usePricingSource } from '@framework/pricing';
import { fetchCartData } from '@framework/cart/b2b-cart';
import { ERP_STATIC } from '@framework/utils/static';
import type { AnomalyResult } from '@/hooks/use-order-submit';
import { useCartAnomalies } from '@/contexts/cart-anomalies.context';
import { fetchCartPriceMap } from '@/lib/cart/fetch-cart-price-map';
import { diffCartPrices, isCheckableLine } from '@/lib/cart/price-check';
import { applyCartFixPlan, planPriceFixes } from '@/lib/cart/price-fix-planner';

export type PriceCheckStatus =
  | 'idle'
  | 'checking'
  | 'clean'
  | 'changed'
  | 'unavailable';

type CheckOutcome = { status: PriceCheckStatus; result: AnomalyResult | null };

interface CartPriceCheckValue {
  enabled: boolean;
  status: PriceCheckStatus;
  /** Re-check the given lines (default: the current cart). */
  recheck: (lines?: Item[]) => Promise<CheckOutcome>;
  /** "Aggiorna carrello": fix the lines of a native result, reload, re-check. */
  fix: (result: AnomalyResult) => Promise<boolean>;
  fixing: boolean;
  fixFailed: boolean;
}

const DISABLED: CartPriceCheckValue = {
  enabled: false,
  status: 'idle',
  recheck: async () => ({ status: 'idle', result: null }),
  fix: async () => false,
  fixing: false,
  fixFailed: false,
};

const CartPriceCheckContext = createContext<CartPriceCheckValue>(DISABLED);

/**
 * Runs the cart price check when the cart opens (once per cart), on demand
 * before sending, and after "Aggiorna carrello". Native anomalies go into the
 * shared CartAnomalies context so the existing banner and red rows show them.
 *
 * Only active when `cart_settings.verify_prices` is on AND the storefront
 * books inline (PIM) prices — the Commerce Suite gate compares against PIM,
 * so both sides must look at the same prices.
 */
export function CartPriceCheckProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { items, meta, hydrateFromServer, setCartSummary } = useCart();
  const { settings } = useCartSettings();
  const pricingSource = usePricingSource();
  const { result: shared, setAnomalies, clear } = useCartAnomalies();

  const enabled = settings.verifyPrices === true && pricingSource === 'inline';
  const decimals = meta?.priceDecimals ?? 2;

  const [status, setStatus] = useState<PriceCheckStatus>('idle');
  const [fixing, setFixing] = useState(false);
  const [fixFailed, setFixFailed] = useState(false);

  const itemsRef = useRef<Item[]>(items ?? []);
  itemsRef.current = items ?? [];
  const sharedRef = useRef<AnomalyResult | null>(shared);
  sharedRef.current = shared;

  const recheck = useCallback(
    async (lines?: Item[]): Promise<CheckOutcome> => {
      if (!enabled) return { status: 'idle', result: null };
      const cartLines = (lines ?? itemsRef.current).filter(isCheckableLine);
      const clean = (): CheckOutcome => {
        if (sharedRef.current?.source === 'native') clear();
        setStatus('clean');
        return { status: 'clean', result: null };
      };
      if (cartLines.length === 0) return clean();

      setStatus('checking');
      try {
        const priceMap = await fetchCartPriceMap(
          cartLines.map((i) => String(i.id)),
        );
        const { anomalies, erpItems } = diffCartPrices(cartLines, priceMap, {
          now: new Date(),
          decimals,
        });
        if (anomalies.length === 0) return clean();
        const result: AnomalyResult = {
          anomalies,
          erpItems,
          itemErrors: [],
          source: 'native',
        };
        setAnomalies(result);
        setStatus('changed');
        return { status: 'changed', result };
      } catch (error) {
        console.error('[cart-price-check] check failed:', error);
        setStatus('unavailable');
        return { status: 'unavailable', result: null };
      }
    },
    [enabled, decimals, setAnomalies, clear],
  );

  const fix = useCallback(
    async (result: AnomalyResult): Promise<boolean> => {
      const orderId = meta?.orderId || ERP_STATIC.vinc_order_id;
      if (!orderId) return false;
      setFixing(true);
      setFixFailed(false);
      // Drop the banner first so the auto-clear watcher re-arms on the fresh
      // result instead of wiping it when the reloaded items arrive.
      clear();
      let ok = false;
      try {
        const lines = itemsRef.current.filter(isCheckableLine);
        const priceMap = await fetchCartPriceMap(
          lines.map((i) => String(i.id)),
        );
        const plan = planPriceFixes(
          result.anomalies,
          lines,
          priceMap,
          new Date(),
        );
        await applyCartFixPlan(String(orderId), plan);
        ok = true;
      } catch (error) {
        console.error('[cart-price-check] fix failed:', error);
        setFixFailed(true);
      }
      try {
        const fresh = await fetchCartData();
        hydrateFromServer(fresh.items, 'replace');
        setCartSummary(fresh.summary);
        await recheck(fresh.items);
      } catch (error) {
        console.error('[cart-price-check] reload after fix failed:', error);
      } finally {
        setFixing(false);
      }
      return ok;
    },
    [meta?.orderId, clear, hydrateFromServer, setCartSummary, recheck],
  );

  // Check once per cart when it opens with at least one saved line.
  const checkedOrderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const orderId = meta?.orderId ? String(meta.orderId) : '';
    if (!orderId || checkedOrderRef.current === orderId) return;
    if (!(items ?? []).some(isCheckableLine)) return;
    checkedOrderRef.current = orderId;
    void recheck();
  }, [enabled, meta?.orderId, items, recheck]);

  const value = useMemo<CartPriceCheckValue>(
    () => ({ enabled, status, recheck, fix, fixing, fixFailed }),
    [enabled, status, recheck, fix, fixing, fixFailed],
  );

  return (
    <CartPriceCheckContext.Provider value={value}>
      {children}
    </CartPriceCheckContext.Provider>
  );
}

export function useCartPriceCheck(): CartPriceCheckValue {
  return useContext(CartPriceCheckContext);
}
