'use client';

import { Suspense } from 'react';
import SearchB2B from '@components/common/search-b2b';
import TimeSearchBox from './time-search-box';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface TimeSearchWidgetProps {
  config: WidgetConfig;
  lang: string;
}

// Time theme search widget — reuses the shared SearchB2B (overlay/navigation/
// recent-search logic) but swaps the presentational box for the DFL-styled one.
export function TimeSearchWidget({ lang }: TimeSearchWidgetProps) {
  return (
    <div className="hidden lg:flex flex-1 min-w-0">
      <Suspense fallback={null}>
        <SearchB2B
          searchId="header-search"
          className="w-full h-12"
          lang={lang}
          SearchBoxComponent={TimeSearchBox}
        />
      </Suspense>
    </div>
  );
}
