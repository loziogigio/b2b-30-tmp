'use client';

import React from 'react';
import B2BVariantsGridContent from '@components/product/b2b-variants-grid-content';

interface TimeVariantsGridProps {
  lang: string;
  product: any;
  useWindowScroll?: boolean;
  onBrandClick?: () => void;
}

/**
 * Shared wrapper that renders B2BVariantsGridContent with time-theme
 * CSS overrides and a boxed container. Used by:
 * - TimeVariantsQuickView (modal)
 * - TimeProductPopup (multi-variant branch)
 * - TimeProductDetail (multi-variant branch)
 */
export default function TimeVariantsGrid({
  lang,
  product,
  useWindowScroll = true,
  onBrandClick,
}: TimeVariantsGridProps) {
  return (
    <div className="time-vg">
      <style>{`
        .time-vg { font-family: var(--font-body); }
        .time-vg h3 {
          font-family: var(--font-heading);
          font-weight: 800 !important;
          color: var(--time-dark) !important;
        }
        .time-vg .border-b,
        .time-vg .border { border-color: var(--time-gray-100) !important; }
        .time-vg .text-brand { color: var(--time-red) !important; }
        .time-vg .bg-brand-light { background: var(--time-gray-50) !important; }
        .time-vg .bg-brand { background: var(--time-red) !important; }
        .time-vg input,
        .time-vg select {
          border-color: var(--time-gray-200) !important;
          border-radius: var(--radius-btn) !important;
          font-family: var(--font-body) !important;
          font-size: 13px !important;
        }
        .time-vg input:focus {
          border-color: var(--time-red) !important;
          box-shadow: 0 0 0 3px rgba(230,57,70,0.1) !important;
        }
        .time-vg button[class*="bg-brand"] {
          background: var(--time-dark) !important;
          border-color: var(--time-dark) !important;
        }
        .time-vg button[class*="border-gray-300"] {
          border-color: var(--time-gray-200) !important;
          border-radius: var(--radius-btn) !important;
          font-family: var(--font-body) !important;
        }
        .time-vg button[class*="border-gray-300"]:hover {
          border-color: var(--time-dark) !important;
        }
        .time-vg .text-gray-600 {
          color: var(--time-gray-400) !important;
          font-family: var(--font-body) !important;
        }
        .time-vg .text-gray-500 {
          color: var(--time-gray-400) !important;
        }
      `}</style>

      <div className="rounded-2xl border border-[var(--time-gray-100)] overflow-hidden bg-white">
        <B2BVariantsGridContent
          lang={lang}
          product={product}
          useWindowScroll={useWindowScroll}
          onBrandClick={onBrandClick}
        />
      </div>
    </div>
  );
}
