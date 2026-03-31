'use client';

import CategoryScrollFilter from '@components/search/category-scroll-filter';
import Container from '@components/ui/container';
import { Element } from 'react-scroll';
import SearchTabs from '@components/search/search-tabs';
import { useSearchParams } from 'next/navigation';
import { TimeProductSearch } from './time-product-search';
import TimeSearchFilters from './time-search-filters';
import { useState } from 'react';
import cn from 'classnames';

export default function TimeSearchContent({ lang }: { lang: string }) {
  const searchParams = useSearchParams();
  const text = searchParams?.get('text') || undefined;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Container>
      <CategoryScrollFilter lang={lang} />
      <div className="time-search-tabs">
        <style>{`
          /* ── Chrome-style tab strip ── */
          .time-search-tabs > div {
            background: var(--time-gray-100) !important;
            border-bottom: none !important;
            border-radius: 8px 8px 0 0 !important;
            padding: 6px 8px 0 !important;
            margin-top: 8px;
            margin-bottom: 0;
          }
          .time-search-tabs .flex.items-end {
            gap: 1px !important;
          }

          /* ── All tabs base ── */
          .time-search-tabs .group,
          .time-search-tabs button.mr-1,
          .time-search-tabs button.mr-2 {
            border: none !important;
            border-radius: 8px 8px 0 0 !important;
            font-family: var(--font-body) !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            padding: 8px 14px !important;
            position: relative !important;
            transition: background 0.15s !important;
          }
          .time-search-tabs button.mr-1 {
            margin-right: 1px !important;
          }
          .time-search-tabs button.mr-2 {
            margin-right: 1px !important;
          }

          /* ── Inactive dynamic tabs ── */
          .time-search-tabs .group.bg-gray-100 {
            background: transparent !important;
          }
          .time-search-tabs .group.bg-gray-100:hover {
            background: rgba(255,255,255,0.45) !important;
            border-radius: 8px 8px 0 0 !important;
          }
          .time-search-tabs .group.bg-gray-100 span {
            color: var(--time-gray-500) !important;
            font-size: 12px !important;
          }

          /* ── Active dynamic tab ── */
          .time-search-tabs .group.bg-white {
            background: white !important;
            border: none !important;
            z-index: 1 !important;
          }
          .time-search-tabs .group.bg-white span {
            color: var(--time-dark) !important;
            font-weight: 600 !important;
            font-size: 12px !important;
          }

          /* Chrome inverse corners — active dynamic tab */
          .time-search-tabs .group.bg-white::before,
          .time-search-tabs .group.bg-white::after {
            content: '' !important;
            position: absolute !important;
            bottom: 0 !important;
            width: 8px !important;
            height: 8px !important;
            background: transparent !important;
            display: block !important;
            pointer-events: none !important;
          }
          .time-search-tabs .group.bg-white::before {
            left: -8px !important;
            border-bottom-right-radius: 8px !important;
            box-shadow: 4px 0 0 0 white !important;
          }
          .time-search-tabs .group.bg-white::after {
            right: -8px !important;
            border-bottom-left-radius: 8px !important;
            box-shadow: -4px 0 0 0 white !important;
          }

          /* ── Fixed tabs (inactive) ── */
          .time-search-tabs button.bg-indigo-50,
          .time-search-tabs button.bg-rose-50 {
            background: transparent !important;
            color: var(--time-gray-500) !important;
          }
          .time-search-tabs button.bg-indigo-50:hover,
          .time-search-tabs button.bg-rose-50:hover {
            background: rgba(255,255,255,0.45) !important;
          }

          /* ── Fixed tabs (active) ── */
          .time-search-tabs button.border-b-white {
            background: white !important;
            border: none !important;
            color: var(--time-dark) !important;
            font-weight: 600 !important;
            z-index: 1 !important;
          }
          .time-search-tabs button.border-b-white::before,
          .time-search-tabs button.border-b-white::after {
            content: '' !important;
            position: absolute !important;
            bottom: 0 !important;
            width: 8px !important;
            height: 8px !important;
            background: transparent !important;
            display: block !important;
            pointer-events: none !important;
          }
          .time-search-tabs button.border-b-white::before {
            left: -8px !important;
            border-bottom-right-radius: 8px !important;
            box-shadow: 4px 0 0 0 white !important;
          }
          .time-search-tabs button.border-b-white::after {
            right: -8px !important;
            border-bottom-left-radius: 8px !important;
            box-shadow: -4px 0 0 0 white !important;
          }

          /* ── Close button (Chrome circle hover) ── */
          .time-search-tabs .group button[aria-label="Close tab"] {
            color: var(--time-gray-400) !important;
            font-size: 14px !important;
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            line-height: 1 !important;
          }
          .time-search-tabs .group button[aria-label="Close tab"]:hover {
            background: rgba(0,0,0,0.08) !important;
            color: var(--time-dark) !important;
          }

          /* ── New tab button ── */
          .time-search-tabs button.bg-gray-100 {
            background: transparent !important;
            border: none !important;
            color: var(--time-gray-400) !important;
            font-family: var(--font-body) !important;
            font-size: 12px !important;
            padding: 6px 10px !important;
            border-radius: 8px 8px 0 0 !important;
          }
          .time-search-tabs button.bg-gray-100:hover {
            background: rgba(255,255,255,0.5) !important;
            color: var(--time-dark) !important;
          }

          /* ── Mutual exclusivity: when trending is active, deactivate dynamic tabs ── */
          .time-search-tabs:has(button.border-b-white) .group.bg-white {
            background: transparent !important;
            z-index: auto !important;
          }
          .time-search-tabs:has(button.border-b-white) .group.bg-white span {
            color: var(--time-gray-500) !important;
            font-weight: 500 !important;
          }
          .time-search-tabs:has(button.border-b-white) .group.bg-white::before,
          .time-search-tabs:has(button.border-b-white) .group.bg-white::after {
            display: none !important;
          }

          /* ── Edit input ── */
          .time-search-tabs input {
            font-family: var(--font-body) !important;
            font-size: 12px !important;
            color: var(--time-dark) !important;
          }
        `}</style>
        <SearchTabs lang={lang} />
      </div>
      <Element
        name="grid"
        className={cn(
          'flex pb-16 pt-7 lg:pt-7 lg:pb-20',
          sidebarOpen && 'gap-6',
        )}
      >
        {/* Sidebar */}
        <div
          className={cn(
            'sticky hidden lg:block top-16 shrink-0 overflow-hidden transition-all duration-300 ease-in-out h-[calc(100vh-120px)]',
            sidebarOpen
              ? 'w-64 xl:w-72 pt-4 ltr:pr-5 rtl:pl-5 opacity-100'
              : 'w-0 p-0 opacity-0',
          )}
        >
          <div className="w-64 xl:w-72 h-full">
            <TimeSearchFilters lang={lang} text={text} />
          </div>
        </div>
        {/* Content */}
        <div className="w-full lg:pt-4 min-w-0">
          <TimeProductSearch
            lang={lang}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />
        </div>
      </Element>
    </Container>
  );
}
