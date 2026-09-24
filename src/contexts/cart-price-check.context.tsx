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
import {
  diffCartPrices,
  isCheckableLine,
  lineNumberOf,
} from '@/lib/cart/price-check';
import {
  applyCartFixPlan,
  planPriceFixes,
  CartFixError,
} from '@/lib/cart/price-fix-planner';

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
  /** SKUs the fix could not restore (CartFixError.lost) — the customer must
   *  check and re-add these by hand; empty when nothing was lost. */
  fixLostSkus: string[];
  /** SKUs of the lines the last fix could not update automatically
   *  (plan.unfixable) — no longer sellable, or a change the storefront
   *  cannot apply; the customer must remove the line or ask for help. Kept
   *  until the next fix, even when the re-check after it comes back clean. */
  fixUnfixableSkus: string[];
}

const DISABLED: CartPriceCheckValue = {
  enabled: false,
  status: 'idle',
  recheck: async () => ({ status: 'idle', result: null }),
  fix: async () => false,
  fixing: false,
  fixFailed: false,
  fixLostSkus: [],
  fixUnfixableSkus: [],
};

/** The SKUs of the given line numbers, read from the lines the fix started
 *  from (after the fix they may be gone from the cart). */
function skusOfLines(lineNumbers: number[], lines: Item[]): string[] {
  const skus = lineNumbers
    .map((n) => lines.find((line) => lineNumberOf(line) === n))
    .filter((line): line is Item => Boolean(line))
    .map((line) => line.sku || String(line.id));
  return Array.from(new Set(skus));
}

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
  const [fixLostSkus, setFixLostSkus] = useState<string[]>([]);
  const [fixUnfixableSkus, setFixUnfixableSkus] = useState<string[]>([]);

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
      setFixFailed(false);
      setFixLostSkus([]);
      setFixUnfixableSkus([]);
      const orderId = meta?.orderId || ERP_STATIC.vinc_order_id;
      if (!orderId) {
        // No active cart to apply the fix to — this must still surface as a
        // failure, or the customer could send an order the fix never ran on.
        setFixFailed(true);
        return false;
      }
      setFixing(true);
      // Drop the banner first so the auto-clear watcher re-arms on the fresh
      // result instead of wiping it when the reloaded items arrive.
      clear();
      const lines = itemsRef.current.filter(isCheckableLine);
      let ok = false;
      try {
        const priceMap = await fetchCartPriceMap(
          lines.map((i) => String(i.id)),
        );
        const plan = planPriceFixes(
          result.anomalies,
          lines,
          priceMap,
          new Date(),
          decimals,
        );
        // Lines the plan leaves alone must be named: a refusal the storefront
        // cannot reproduce (the re-check below comes back clean) would
        // otherwise leave the customer stuck with no explanation.
        setFixUnfixableSkus(skusOfLines(plan.unfixable, lines));
        await applyCartFixPlan(String(orderId), plan);
        ok = true;
      } catch (error) {
        console.error('[cart-price-check] fix failed:', error);
        setFixFailed(true);
        // CartFixError.lost lines could not be restored to the cart at all —
        // name the products so the customer can check and re-add them, since
        // the re-check below may come back clean (nothing left to compare a
        // MISSING line against) and silently hide the loss.
        if (error instanceof CartFixError && error.lost.length > 0) {
          setFixLostSkus(skusOfLines(error.lost, lines));
        }
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
    [
      meta?.orderId,
      decimals,
      clear,
      hydrateFromServer,
      setCartSummary,
      recheck,
    ],
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
    () => ({
      enabled,
      status,
      recheck,
      fix,
      fixing,
      fixFailed,
      fixLostSkus,
      fixUnfixableSkus,
    }),
    [
      enabled,
      status,
      recheck,
      fix,
      fixing,
      fixFailed,
      fixLostSkus,
      fixUnfixableSkus,
    ],
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
