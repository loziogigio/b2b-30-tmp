'use client';

import React from 'react';
import cn from 'classnames';
import { IoArrowForwardOutline, IoTimeOutline } from 'react-icons/io5';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { useCart } from '@contexts/cart/cart.context';
import { selectBestPrice } from '@framework/pricing/best-price';

type TFn = (key: string, opts?: { defaultValue?: string }) => string;

/**
 * True when the product has an active promo. For variant parents the flag is
 * only honoured when at least one variation actually carries a promo — the
 * PIM `has_active_promo` field on the parent itself can be misleading.
 */
export function hasActivePromo(
  product: any,
  priceData?: ErpPriceData,
): boolean {
  const variations = Array.isArray(product?.variations)
    ? product.variations
    : [];
  if (variations.length > 1) {
    return variations.some((v: any) => !!(v?.has_active_promo || v?.is_promo));
  }
  return !!(priceData?.is_promo || product?.has_active_promo);
}

export type PromoGating = {
  /** The product carries at least one active promo offer. */
  isPromo: boolean;
  /** More than one active promo offer is available. */
  hasMultiplePromos: boolean;
  /** Direct add is gated by promos (multiple offers, or a non-improving promo
   *  such as a min-value / min-pieces threshold). */
  isPromoGated: boolean;
  /** When true, callers may render the inline `<AddToCart>` qty selector. */
  canInlineAdd: boolean;
  /** Total qty for this product across every cart line (LISTINO + PROMOs). */
  cartQty: number;
};

/**
 * Same signal used by the legacy `PvQuantityInput.vue`: when a promo gates the
 * direct add (multiple promos, or a non-improving promo like a threshold), we
 * replace the qty selector with a preview/promo CTA so the user is forced into
 * the promo modal to qualify.
 */
export function usePromoGating(
  priceData: ErpPriceData | undefined,
  product: any,
): PromoGating {
  // The gate must agree with the headline: a SKU that shows a price must get
  // an add button. The old `??` ladder started at `price_discount`, and `??`
  // does not skip 0 — a SKU with price_discount === 0 but a valid net_price or
  // promo displayed a price yet got no add button.
  const hasValidPrice = selectBestPrice(priceData).effectivePrice > 0;
  const canAddToCart = priceData?.product_label_action?.ADD_TO_CART ?? true;
  const isPromo = !!(priceData?.is_promo || priceData?.promo);
  const promoCount = Number(priceData?.count_promo ?? 0);
  const isImprovingPromo = !!priceData?.is_improving_promo;
  const hasMultiplePromos = isPromo && promoCount > 1;
  const isPromoGated = isPromo && (promoCount > 1 || !isImprovingPromo);
  const canInlineAdd = hasValidPrice && canAddToCart && !isPromoGated;

  const cart = useCart() as any;
  const cartItems: any[] = Array.isArray(cart?.items) ? cart.items : [];
  const cartQty = React.useMemo(() => {
    const pid = String(product?.id ?? '');
    if (!pid) return 0;
    return cartItems.reduce(
      (sum, it) =>
        String(it?.id ?? '') === pid ? sum + Number(it?.quantity ?? 0) : sum,
      0,
    );
  }, [cartItems, product]);

  return { isPromo, hasMultiplePromos, isPromoGated, canInlineAdd, cartQty };
}

/**
 * Surfaces past-purchase information for this customer. Mirrors the legacy
 * ProductItemAction.vue `btn-already-purchased`: green pill + last-order date,
 * shown only when the ERP flag `buy_did` is true.
 */
export function TimeAlreadyPurchasedBadge({
  priceData,
  t,
  size = 'md',
  align = 'start',
  inline = false,
  full = false,
}: {
  priceData?: ErpPriceData;
  t: TFn;
  size?: 'sm' | 'md';
  align?: 'start' | 'end';
  /** Render the label + date on a single line instead of stacked. */
  inline?: boolean;
  /** Full one-line block: clock + label + date + quantity. */
  full?: boolean;
}) {
  if (!priceData?.buy_did) return null;
  const date = priceData?.buy_did_last_date;
  const isSm = size === 'sm';
  const uom = priceData?.packaging_option_default?.packaging_uom;
  const amount = (priceData as any)?.buy_did_amount;
  const qty =
    amount != null && Number(amount) > 0
      ? `${amount}${uom ? ` ${uom}` : ''}`
      : '';

  // Full (product detail): one block — clock + label + date + qty.
  if (full) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#16a34a] text-white font-bold rounded-[5px] uppercase tracking-wide font-[family-name:var(--font-body)] whitespace-nowrap text-[11px] sm:text-xs px-2.5 py-1">
        <IoTimeOutline size={13} />
        {t('text-already-ordered', { defaultValue: 'Già ordinato' })}
        {date && (
          <span className="font-mono tabular-nums normal-case">{date}</span>
        )}
        {qty && <span className="normal-case opacity-90">· {qty}</span>}
      </span>
    );
  }

  // Inline (grid): compact — clock + date + qty, no "Ordinato" label. The full
  // wording lives in the hover tooltip.
  if (inline) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 bg-[#16a34a] text-white font-bold rounded-[5px] font-[family-name:var(--font-body)] whitespace-nowrap',
          isSm
            ? 'text-[10px] px-1.5 py-[2px]'
            : 'text-[10px] sm:text-[11px] px-2 py-[3px]',
        )}
        title={
          date
            ? t('text-ordered-on', {
                defaultValue: `Già ordinato il ${date}`,
              })
            : t('text-already-ordered', { defaultValue: 'Già ordinato' })
        }
      >
        <IoTimeOutline size={isSm ? 11 : 12} />
        {date && <span className="font-mono tabular-nums">{date}</span>}
        {qty && <span className="opacity-90">· {qty}</span>}
      </span>
    );
  }

  // Stacked: green label pill above the date.
  return (
    <div
      className={cn(
        'inline-flex flex-col gap-0.5 leading-tight',
        align === 'end' ? 'items-end' : 'items-start',
      )}
    >
      <span
        className={cn(
          'bg-[#16a34a] text-white font-extrabold rounded-[5px] uppercase tracking-wide font-[family-name:var(--font-body)] whitespace-nowrap',
          isSm
            ? 'text-[10px] px-1.5 py-[2px]'
            : 'text-[10px] sm:text-[11px] px-2 py-[3px]',
        )}
      >
        {t('text-already-ordered', { defaultValue: 'Già ordinato' })}
      </span>
      {date && (
        <span
          className={cn(
            'text-[var(--time-gray-500)] font-mono tabular-nums',
            isSm ? 'text-[10px]' : 'text-[10px] sm:text-[11px]',
          )}
        >
          {date}
        </span>
      )}
    </div>
  );
}

