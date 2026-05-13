'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import Counter from '@components/ui/counter';
import { useCart } from '@contexts/cart/cart.context';
import type { Item } from '@contexts/cart/cart.utils';
import { generateCartItem } from '@utils/generate-cart-item';
import { useTranslation } from 'src/app/i18n/client';
import { toast } from 'react-toastify';
import type { ErpPriceData } from '@utils/transform/erp-prices';

interface AddToCartProps {
  lang: string;
  product: any;
  variation?: any;
  disabled?: boolean;
  priceData?: ErpPriceData;
  showPlaceholder?: boolean;
  className?: string;
  /**
   * Override the entity_code sent to the server. Useful when `variation` is a
   * synthetic line key (e.g. one PROMO line per offer) and the local cart id
   * must differ from the real product id sent to the ERP.
   */
  serverItemId?: string | number;
  size?: 'sm' | 'md';
}

/** Skeleton to avoid layout shift while loading */
function CounterPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-full h-10 rounded-md border border-gray-200 bg-gray-100 animate-pulse',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

// ----- helpers -----
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

const buildAddPayload = (args: {
  itemId: string | number;
  qty: number;
  priceData?: ErpPriceData;
  promo_code?: string | number | null;
  promo_row?: string | number | null;
}) => {
  const { itemId, qty, priceData, promo_code, promo_row } = args;

  // Merge base discounts with extras (fill first empty slots)
  const mergeDiscounts = (baseArr: any[], extraArr: any[], slots = 6) => {
    const base = (baseArr ?? []).slice(0, slots).map((n) => Number(n) || 0);
    const extras = (extraArr ?? []).map((n) => Number(n) || 0);

    // fill first zero slots with non-zero extras (negative or positive)
    for (const v of extras) {
      if (v === 0) continue; // change to `if (v <= 0) continue;` if you truly want only >0
      const idx = base.findIndex((x) => x === 0);
      if (idx === -1) break;
      base[idx] = v;
    }

    while (base.length < slots) base.push(0);
    return base.slice(0, slots);
  };

  const rawDiscounts = Array.isArray((priceData as any)?.discount)
    ? (priceData as any).discount
    : [];

  const extraDiscounts = Array.isArray((priceData as any)?.discount_extra)
    ? (priceData as any).discount_extra
    : [];

  const [d1, d2, d3, d4, d5, d6] = mergeDiscounts(rawDiscounts, extraDiscounts);

  return {
    item_id: itemId,
    quantity: qty,

    // prices
    price: Number(priceData?.gross_price ?? 0),
    price_discount: Number(priceData?.net_price ?? 0),
    vat_perc: String(priceData?.vat_perc ?? 0),

    // discounts (from array)
    discount1: d1,
    discount2: d2,
    discount3: d3,
    discount4: d4,
    discount5: d5,
    discount6: d6,

    // packaging + list
    qty_min_packing: Number(
      priceData?.packaging_option_default?.qty_x_packaging ?? 1,
    ),
    listino_type: String((priceData as any)?.listino_type ?? '1'),
    listino_code: String((priceData as any)?.listino_code ?? 'VEND'),

    // promo
    promo_code: promo_code ?? (priceData as any)?.promo_code ?? 0,
    promo_row: promo_row ?? (priceData as any)?.promo_row ?? 0,
  };
};

