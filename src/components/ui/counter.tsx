// AddToCart.tsx
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@contexts/cart/cart.context';
import { generateCartItem } from '@utils/generate-cart-item';
import { useTranslation } from 'src/app/i18n/client';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import MinusIcon from '@components/icons/minus-icon';
import PlusIcon from '@components/icons/plus-icon';
import cn from 'classnames';

interface Props {
  lang: string;
  data: any;
  priceData?: ErpPriceData;
  variation?: any;
  disabled?: boolean;
  className?: string;
}

// ---------- Integer-scaling helpers ----------
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
  return { scale, toUnits, fromUnits };
};

export default function Counter({
  lang,
  data,
  priceData,
  variation,
  disabled,
  className,
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const {
    addItemToCart,
    removeItemFromCart,
    // isInStock, // do NOT hard-disable input on this anymore
    getItemFromCart,
    isInCart,
    setItemQuantity
  } = useCart();

  // Button step (+/-)
  const step = useMemo(() => {
    const v = priceData?.packaging_option_default?.qty_x_packaging ?? 1;
    return v > 0 ? v : 1;
  }, [priceData]);

  // Smallest allowed typed granularity
  const multiple = useMemo(() => {
    const v = priceData?.packaging_option_smallest?.qty_x_packaging ?? 1;
    return v > 0 ? v : 1;
  }, [priceData]);

  const { toUnits, fromUnits } = useMemo(() => makeScaler(step, multiple), [step, multiple]);

  const stepU = toUnits(step);
  const multipleU = toUnits(multiple);

  const availability = priceData?.availability;
  const availabilityU = typeof availability === 'number' && availability > 0 ? toUnits(availability) : Infinity;

  const payloadForCart = useMemo(
    () => ({
      ...data,
      price_discount: priceData?.price_discount,
      gross_price: priceData?.gross_price,
      __cartMeta: {
        price_discount: priceData?.price_discount,
        gross_price: priceData?.gross_price,
        is_promo: (priceData as any)?.is_promo,
        availability: priceData?.availability,
        packaging_default: priceData?.packaging_option_default,
        packaging_smallest: priceData?.packaging_option_smallest,
      },
    }),
    [data, priceData]
  );

  const item = useMemo(() => generateCartItem(payloadForCart, variation), [payloadForCart, variation]);
  const cartEntry = isInCart(item?.id) ? getItemFromCart(item.id) : null;

  const currentQty = cartEntry?.quantity ?? 0;
  const currentU = toUnits(currentQty);

  const [draft, setDraft] = useState<string>(() => String(currentQty || 0));
  useEffect(() => {
    setDraft(String(currentQty || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQty]);

  // Snap any raw value to nearest allowed multiple (in units)
  const snapToMultipleU = (rawU: number) => {
    if (!Number.isFinite(rawU) || rawU <= 0) return 0;
    if (multipleU <= 0) return rawU; // safety
    return Math.max(0, Math.round(rawU / multipleU) * multipleU);
  };

  // Safe change by a *positive* amount only (cart reducer forbids <= 0)
  const addPositive = (deltaU: number) => {
    if (deltaU <= 0) return; // never call addItemToCart with 0 or negative
    addItemToCart(item, fromUnits(deltaU));
  };

  // For decrements, we only support integer-unit removes cleanly.
  // This is perfect when step=1 & multiple=1 (your current case).
  // For fractional steps, prefer adding a setItemQuantity(id, qty) API.
  const removeUnitsSafely = (removeU: number) => {
    if (removeU <= 0) return;
    // convert to whole "1 unit" removes
    const clicks = Math.min(removeU, currentU); // units are already scaled integers
    for (let i = 0; i < clicks; i++) removeItemFromCart(item.id);
  };

  // + button
  const handleIncrement = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    const capU = Number.isFinite(availabilityU) ? availabilityU : Infinity;
    const nextU = Math.min(currentU + stepU, capU);
    if (nextU !== currentU) setItemQuantity(item, fromUnits(nextU));
  };

  // - button
  const handleDecrement = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    const nextU = Math.max(0, currentU - stepU);
    if (nextU !== currentU) setItemQuantity(item, fromUnits(nextU));
  };


  // Commit typed value (exact set; snaps to allowed multiple and caps by ERP availability)
  const commitTyped = () => {
    const rawNum = parseFloat(draft.replace(',', '.'));

    // Reset to current cart quantity if invalid
    if (!Number.isFinite(rawNum) || rawNum < 0) {
      setDraft(String(currentQty || 0));
      return;
    }

    // Convert to integer units and normalize
    let targetU = toUnits(rawNum);
    targetU = snapToMultipleU(targetU);

    // Cap by ERP availability (keeps parity with +/-)
    if (Number.isFinite(availabilityU)) {
      targetU = Math.min(targetU, availabilityU);
    }

    // Single O(1) update to the cart
    setItemQuantity(item, fromUnits(targetU));

    // Reflect normalized value in the input
    setDraft(String(fromUnits(targetU)));
  };

  const outByErp = typeof availability === 'number' && availability <= 0;
  const outOfStock = outByErp || disabled; // do NOT use isInStock() to disable typing
  const isDisabledMinusButton =  currentQty <= 0
  const isDisabledInputNumber =  outOfStock

  // green state when > 0  red if promo added (typed or cart)
  const numericDraft = parseFloat(draft.replace(',', '.'));
  const hasQty = (Number.isFinite(numericDraft) && numericDraft > 0) || currentQty > 0;
  
  const isGreen = hasQty && !priceData?.is_promo;
  const isRed   = hasQty && !!priceData?.is_promo;
  
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isDisabledMinusButton}
        className={cn(
          'w-8 h-8 rounded-full border flex items-center justify-center',
          currentQty > 0 && !outOfStock
            ? 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
            : 'border-gray-300 bg-white text-gray-400 opacity-50 cursor-not-allowed'
        )}
        aria-label={t('button-minus') ?? 'Decrease'}
        title={t('button-minus') ?? 'Decrease'}
      >
        <MinusIcon width="14" height="14" opacity="1" />
      </button>

      <input
        step="any"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitTyped}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitTyped();
          }
        }}
        className={cn(
          'w-20 h-8 text-center rounded-md border text-sm focus:outline-none transition-colors',
          'appearance-none [MozAppearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          isRed
            ? 'bg-red-500 text-white border-red-500 focus:ring-2 focus:ring-red-500 placeholder-white/70'
            : isGreen
              ? 'bg-emerald-500 text-white border-emerald-500 focus:ring-2 focus:ring-emerald-500 placeholder-white/70'
              : 'bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-brand'
        )}
        aria-label={t('text-quantity') ?? 'Quantity'}
        title={t('text-quantity') ?? 'Quantity'}
        disabled={isDisabledInputNumber}
      />

      <button
        type="button"
        onClick={handleIncrement}
        className={cn(
          'w-8 h-8 rounded-full border flex items-center justify-center',
          !outOfStock
            ? 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
            : 'border-gray-300 bg-white text-gray-400 opacity-50 cursor-not-allowed'
        )}
        aria-label={t('button-plus') ?? 'Increase'}
        title={t('button-plus') ?? 'Increase'}
      >
        <PlusIcon width="14" height="14" opacity="1" />
      </button>
    </div>
  );
}
