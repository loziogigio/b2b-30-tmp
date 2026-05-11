'use client';

import { useState, useCallback } from 'react';
import { IoCopyOutline, IoCheckmarkOutline } from 'react-icons/io5';

type Props = {
  value: string;
  className?: string;
};

export default function CopyableCode({ value, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Older browsers / insecure contexts: select-all fallback handled by select-all class.
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? 'Copiato!' : 'Clicca per copiare'}
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide text-[var(--time-dark)] hover:text-[var(--time-red)] cursor-pointer bg-transparent border-none p-0 select-all transition-colors ${className}`}
    >
      <span>{value}</span>
      {copied ? (
        <IoCheckmarkOutline
          size={14}
          className="text-emerald-600 shrink-0"
          aria-hidden
        />
      ) : (
        <IoCopyOutline size={13} className="opacity-50 shrink-0" aria-hidden />
      )}
    </button>
  );
}
