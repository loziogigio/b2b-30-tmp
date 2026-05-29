'use client';

import dynamic from 'next/dynamic';
import { HiOutlineMenuAlt3, HiOutlineViewGrid } from 'react-icons/hi';
import { useThemeId } from '@/contexts/tenant.context';
import type { WidgetConfig } from '@/lib/home-settings/types';

const B2BHeaderMenu = dynamic(() => import('@layouts/header/b2b-header-menu'), {
  ssr: false,
});
const B2BInlineCategoryMenu = dynamic(
  () => import('@layouts/header/b2b-inline-category-menu'),
  { ssr: false },
);

interface CategoryMenuWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function CategoryMenuWidget({ config, lang }: CategoryMenuWidgetProps) {
  const isTime = useThemeId() === 'time';
  const channel = config?.channel || 'b2b';
  // Default to 'drawer' so tenants whose widgets predate displayMode keep their
  // current behavior. The admin opts into 'inline' explicitly.
  const displayMode = config?.displayMode ?? 'drawer';

  // Hide when bottom navigation is visible (below lg breakpoint) - categories are in bottom nav.
  return (
    <div className="hidden lg:block">
      {displayMode === 'inline' ? (
        <B2BInlineCategoryMenu lang={lang} channel={channel} />
      ) : (
        <B2BHeaderMenu
          lang={lang}
          channel={channel}
          renderTrigger={({ onClick }) => (
            <button
              type="button"
              onClick={onClick}
              className="inline-flex items-center gap-2 border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 whitespace-nowrap"
              style={{ borderRadius: 'var(--radius-btn, 9999px)' }}
            >
              {isTime ? (
                <HiOutlineViewGrid className="h-5 w-5" />
              ) : (
                <HiOutlineMenuAlt3 className="h-5 w-5" />
              )}
              <span>{config?.label || 'Categorie'}</span>
            </button>
          )}
        />
      )}
    </div>
  );
}
