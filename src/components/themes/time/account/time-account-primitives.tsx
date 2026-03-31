'use client';

import { useState } from 'react';
import cn from 'classnames';

/* ── TimeCard ─────────────────────────────────────────────────────── */

interface TimeCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function TimeCard({ children, className, hover }: TimeCardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--time-gray-100)] bg-white overflow-hidden transition-shadow duration-200',
        hover && 'hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── TimeSectionHeader ────────────────────────────────────────────── */

interface TimeSectionHeaderProps {
  title: string;
  action?: () => void;
  actionLabel?: string;
}

export function TimeSectionHeader({
  title,
  action,
  actionLabel = 'Vedi tutti',
}: TimeSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[14px] border-b border-[var(--time-gray-100)]">
      <h3 className="text-[15px] font-extrabold text-[var(--time-dark)] font-[var(--font-display)] tracking-[-0.01em]">
        {title}
      </h3>
      {action && (
        <button
          type="button"
          onClick={action}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--time-red)] font-[var(--font-body)] hover:underline"
        >
          {actionLabel}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="9,6 15,12 9,18" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── TimeInfoRow ──────────────────────────────────────────────────── */

interface TimeInfoRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}

export function TimeInfoRow({
  label,
  value,
  copyable = false,
  mono = false,
}: TimeInfoRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--time-gray-50)]">
      <span className="text-[13px] text-[var(--time-gray-500)] font-[var(--font-body)]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-[13px] font-semibold text-[var(--time-dark)]',
            mono ? 'font-[var(--font-mono)]' : 'font-[var(--font-body)]',
          )}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'p-0.5 transition-colors',
              copied
                ? 'text-emerald-600'
                : 'text-[var(--time-gray-400)] hover:text-[var(--time-dark)]',
            )}
          >
            {copied ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── TimeStatusBadge ──────────────────────────────────────────────── */

interface TimeStatusBadgeProps {
  label: string;
  color: string;
  bg: string;
}

export function TimeStatusBadge({ label, color, bg }: TimeStatusBadgeProps) {
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px] font-[var(--font-body)]"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

/* ── TimeIconBox ──────────────────────────────────────────────────── */

interface TimeIconBoxProps {
  icon: React.ReactNode;
  color: string;
  bg: string;
  size?: number;
}

export function TimeIconBox({ icon, color, bg, size = 36 }: TimeIconBoxProps) {
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-[9px]"
      style={{ width: size, height: size, color, background: bg }}
    >
      {icon}
    </div>
  );
}
