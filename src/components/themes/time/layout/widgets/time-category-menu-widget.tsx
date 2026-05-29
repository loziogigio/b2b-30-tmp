'use client';

import dynamic from 'next/dynamic';
import { CategoryMenuWidget } from '@/layouts/header/widgets';
import type { WidgetConfig } from '@/lib/home-settings/types';

const B2BInlineCategoryMenu = dynamic(
  () => import('@layouts/header/b2b-inline-category-menu'),
  { ssr: false },
);

interface TimeCategoryMenuWidgetProps {
  config: WidgetConfig;
  lang: string;
}

// Time theme category menu. For the inline (mega-bar) mode we render the shared
// menu with a tighter item padding so the DFL nav reads as a slim line instead
// of a tall band. Drawer mode falls back to the shared widget unchanged.
export function TimeCategoryMenuWidget({
  config,
  lang,
}: TimeCategoryMenuWidgetProps) {
  const channel = config?.channel || 'b2b';
  const displayMode = config?.displayMode ?? 'drawer';

  if (displayMode !== 'inline') {
    return <CategoryMenuWidget config={config} lang={lang} />;
  }

  return (
    <div className="hidden lg:block">
      <B2BInlineCategoryMenu
        lang={lang}
        channel={channel}
        itemPaddingY="py-3"
      />
    </div>
  );
}
