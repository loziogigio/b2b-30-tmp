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

// --- Standard shopping cart icon (outline) ---
const CartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={cn('w-7 h-7', className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
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
        <CartIcon className={cn(iconClassName, 'transition-transform group-hover:scale-105')} />
        {(totalUniqueItems ?? 0) > 0 && (
          <span
            className={cn(
              'min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center',
              'bg-[#E1E7EE] text-black text-[9px] font-bold leading-none',
              'absolute -top-1.5 -right-1.5'
            )}
          >
            {totalUniqueItems}
          </span>
        )}
      </div>
    </button>
  );
};

export default CartButton;
