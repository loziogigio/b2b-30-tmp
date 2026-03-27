'use client';

import { Suspense, useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch — isAuthorized differs between server and client
  if (!mounted || !isAuthorized) return null;

  // Hide when bottom navigation is visible (below lg breakpoint)
  return (
    <div className="hidden lg:flex items-center justify-center overflow-hidden">
      <Suspense fallback={null}>
        <Delivery lang={lang} />
      </Suspense>
    </div>
  );
}
