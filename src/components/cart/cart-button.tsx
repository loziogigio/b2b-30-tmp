'use client';

import React from 'react';
import cn from 'classnames';
import { useCart } from '@contexts/cart/cart.context';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';

type CartButtonProps = {
  lang: string;
  className?: string;
  iconClassName?: string;
  hideLabel?: boolean; // legacy flag: hides summary entirely
  currency?: string;         // default "EUR"
  locale?: string;           // default "it-IT"
  summaryVariant?: 'full' | 'amount' | 'none';
};

const formatCurrency = (n: number, currency = 'EUR', locale = 'it-IT') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(n || 0));

// --- New B2B cart icon (trolley + boxes) ---
const B2BCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 64 40"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={cn('w-12 h-12', className)}
  >
    {/* handle */}
    <path d="M10 6 v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M10 6 h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* deck */}
    <rect x="16" y="26" width="32" height="4" rx="1.5" fill="currentColor" opacity="0.85" />
    {/* wheels */}
    <circle cx="20" cy="33" r="3.5" fill="currentColor" />
    <circle cx="42" cy="33" r="3.5" fill="currentColor" />
    {/* boxes */}
    <rect x="20" y="11" width="12" height="10" rx="1.5" fill="currentColor" opacity="0.35" />
    <rect x="34" y="11" width="10" height="14" rx="1.5" fill="currentColor" opacity="0.35" />
    <rect x="24" y="6" width="10" height="6" rx="1.2" fill="currentColor" opacity="0.55" />
    {/* box slits */}
    <path d="M24 16 h6M24 18 h4" stroke="currentColor" strokeWidth="1.8" opacity="0.6" />
    <path d="M36 17 h6M36 19 h4" stroke="currentColor" strokeWidth="1.8" opacity="0.6" />
    <path d="M26 9 h5" stroke="currentColor" strokeWidth="1.8" opacity="0.6" />
  </svg>
);

const CartButton: React.FC<CartButtonProps> = ({
  lang,
  className,
  iconClassName = 'text-gray-700',
  hideLabel,
  currency = 'EUR',
  locale = 'it-IT',
  summaryVariant = 'full',
}) => {
  const { t } = useTranslation(lang, 'common');
  const { openDrawer, setDrawerView } = useUI();
  const { totalItems, totalUniqueItems, total, meta } = useCart();

  function handleCartOpen() {
    setDrawerView('CART_SIDEBAR');
    return openDrawer();
  }

  const amount = formatCurrency(total || 0, currency, locale);

  const resolvedVariant: 'full' | 'amount' | 'none' = hideLabel ? 'none' : summaryVariant;

  return (
    <button
      className={cn(
        'group flex items-center justify-center gap-3 shrink-0 h-auto focus:outline-none',
        className,
      )}
      onClick={handleCartOpen}
      aria-label="cart-button"
    >
      {/* Two-row info block (before icon) */}
      {resolvedVariant !== 'none' && (
        <div className="flex flex-col items-end leading-tight">
          {resolvedVariant === 'full' ? (
            <div className="text-[11px] uppercase tracking-wide text-gray-600">
              {t('text-cart')}
            </div>
          ) : null}
          {resolvedVariant !== 'none' ? (
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {amount}
            </div>
          ) : null}
        </div>
      )}

      {/* Icon with badge */}
      <div className="relative flex items-center">
        <B2BCartIcon className={cn(iconClassName, 'transition-transform group-hover:scale-105')} />
        <span
          className={cn(
            'min-w-[20px] min-h-[20px] p-0.5 rounded-[20px] flex items-center justify-center',
            'bg-red-600 text-white text-[10px] font-bold',
            'absolute -top-0 ltr:right-0.5'
          )}
        >          {totalUniqueItems ?? 0}
        </span>
      </div>
    </button>
  );
};

export default CartButton;
