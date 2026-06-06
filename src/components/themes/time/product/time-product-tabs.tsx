'use client';

import React from 'react';
import ProductB2BDetailsTab from '@components/product/product-details/product-b2b-tab';
import type { Product } from '@framework/types';
import type { DynamicBlock } from '@framework/types';
import type { PageBlock } from '@/lib/types/blocks';

interface TimeProductTabsProps {
  lang: string;
  product: Product;
  zone3Blocks?: PageBlock[];
  dynamicSection3Blocks?: DynamicBlock[];
  className?: string;
}

/**
 * Time-themed wrapper for ProductB2BDetailsTab.
 * Renders Google-style tabs with clean underline indicators,
 * time theme typography and colors, inside a boxed container.
 */
export default function TimeProductTabs({
  lang,
  product,
  zone3Blocks = [],
  dynamicSection3Blocks = [],
  className = 'mb-12',
}: TimeProductTabsProps) {
  return (
    <div
      className={`time-tabs bg-white rounded-2xl border border-[var(--time-gray-100)] overflow-hidden ${className}`}
    >
      <style>{`
        /* ── Tab list ── */
        .time-tabs [role="tablist"] {
          border-bottom: 2px solid var(--time-gray-100) !important;
          padding: 0 24px;
          display: flex;
          gap: 0;
        }

        /* ── Individual tabs ── */
        .time-tabs [role="tab"] {
          font-family: var(--font-body) !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--time-gray-500) !important;
          padding: 14px 18px !important;
          margin-right: 0 !important;
          margin-left: 0 !important;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
        }
        .time-tabs [role="tab"]:hover {
          color: var(--time-dark) !important;
          background: var(--time-gray-50);
        }

        /* ── Selected tab ── */
        .time-tabs [role="tab"][data-headlessui-state~="selected"],
        .time-tabs [role="tab"][aria-selected="true"] {
          color: var(--time-red) !important;
          font-weight: 600 !important;
          border-bottom-color: var(--time-red);
        }
        /* Remove default ::after underline */
        .time-tabs [role="tab"]::after {
          display: none !important;
        }

        /* ── Tab panels ── */
        .time-tabs [role="tabpanel"] {
          font-family: var(--font-body);
          padding: 0 24px;
        }

        /* ── Prose (description) ── */
        .time-tabs .prose {
          color: var(--time-gray-600) !important;
          font-family: var(--font-body) !important;
          font-size: 13px !important;
          line-height: 1.8 !important;
        }

        /* ── Spec tables (dt/dd grids) ── */
        .time-tabs .border-border-base {
          border-color: var(--time-gray-100) !important;
        }
        .time-tabs dt {
          background: var(--time-gray-50) !important;
          color: var(--time-gray-500) !important;
          font-family: var(--font-body) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.03em;
        }
        .time-tabs dd {
          color: var(--time-dark) !important;
          font-family: var(--font-body) !important;
          font-size: 13px !important;
        }
        .time-tabs dl {
          border-radius: var(--radius-card) !important;
          overflow: hidden;
        }

        /* ── Document links ── */
        .time-tabs a.text-brand {
          color: var(--time-red) !important;
        }
        .time-tabs a.text-brand:hover {
          color: var(--time-dark) !important;
        }

        /* ── Marketing features list ── */
        .time-tabs ul {
          font-family: var(--font-body) !important;
          color: var(--time-gray-600) !important;
          font-size: 13px !important;
        }
        .time-tabs li::marker {
          color: var(--time-red);
        }
      `}</style>

      <ProductB2BDetailsTab
        lang={lang}
        product={product}
        zone3Blocks={zone3Blocks}
        dynamicSection3Blocks={dynamicSection3Blocks}
      />
    </div>
  );
}
