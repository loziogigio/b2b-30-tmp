'use client';

import React from 'react';
import cn from 'classnames';
import MinusIcon from '@components/icons/minus-icon';
import PlusIcon from '@components/icons/plus-icon';
import { useTranslation } from 'src/app/i18n/client';

type Variant = 'neutral' | 'green' | 'red';

export interface CounterProps {
  lang: string;
  value: string;                         // controlled input value
  onChangeValue: (v: string) => void;
  onCommit: () => void;                  // called on blur / Enter
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;                    // locks input + buttons
  disableMinus?: boolean;
  disablePlus?: boolean;
  variant?: Variant;                     // input color: neutral/green/red
  className?: string;
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
}: CounterProps) {
  const { t } = useTranslation(lang, 'common');

  const inputClasses = cn(
    'w-20 h-8 text-center rounded-md border text-sm focus:outline-none transition-colors',
    'appearance-none [MozAppearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
    variant === 'red'
      ? 'bg-red-500 text-white border-red-500 focus:ring-2 focus:ring-red-500 placeholder-white/70'
      : variant === 'green'
        ? 'bg-emerald-500 text-white border-emerald-500 focus:ring-2 focus:ring-emerald-500 placeholder-white/70'
        : 'bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-brand'
  );

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled || disableMinus}
        className={cn(
          'w-8 h-8 rounded-full border flex items-center justify-center',
          !(disabled || disableMinus)
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
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          }
        }}
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
          'w-8 h-8 rounded-full border flex items-center justify-center',
          !(disabled || disablePlus)
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
