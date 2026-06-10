'use client';

import React, { useState } from 'react';

type Props = {
  status: 'idle' | 'loading' | 'valid' | 'invalid' | 'error';
  message: string;
  onApply: (code: string) => void;
  placeholder: string;
  applyLabel: string;
};

/** Coupon code input + Apply button. Stateless re: validity — parent owns useCoupon. */
export default function TimeCouponField({ status, message, onApply, placeholder, applyLabel }: Props) {
  const [code, setCode] = useState('');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-3.5 py-2.5 text-[13px] text-[var(--time-dark)] bg-white outline-none transition-all focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]"
        />
        <button
          type="button"
          onClick={() => onApply(code)}
          disabled={status === 'loading' || !code}
          className="px-4 py-2.5 text-[13px] font-bold rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white disabled:opacity-50"
        >
          {applyLabel}
        </button>
      </div>
      {message && (
        <p className={status === 'valid' ? 'text-emerald-600 text-[12px]' : 'text-red-600 text-[12px]'}>
          {message}
        </p>
      )}
    </div>
  );
}