/**
 * Small clickable promo label. Mirrors the legacy ProductItemAction.vue
 * `textPromo`: "Vedi offerte" for multi-offer products, "In offerta" for
 * single-promo products. Click opens the preview/promo modal.
 */
export function TimePromoLabel({
  hasMultiplePromos,
  onClick,
  t,
  size = 'md',
}: {
  hasMultiplePromos: boolean;
  onClick: () => void;
  t: TFn;
  size?: 'sm' | 'md';
}) {
  const isSm = size === 'sm';
  const label = hasMultiplePromos
    ? t('text-see-offers', { defaultValue: 'Vedi offerte' })
    : t('text-in-promo', { defaultValue: 'In offerta' });
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'inline-flex items-center bg-[var(--time-red)] text-white font-extrabold px-2 py-[3px] rounded-[5px] uppercase tracking-wide font-[family-name:var(--font-body)] cursor-pointer hover:bg-[var(--time-dark)] transition-colors whitespace-nowrap',
        isSm ? 'text-[10px]' : 'text-[10px] sm:text-[11px]',
      )}
    >
      {label}
    </button>
  );
}

/**
 * Combined badge cluster placed next to the availability indicator: PROMO
 * label on the left, GIÀ ORDINATO on the right. Each badge renders only when
 * its data conditions are met, keeping the layout tidy when both, one, or
 * neither apply.
 */
export function TimeStatusBadges({
  priceData,
  product,
  hasMultiplePromos,
  onPromoClick,
  t,
  size = 'md',
}: {
  priceData?: ErpPriceData;
  product: any;
  hasMultiplePromos: boolean;
  onPromoClick: () => void;
  t: TFn;
  size?: 'sm' | 'md';
}) {
  const showPromo = hasActivePromo(product, priceData);
  const showOrdered = !!priceData?.buy_did;
  if (!showPromo && !showOrdered) return null;
  return (
    <div className="inline-flex items-start gap-1.5 flex-wrap">
      {showPromo && (
        <TimePromoLabel
          hasMultiplePromos={hasMultiplePromos}
          onClick={onPromoClick}
          t={t}
          size={size}
        />
      )}
      {showOrdered && (
        <TimeAlreadyPurchasedBadge
          priceData={priceData}
          t={t}
          size={size}
          full
        />
      )}
    </div>
  );
}

/**
 * 50/50 layout used in promo-gated listings: a cart-total pill on the left and
 * a filled-red PROMO CTA on the right that opens the preview/promo modal.
 * Mirrors the legacy `PvQuantityInput` external-link variant.
 */
export function PromoGatedCta({
  cartQty,
  onClick,
  t,
  size = 'md',
}: {
  cartQty: number;
  onClick: () => void;
  t: TFn;
  size?: 'sm' | 'md';
}) {
  const isMd = size === 'md';
  const heightClass = isMd ? 'h-9' : 'h-8';
  const valueTextClass = isMd ? 'text-[13px]' : 'text-[11px] sm:text-xs';
  const buttonTextClass = isMd
    ? 'text-xs sm:text-[13px]'
    : 'text-[11px] sm:text-xs';
  const iconSize = isMd ? 14 : 12;
  const promoLabel = t('text-promo', { defaultValue: 'Promo' });

  return (
    <div className="flex items-stretch gap-1.5 w-full">
      <span
        className={cn(
          'flex-1 basis-1/2 min-w-0 inline-flex items-center justify-center px-2 rounded-[var(--radius-btn)] font-extrabold tabular-nums font-[family-name:var(--font-body)]',
          heightClass,
          valueTextClass,
          cartQty > 0
            ? 'bg-[var(--time-red)] text-white'
            : 'bg-[var(--time-gray-50)] border-[1.5px] border-[var(--time-gray-200)] text-[var(--time-gray-500)]',
        )}
        title={t('text-in-cart', { defaultValue: 'Nel carrello' })}
      >
        {cartQty}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label={promoLabel}
        title={promoLabel}
        className={cn(
          'flex-1 basis-1/2 min-w-0 rounded-[var(--radius-btn)] border-[1.5px] cursor-pointer transition-colors flex items-center justify-center gap-1 font-[family-name:var(--font-body)] font-bold uppercase tracking-wide border-[var(--time-red)] bg-[var(--time-red)] text-white hover:bg-white hover:text-[var(--time-red)]',
          heightClass,
          buttonTextClass,
        )}
      >
        <span>{promoLabel}</span>
        <IoArrowForwardOutline size={iconSize} />
      </button>
    </div>
  );
}
