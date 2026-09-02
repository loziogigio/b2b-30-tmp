'use client';

import React from 'react';
import cn from 'classnames';
import { useModalState } from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import type { PackagingOption } from '@utils/transform/erp-prices';
import TimeDrawerShell from './time-drawer-shell';

/** The packaging table is three narrow columns; cap the content column. */
const CONTENT_WIDTH = 620;

type PackagingModalData = {
  sku?: string;
  name?: string;
  options?: PackagingOption[];
};

/** Small hexagon glyph mirroring the legacy "imballo" marker. */
function HexIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

/**
 * Product-level packaging breakdown. Triggered from the Time offer rows when a
 * product carries more than three packaging options, where the inline
 * "CRT: 20 · Epal 120: 640 · …" list gets unwieldy.
 *
 * Renders in the theme's shared drawer shell, so it opens, stacks and closes
 * exactly like the variants and order-history drawers.
 */
export default function TimePackagingModal({ lang }: { lang: string }) {
  const { data } = useModalState();
  const { t } = useTranslation(lang, 'common');
  const { sku, name, options = [] } = (data ?? {}) as PackagingModalData;

  // Default packaging first; keep ERP order for the rest.
  const rows = [...options].sort((a, b) =>
    a.packaging_is_default === b.packaging_is_default
      ? 0
      : a.packaging_is_default
        ? -1
        : 1,
  );

  return (
    <TimeDrawerShell
      lang={lang}
      title={t('text-packaging-items', { defaultValue: 'Imballi articoli' })}
      maxContentWidth={CONTENT_WIDTH}
      contentClassName="font-[family-name:var(--font-body)] ltr:text-left rtl:text-right"
    >
      {/* Product identity */}
      {(sku || name) && (
        <div className="flex items-center gap-3 pb-4">
          {sku && (
            <span className="bg-[var(--time-dark)] text-white text-xs sm:text-[13px] font-extrabold px-2.5 py-1 rounded-md font-mono tracking-wide shrink-0">
              {String(sku).toUpperCase()}
            </span>
          )}
          {name && (
            <span className="text-sm sm:text-[15px] font-bold text-[var(--time-dark)] truncate">
              {name}
            </span>
          )}
        </div>
      )}

      {/* Packaging table */}
      <div className="pt-2">
        <div className="rounded-xl bg-[var(--time-gray-50)] p-2 sm:p-3">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 pb-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--time-gray-400)]">
            <span>{t('text-packaging', { defaultValue: 'Confezione' })}</span>
            <span className="text-center min-w-[48px]">
              {t('text-unit', { defaultValue: 'Unità' })}
            </span>
            <span className="text-right min-w-[64px]">
              {t('text-quantity', { defaultValue: 'Quantità' })}
            </span>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1.5">
            {rows.map((o) => (
              <div
                key={o.packaging_code}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg',
                  o.packaging_is_default ? 'bg-[#fdecef]' : 'bg-white',
                )}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <HexIcon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      o.packaging_is_default
                        ? 'text-[var(--time-red)]'
                        : 'text-[var(--time-gray-300)]',
                    )}
                  />
                  <span className="flex flex-col min-w-0 leading-tight">
                    <span className="text-sm sm:text-[15px] font-bold text-[var(--time-dark)] truncate">
                      {o.packaging_code}
                    </span>
                    {o.packaging_is_default && (
                      <span className="text-[11px] text-[var(--time-gray-400)]">
                        {t('text-default-packaging', {
                          defaultValue: 'Imballo di default',
                        })}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-center min-w-[48px] text-xs sm:text-[13px] text-[var(--time-gray-500)]">
                  {o.packaging_uom || '—'}
                </span>
                <span className="text-right min-w-[64px] text-sm sm:text-[15px] font-extrabold text-[var(--time-dark)] tabular-nums">
                  {o.qty_x_packaging ?? '1'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TimeDrawerShell>
  );
}
