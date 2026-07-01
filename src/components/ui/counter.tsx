'use client';

import React from 'react';
import cn from 'classnames';
import MinusIcon from '@components/icons/minus-icon';
import PlusIcon from '@components/icons/plus-icon';
import { useTranslation } from 'src/app/i18n/client';

type Variant = 'neutral' | 'green' | 'red';

export interface CounterProps {
  lang: string;
  value: string; // controlled input value
  onChangeValue: (v: string) => void;
  onCommit: () => void; // called on blur / Enter
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean; // locks input + buttons
  disableMinus?: boolean;
  disablePlus?: boolean;
  variant?: Variant; // input color: neutral/green/red
  className?: string;
  /** 'sm' uses compact 28px controls, default 32px */
  size?: 'sm' | 'md';
}

export default function Counter({
  lang,
  value,
  onChangeValue,
  onCommit,
  onIncrement,
  onDecrement,
  disabled,
  disableMinus,
  disablePlus,
  variant = 'neutral',
  className,
  size = 'md',
}: CounterProps) {
  const { t } = useTranslation(lang, 'common');

  const isSm = size === 'sm';
  const btnSize = isSm ? 'w-7 h-7' : 'w-8 h-8';
  const inputHeight = isSm ? 'h-7' : 'h-8';
  const iconSize = isSm ? '12' : '14';

  // Solid-color (red/green) input is the loud "in cart" state. Neutral is the
  // empty/idle state. Padding is reduced and font-weight bumped so the number
  // stays readable even when the column is narrow.
  const inputClasses = cn(
    'flex-1 min-w-0 w-full text-center rounded-md border text-sm font-bold tabular-nums focus:outline-none transition-colors px-1',
    inputHeight,
    'appearance-none [MozAppearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
    variant === 'red'
      ? 'bg-red-500 text-white border-red-500 focus:ring-2 focus:ring-red-500/40 placeholder-white/70'
      : variant === 'green'
        ? 'bg-emerald-500 text-white border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 placeholder-white/70'
        : 'bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-brand/40 focus:border-brand',
  );

  const buttonBase = cn(
    btnSize,
    'shrink-0 rounded-full border flex items-center justify-center transition-colors',
  );

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled || disableMinus}
        className={cn(
          buttonBase,
          !(disabled || disableMinus)
            ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200'
            : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed',
        )}
        aria-label={t('button-minus') ?? 'Decrease'}
        title={t('button-minus') ?? 'Decrease'}
      >
        <MinusIcon width={iconSize} height={iconSize} opacity="1" />
      </button>

      <input
        step="any"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        min="0"
        data-variant={variant}
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          }
        }}
        // Stop the browser from incrementing the value on wheel/scroll
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        className={inputClasses}
        aria-label={t('text-quantity') ?? 'Quantity'}
        title={t('text-quantity') ?? 'Quantity'}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || disablePlus}
        className={cn(
          buttonBase,
          !(disabled || disablePlus)
            ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200'
            : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed',
        )}
        aria-label={t('button-plus') ?? 'Increase'}
        title={t('button-plus') ?? 'Increase'}
      >
        <PlusIcon width={iconSize} height={iconSize} opacity="1" />
      </button>
    </div>
  );
}
