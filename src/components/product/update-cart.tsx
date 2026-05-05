// components/product/update-cart.tsx
'use client';

import React from 'react';
import cn from 'classnames';
import Counter from '@components/ui/counter';
import { useCart } from '@contexts/cart/cart.context';
import type { Item } from '@contexts/cart/cart.utils';
import type { AddToCartInput } from '@utils/transform/cart';

type Props = {
  lang: string;
  item: Item; // existing cart line
  className?: string;
  disabled?: boolean;
};

// ---- helpers for decimal-safe stepping & snapping ----
const decimalsOf = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  return s.includes('.') ? s.split('.')[1].length : 0;
};

const makeScaler = (step: number, multiple: number) => {
  const places = Math.max(decimalsOf(step), decimalsOf(multiple), 0);
  const scale = Math.pow(10, places);
  const toUnits = (x: number) => Math.round(x * scale);
  const fromUnits = (u: number) => u / scale;
  return { toUnits, fromUnits };
};

const parseNum = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const SYNC_DEBOUNCE_MS = 500;

export default function UpdateCart({ lang, item, className, disabled }: Props) {
  const {
    items: cartItems,
    setItemQuantity,
    addToCartServer,
  } = useCart() as any;

  // Match by id + promo identity so PROMO and LISTINO lines for the same SKU
  // stay isolated. Falling back to the prop avoids a flash of empty state
  // before the live cart hydrates.
  const itemPromoCode = String((item as any).promo_code ?? 0);
  const itemPromoRow = String((item as any).promo_row ?? 0);
  const live =
    (Array.isArray(cartItems)
      ? cartItems.find(
          (i: any) =>
            String(i.id) === String(item.id) &&
            String(i.promo_code ?? 0) === itemPromoCode &&
            String(i.promo_row ?? 0) === itemPromoRow,
        )
      : null) ?? item;
  const serverQty = Number(live?.quantity ?? 0);

  // --- derive step & multiple from packaging_options_all on the cart item ---
  const options = (live as any)?.packaging_options_all as
    | Array<{
        packaging_is_default?: boolean;
        packaging_is_smallest?: boolean;
        qty_x_packaging?: number | string;
      }>
    | undefined;

  const def =
    options?.find((o) => o?.packaging_is_default) ??
    (live as any)?.__cartMeta?.packaging_default;

  const sml =
    options?.find((o) => o?.packaging_is_smallest) ??
    (live as any)?.__cartMeta?.packaging_smallest;

  const stepQty = Number(def?.qty_x_packaging ?? 1) || 1; // increment size
  const multipleQty = Number(sml?.qty_x_packaging ?? stepQty) || 1; // snap multiple

  const { toUnits, fromUnits } = makeScaler(stepQty, multipleQty);

  // promo identity for sameLine() on server
  const promo_code = (live as any)?.promo_code ?? 0;
  const promo_row = (live as any)?.promo_row ?? 0;
  const isPromo = Boolean(promo_code && String(promo_code) !== '0');

  // ---- Local quantity state ----
  // `local` is what the user sees and manipulates. It diverges from server qty
  // during the debounce window, then converges back when the server response
  // arrives.
  const [local, setLocal] = React.useState<number>(serverQty);
  const [draft, setDraft] = React.useState<string>(String(serverQty || 0));
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Tracks the most recent target qty across rapid clicks so increment/
  // decrement always start from the latest intent — not from a render
  // closure that may not have committed yet.
  const pendingTargetRef = React.useRef<number>(serverQty);

  // Keep latest sent qty so we can skip redundant calls and ignore stale syncs
  const lastSentRef = React.useRef<number>(serverQty);
  // Active debounce timer + AbortController-style flag for stale callbacks
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = React.useRef(0); // monotonic id for the latest in-flight call

  // When the SERVER quantity changes (cart re-fetched), pull the new value
  // into the local view — but only if there's no pending debounced change.
  React.useEffect(() => {
    if (timerRef.current != null) return; // user is mid-edit, don't clobber
    setLocal(serverQty);
    setDraft(String(serverQty || 0));
    lastSentRef.current = serverQty;
    pendingTargetRef.current = serverQty;
  }, [serverQty]);

  // Cleanup any pending timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  /**
   * Schedule a server sync. Mirrors the legacy PvQuantityInput.vue debounce:
   * - Coalesce rapid clicks into a single PATCH after 500ms of inactivity
   * - Skip if the target equals the last value we sent (or the live server qty)
   * - Tag each call with a sequence id so a late response from a superseded
   *   call cannot overwrite the latest state
   */
  const scheduleSync = React.useCallback(
    (target: number) => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        if (target === lastSentRef.current) return;

        // Optimistic local cart update so totals/UI react immediately
        setItemQuantity(live, target);
        lastSentRef.current = target;

        const mySeq = ++seqRef.current;
        const payload: AddToCartInput = {
          item_id: (live as any).id,
          quantity: target,
          promo_code,
          promo_row,
        };
        setIsSyncing(true);
        try {
          await addToCartServer?.(payload, live);
        } finally {
          // Only the latest call clears the syncing flag — earlier ones are stale
          if (mySeq === seqRef.current) setIsSyncing(false);
        }
      }, SYNC_DEBOUNCE_MS);
    },
    [live, promo_code, promo_row, setItemQuantity, addToCartServer],
  );

  // ---- User actions: update local state immediately, debounce server call ----
  const applyLocal = (next: number) => {
    pendingTargetRef.current = next;
    setLocal(next);
    setDraft(String(next));
    scheduleSync(next);
  };

  const increment = () => {
    const baseU = toUnits(pendingTargetRef.current);
    const next = fromUnits(baseU + toUnits(stepQty));
    applyLocal(next);
  };

  const decrement = () => {
    const baseU = toUnits(pendingTargetRef.current);
    const next = fromUnits(Math.max(0, baseU - toUnits(stepQty)));
    applyLocal(next);
  };

  const commit = () => {
    const n = parseNum(draft);
    if (!Number.isFinite(n) || n < 0) {
      // Reset to the last known good value
      setDraft(String(local || 0));
      return;
    }
    let targetU = toUnits(n);
    const mulU = toUnits(multipleQty);
    if (mulU > 0 && targetU > 0) {
      // Snap up to the nearest multiple of the smallest packaging
      const remainder = targetU % mulU;
      if (remainder !== 0) targetU = targetU + (mulU - remainder);
    }
    const snapped = fromUnits(targetU);
    if (snapped !== local) {
      applyLocal(snapped);
    } else {
      setDraft(String(snapped));
    }
  };

  const variant: 'neutral' | 'green' | 'red' =
    local > 0 ? (isPromo ? 'red' : 'green') : 'neutral';

  // Suppress unused warning — kept for potential future indicator
  void isSyncing;

  return (
    <Counter
      lang={lang}
      className={cn('w-full h-10', className ? className : 'justify-center')}
      value={draft}
      onChangeValue={setDraft}
      onCommit={commit}
      onIncrement={increment}
      onDecrement={decrement}
      disabled={disabled}
      disableMinus={local <= 0 || disabled}
      disablePlus={disabled}
      variant={variant}
    />
  );
}
