'use client';

import React from 'react';
import { SearchFiltersB2B } from '@components/search/filters-b2b';

/**
 * Themed wrapper for SearchFiltersB2B that applies time-theme colors
 * by overriding CSS custom properties used by the Tailwind config.
 */
export default function TimeSearchFilters({
  lang,
  text,
}: {
  lang: string;
  text?: string;
}) {
  return (
    <div
      className="time-filters"
      style={
        {
          '--color-brand': 'var(--time-red)',
          '--color-brand-secondary': 'var(--time-red)',
          '--color-text': 'var(--time-dark)',
          '--color-muted': 'var(--time-gray-400)',
          '--color-accent': 'var(--time-red)',
        } as React.CSSProperties
      }
    >
      <style>{`
        /* Override hardcoded border colors */
        .time-filters .border-border-base {
          border-color: var(--time-gray-100) !important;
        }
        .time-filters hr {
          border-color: var(--time-gray-100) !important;
        }
        /* Rounded card container */
        .time-filters > .space-y-3 > .border {
          border-radius: var(--radius-card);
          border-color: var(--time-gray-100);
        }
        /* Scrollbar */
        .time-filters ::-webkit-scrollbar { width: 4px; }
        .time-filters ::-webkit-scrollbar-track { background: transparent; }
        .time-filters ::-webkit-scrollbar-thumb {
          background: var(--time-gray-200);
          border-radius: 4px;
        }
      `}</style>
      <SearchFiltersB2B lang={lang} text={text} />
    </div>
  );
}
