'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useUI } from '@contexts/ui.context';
import type { WidgetConfig } from '@/lib/home-settings/types';

const Delivery = dynamic(() => import('@layouts/header/delivery'), {
  ssr: false,
});

interface CompanyInfoWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function CompanyInfoWidget({ config, lang }: CompanyInfoWidgetProps) {
  const { isAuthorized } = useUI();

  // Only show when logged in
  if (!isAuthorized) return null;

  // Hide when bottom navigation is visible (below lg breakpoint)
  return (
    <div className="hidden lg:flex items-center justify-center overflow-hidden">
      <Suspense fallback={null}>
        <Delivery lang={lang} />
      </Suspense>
    </div>
  );
}
