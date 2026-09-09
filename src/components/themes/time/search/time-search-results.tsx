'use client';

import React, { useState } from 'react';
import { Element } from 'react-scroll';
import cn from 'classnames';
import SearchFilterDrawer from '@components/search/search-filter-drawer';
import TimeSearchFilters from './time-search-filters';
import { TimeProductSearch } from './time-product-search';

/**
 * The facet sidebar + product grid, shared by the search page and the
 * collection page.
 *
 * Both surfaces list products out of the same PIM search; the collection page
 * only narrows it to one collection. Keeping the layout in one component is
 * what makes `/it/collections/<slug>` look like `/it/search` instead of
 * drifting from it — and `collectionSlug` reaches the sidebar too, so the
 * facet counts describe the collection rather than the whole catalogue.
 */
export default function TimeSearchResults({
  lang,
  text,
  collectionSlug,
  header,
}: {
  lang: string;
  text?: string;
  collectionSlug?: string;
  /**
   * Page chrome that belongs above the grid but INSIDE the content column —
   * the collection title block, for instance. Rendering it here rather than
   * full-width above the whole layout is what lets the facet column start at
   * the top of the page instead of below a header it has nothing to do with.
   */
  header?: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filters = (
    <TimeSearchFilters
      lang={lang}
      text={text}
      collectionSlug={collectionSlug}
    />
  );

  return (
    <Element
      name="grid"
      className={cn('flex pb-16 pt-7 lg:pt-7 lg:pb-20', sidebarOpen && 'gap-6')}
    >
      {/* Sidebar — pins under the REAL header. The header is built per
          tenant (rows can be added, removed, resized or unpinned), so a
          hardcoded `top-16` left the first facets hidden behind a taller
          header. `--vinc-header-height` is published by useFixedRowOffsets
          from the measured pinned rows; 64px is only the pre-hydration
          fallback. The tail keeps the same breathing room the old
          `100vh-120px` had for a 64px header. */}
      <div
        className={cn(
          'sticky hidden lg:block shrink-0 overflow-x-hidden overflow-y-auto transition-all duration-300 ease-in-out',
          sidebarOpen
            ? 'w-64 xl:w-72 pt-4 ltr:pr-5 rtl:pl-5 opacity-100'
            : 'w-0 p-0 opacity-0',
        )}
        style={{
          top: 'var(--vinc-header-height, 64px)',
          height: 'calc(100vh - var(--vinc-header-height, 64px) - 56px)',
        }}
      >
        {/* Natural height: the scroll now lives on the sticky wrapper, and
            pinning this to h-full would cap the facet list at the viewport
            instead of letting it scroll. The fixed width keeps the list from
            reflowing while the wrapper animates open/closed. */}
        <div className="w-64 xl:w-72">{filters}</div>
      </div>
      {/* Content */}
      <div className="w-full lg:pt-4 min-w-0">
        {header}
        <SearchFilterDrawer lang={lang}>{filters}</SearchFilterDrawer>
        <TimeProductSearch
          lang={lang}
          collectionSlug={collectionSlug}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
      </div>
    </Element>
  );
}
