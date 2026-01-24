'use client';

import { Suspense } from 'react';
import SearchB2B from '@components/common/search-b2b';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface SearchWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function SearchWidget({ config, lang }: SearchWidgetProps) {
  // Hide when bottom navigation is visible (below lg breakpoint)
  return (
    <div className="hidden lg:flex flex-1 min-w-0">
      <Suspense fallback={null}>
        <SearchB2B
          searchId="header-search"
          className="w-full h-12"
          lang={lang}
        />
      </Suspense>
    </div>
  );
}
