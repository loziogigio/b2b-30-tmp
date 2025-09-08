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
  item: Item;                 // existing cart line
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

export default function UpdateCart({ lang, item, className, disabled }: Props) {
  const { getItemFromCart, setItemQuantity, addToCartServer } = useCart() as any;

  // Always use the freshest version from context
  const live = getItemFromCart(item.id) ?? item;
  const qty = Number(live?.quantity ?? 0);

  // --- derive step & multiple from packaging_options_all on the cart item ---
  const options = (live as any)?.packaging_options_all as
    | Array<{ packaging_is_default?: boolean; packaging_is_smallest?: boolean; qty_x_packaging?: number | string }>
    | undefined;

  const def =
    options?.find(o => o?.packaging_is_default) ??
    (live as any)?.__cartMeta?.packaging_default;

  const sml =
    options?.find(o => o?.packaging_is_smallest) ??
    (live as any)?.__cartMeta?.packaging_smallest;

  const stepQty = Number(def?.qty_x_packaging ?? 1) || 1;          // increment size
  const multipleQty = Number(sml?.qty_x_packaging ?? stepQty) || 1; // snapping multiple

  const { toUnits, fromUnits } = makeScaler(stepQty, multipleQty);

  // promo identity for sameLine() on server
  const promo_code = (live as any)?.promo_code ?? 0;
  const promo_row  = (live as any)?.promo_row  ?? 0;
  const isPromo    = Boolean(promo_code && String(promo_code) !== '0');

  // counter state (controlled string)
  const [draft, setDraft] = React.useState<string>(String(qty || 0));
  React.useEffect(() => setDraft(String(qty || 0)), [qty]);

  const [isSyncing, setIsSyncing] = React.useState(false);

  const send = async (newQty: number) => {
    // optimistic local update
    setItemQuantity(live, newQty);

    const payload: AddToCartInput = {
      item_id: (live as any).id,
      quantity: newQty,
      promo_code,
      promo_row,
    };

    setIsSyncing(true);
    try {
      await addToCartServer?.(payload, live);
    } finally {
      setIsSyncing(false);
    }
  };

  // Use integer "units" to be decimal-safe
  const currentU = toUnits(qty);

  const increment = () => {
    const nextU = currentU + toUnits(stepQty);
    const next = fromUnits(nextU);
    setDraft(String(next));
    send(next);
  };

  const decrement = () => {
    const nextU = Math.max(0, currentU - toUnits(stepQty));
    const next = fromUnits(nextU);
    setDraft(String(next));
    send(next);
  };

  const commit = () => {
    const n = parseNum(draft);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(qty || 0));
      return;
    }
    let targetU = toUnits(n);
    const mulU = toUnits(multipleQty);
    if (mulU > 0) {
      // snap to nearest multiple of the smallest packaging
      targetU = Math.round(targetU / mulU) * mulU;
    }
    const snapped = fromUnits(targetU);
    setDraft(String(snapped));
    if (snapped !== qty) send(snapped);
  };

  const variant: 'neutral' | 'green' | 'red' =
    qty > 0 ? (isPromo ? 'red' : 'green') : 'neutral';

  return (
    <Counter
      lang={lang}
      className={cn('w-full h-10', className ? className : 'justify-center')}
      value={draft}
      onChangeValue={setDraft}
      onCommit={commit}
      onIncrement={increment}
      onDecrement={decrement}
      disabled={isSyncing || disabled}
      disableMinus={isSyncing || qty <= 0}
      disablePlus={isSyncing || disabled}
      variant={variant}
    />
  );
}
