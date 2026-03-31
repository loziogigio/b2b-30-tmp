'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@components/ui/breadcrumb';
import { useCart } from '@contexts/cart/cart.context';
import TimeCartTable from './time-cart-table';
import TimeOrderSummary from './time-order-summary';
import TimeSavedCarts from './time-saved-carts';
import TimeProcessingOrders from './time-processing-orders';
import { useTranslation } from 'src/app/i18n/client';

// ── icons ────────────────────────────────────────────────────────────────────

const ArrowLeft = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12,19 5,12 12,5" />
  </svg>
);

const PrinterIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <polyline points="6,9 6,2 18,2 18,9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

// ── component ────────────────────────────────────────────────────────────────

const SidebarIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    {open ? (
      <polyline points="15,10 12,13 15,16" />
    ) : (
      <polyline points="13,10 16,13 13,16" />
    )}
  </svg>
);

export default function TimeCheckoutPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  const scrollToSummary = () => {
    summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="font-[var(--font-body)] bg-[var(--time-gray-50)] min-h-[calc(100vh-200px)]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* ── Breadcrumb + actions ───────────────────────────────────── */}
        <div className="flex items-center justify-between py-4 border-b border-[var(--time-gray-100)]">
          <div className="flex items-center gap-3">
            <Breadcrumb lang={lang} />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${lang}`}
              className="h-[38px] px-4 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] bg-white text-[12px] font-semibold text-[var(--time-gray-600)] flex items-center gap-2 transition-colors hover:border-[var(--time-dark)] hover:text-[var(--time-dark)]"
            >
              <ArrowLeft /> Torna al Catalogo
            </Link>

            <button
              onClick={() => window.print()}
              className="w-[38px] h-[38px] rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] bg-white flex items-center justify-center text-[var(--time-gray-500)] hover:border-[var(--time-dark)] hover:text-[var(--time-dark)] transition-colors"
              title={t('text-print', { defaultValue: 'Stampa' })}
            >
              <PrinterIcon />
            </button>
          </div>
        </div>

        {/* ── Main Layout ───────────────────────────────────────────── */}
        <div
          className={`py-7 grid grid-cols-1 gap-7 items-start ${
            sidebarOpen
              ? 'lg:grid-cols-[260px_1fr_380px]'
              : 'lg:grid-cols-[36px_1fr_380px]'
          }`}
        >
          {/* Left: Saved Carts + toggle */}
          <div className="hidden lg:flex lg:sticky lg:top-24 items-start gap-0">
            {sidebarOpen ? (
              <div className="flex-1 min-w-0">
                <TimeSavedCarts />
              </div>
            ) : null}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="shrink-0 w-7 h-7 mt-2 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] bg-white flex items-center justify-center text-[var(--time-gray-400)] hover:border-[var(--time-dark)] hover:text-[var(--time-dark)] transition-colors"
              title={sidebarOpen ? 'Nascondi carrelli' : 'Mostra carrelli'}
            >
              <SidebarIcon open={sidebarOpen} />
            </button>
          </div>

          {/* Center: Processing Orders + Cart Table */}
          <div className="space-y-6">
            <TimeProcessingOrders />
            <TimeCartTable
              lang={lang}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onContinue={scrollToSummary}
            />
          </div>

          {/* Right: Order Summary */}
          <div ref={summaryRef} className="lg:sticky lg:top-24">
            <TimeOrderSummary lang={lang} />
          </div>
        </div>

        {/* Mobile: Saved Carts */}
        <div className="lg:hidden pb-6">
          <TimeSavedCarts />
        </div>
      </div>
    </div>
  );
}