export default function AddToCart({
  lang,
  product,
  variation,
  priceData,
  disabled,
  showPlaceholder = true,
  className,
  serverItemId,
  size = 'md',
}: AddToCartProps) {
  // 1) CALL HOOKS UNCONDITIONALLY AND IN THE SAME ORDER
  const { t } = useTranslation(lang, 'common');
  const {
    setItemQuantity,
    isInCart,
    getItemFromCart,
    addToCartServer, // provided by your CartContext
  } = useCart() as any;

  const meta = product?.__cartMeta;
  const effectivePriceData = (priceData ?? meta) as ErpPriceData | undefined;

  // Derive scalers even if data is missing (use safe fallbacks)
  const step = Math.max(
    Number(effectivePriceData?.packaging_option_default?.qty_x_packaging ?? 1),
    1,
  );
  const multiple = Math.max(
    Number(effectivePriceData?.packaging_option_smallest?.qty_x_packaging ?? 1),
    1,
  );
  const { toUnits, fromUnits } = useMemo(
    () => makeScaler(step, multiple),
    [step, multiple],
  );

  const availability = effectivePriceData?.availability;
  const availabilityU =
    typeof availability === 'number' && availability > 0
      ? toUnits(availability)
      : Infinity;

  // Local cart item (safe even without priceData)
  const payloadForCart = useMemo(
    () => ({
      ...product,
      price_discount: effectivePriceData?.price_discount,
      gross_price: effectivePriceData?.gross_price,
      promo_code: (effectivePriceData as any)?.promo_code,
      promo_row: (effectivePriceData as any)?.promo_row,
      __cartMeta: {
        price_discount: effectivePriceData?.price_discount,
        gross_price: effectivePriceData?.gross_price,
        is_promo: (effectivePriceData as any)?.is_promo,
        availability: effectivePriceData?.availability,
        packaging_option_default: effectivePriceData?.packaging_option_default,
        packaging_option_smallest:
          effectivePriceData?.packaging_option_smallest,
        packaging_options_all: effectivePriceData?.packaging_options_all,
        promo_code: (effectivePriceData as any)?.promo_code,
        promo_row: (effectivePriceData as any)?.promo_row,
        listino_type: (effectivePriceData as any)?.listino_type,
        listino_code: (effectivePriceData as any)?.listino_code,
      },
    }),
    [product, effectivePriceData],
  );

  const item = useMemo(
    () => generateCartItem(payloadForCart, variation),
    [payloadForCart, variation],
  );

  // Promo-aware lookup: a single product can sit in the cart under multiple
  // tiers (LISTINO with no promo + a PROMO row). Each AddToCart instance must
  // read the line that matches its own promo identity, otherwise the wrong
  // counter gets shown / mutated.
  //
  // CRITICAL: when a synthetic `variation` is passed (e.g. b2b-offer-rows.tsx
  // builds one per promo offer), generateCartItem mangles the id to
  // `${productId}.${variation.id}`. The actual cart line's id is the
  // unmangled entity_code, so we must match against `productId` first and fall
  // back to `id` for non-variation cases.
  const { items: cartItems } = useCart() as any;
  const cartEntry = useMemo(() => {
    if (!Array.isArray(cartItems)) return null;
    const lookupId = String(
      (item as any)?.productId ?? serverItemId ?? item?.id ?? '',
    );
    if (!lookupId) return null;
    const targetCode = String(
      (item as any)?.promo_code ?? (item as any)?.__cartMeta?.promo_code ?? 0,
    );
    const targetRow = String(
      (item as any)?.promo_row ?? (item as any)?.__cartMeta?.promo_row ?? 0,
    );
    return (
      cartItems.find(
        (i: any) =>
          String(i.id) === lookupId &&
          String(i.promo_code ?? 0) === targetCode &&
          String(i.promo_row ?? 0) === targetRow,
      ) ?? null
    );
  }, [cartItems, item, serverItemId]);

  const currentQty = Number(cartEntry?.quantity ?? 0);

  // Suppress unused warnings for legacy lookups kept for backwards compat
  void isInCart;
  void getItemFromCart;

  // Tracks the most recent target quantity across rapid clicks so the next
  // click always increments from the latest intent — not from a render
  // closure that may not have committed yet.
  const pendingTargetRef = useRef<number>(currentQty);

  // Draft & debounce + syncing flag
  const [draft, setDraft] = useState<string>(() => String(currentQty || 0));
  useEffect(() => {
    setDraft(String(currentQty || 0));
    pendingTargetRef.current = currentQty;
  }, [currentQty]);

  const [isSyncing, setIsSyncing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const snapToMultipleU = (rawU: number) => {
    if (!Number.isFinite(rawU) || rawU <= 0) return 0;
    const mulU = toUnits(multiple);
    return Math.max(0, Math.round(rawU / mulU) * mulU);
  };

  // The server-side line uses the base entity_code as id (no variation suffix).
  // Build a "lookup item" with the unmangled id so the reducer's promo-aware
  // matcher can find the existing cart line during the optimistic update,
  // instead of pushing a phantom row.
  const lookupItem = useMemo(() => {
    const baseId = (item as any)?.productId ?? serverItemId ?? item?.id;
    return {
      ...item,
      id: baseId,
      promo_code: (item as any)?.promo_code ?? item.__cartMeta?.promo_code,
      promo_row: (item as any)?.promo_row ?? item.__cartMeta?.promo_row,
    } as Item;
  }, [item, serverItemId]);

  const scheduleSync = (targetU: number) => {
    // Snap qty up to a multiple of the packaging step before sending.
    // The packaging_option_default.qty_x_packaging is the minimum
    // sellable unit (e.g. a promo with qty_required=2 sets step=2), and
    // the BE rejects sub-step quantities with "Minimum order quantity is N".
    const stepU = toUnits(step);
    const snappedU =
      targetU > 0 && stepU > 0
        ? Math.ceil(targetU / stepU) * stepU
        : targetU;

    setItemQuantity(lookupItem, fromUnits(snappedU));
    if (snappedU !== targetU) {
      pendingTargetRef.current = fromUnits(snappedU);
      setDraft(String(fromUnits(snappedU)));
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const payload = buildAddPayload({
          itemId: serverItemId ?? lookupItem.id,
          qty: fromUnits(snappedU),
          priceData: effectivePriceData,
          promo_code: item.__cartMeta?.promo_code,
          promo_row: item.__cartMeta?.promo_row,
        });
        await addToCartServer?.(payload, lookupItem);
      } catch (err: any) {
        // The BE returns 4xx with `{ error: "..." }` (e.g. min-quantity,
        // out-of-stock). Surface it as a toast instead of letting the
        // axios error escape to the Next.js runtime overlay.
        const beMessage =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Errore durante l\'aggiunta al carrello';
        toast.error(beMessage);
        // Roll back the optimistic update so the input reflects the
        // server-side state, not the rejected qty.
        setItemQuantity(lookupItem, 0);
        pendingTargetRef.current = 0;
        setDraft('0');
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  };

  const increment = () => {
    const capU = Number.isFinite(availabilityU) ? availabilityU : Infinity;
    const baseU = toUnits(pendingTargetRef.current);
    const nextU = Math.min(baseU + toUnits(step), capU);
    if (nextU === baseU) return;
    const next = fromUnits(nextU);
    pendingTargetRef.current = next;
    setDraft(String(next));
    scheduleSync(nextU);
  };

  const decrement = () => {
    const baseU = toUnits(pendingTargetRef.current);
    const nextU = Math.max(0, baseU - toUnits(step));
    if (nextU === baseU) return;
    const next = fromUnits(nextU);
    pendingTargetRef.current = next;
    setDraft(String(next));
    scheduleSync(nextU);
  };

  const commit = () => {
    const rawNum = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(rawNum) || rawNum < 0) {
      setDraft(String(currentQty || 0));
      return;
    }
    let targetU = toUnits(rawNum);
    targetU = snapToMultipleU(targetU);
    if (Number.isFinite(availabilityU))
      targetU = Math.min(targetU, availabilityU);
    const next = fromUnits(targetU);
    pendingTargetRef.current = next;
    setDraft(String(next));
    scheduleSync(targetU);
  };

  const outByErp = typeof availability === 'number' && availability <= 0;
  const outOfStock = outByErp || disabled;

  const numericDraft = parseFloat(draft.replace(',', '.'));
  const hasQty =
    (Number.isFinite(numericDraft) && numericDraft > 0) || currentQty > 0;
  const variant: 'neutral' | 'green' | 'red' =
    hasQty && (effectivePriceData as any)?.is_promo
      ? 'red'
      : hasQty
        ? 'green'
        : 'neutral';

  // 2) ONLY DECIDE WHAT TO RENDER HERE (NO EARLY-RETURN BEFORE HOOKS)
  const renderPlaceholder = !effectivePriceData && showPlaceholder;

  if (renderPlaceholder) {
    return <CounterPlaceholder className="w-full" />;
  }

  return (
    <Counter
      lang={lang}
      className={cn(
        'w-full',
        size === 'sm' ? 'h-8' : 'h-10',
        className ? className : 'justify-center',
      )}
      value={draft}
      onChangeValue={setDraft}
      onCommit={commit}
      onIncrement={increment}
      onDecrement={decrement}
      disabled={isSyncing || disabled}
      disableMinus={isSyncing || currentQty <= 0}
      disablePlus={isSyncing || disabled}
      variant={variant}
      size={size}
    />
  );
}
