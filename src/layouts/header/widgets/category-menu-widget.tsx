'use client';

import dynamic from 'next/dynamic';
import { HiOutlineMenuAlt3 } from 'react-icons/hi';
import type { WidgetConfig } from '@/lib/home-settings/types';

const B2BHeaderMenu = dynamic(() => import('@layouts/header/b2b-header-menu'), {
  ssr: false,
});

interface CategoryMenuWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function CategoryMenuWidget({ config, lang }: CategoryMenuWidgetProps) {
  // Hide when bottom navigation is visible (below lg breakpoint) - categories are in bottom nav
  return (
    <div className="hidden lg:block">
      <B2BHeaderMenu
        lang={lang}
        renderTrigger={({ onClick }) => (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 whitespace-nowrap"
          >
            <HiOutlineMenuAlt3 className="h-5 w-5" />
            <span>{config?.label || 'Categorie'}</span>
          </button>
        )}
      />
    </div>
  );
}
