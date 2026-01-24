'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { WidgetConfig } from '@/lib/home-settings/types';
import { useUI } from '@contexts/ui.context';

const CartButton = dynamic(() => import('@components/cart/cart-button'), {
  ssr: false,
});

interface CartWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function CartWidget({ config, lang }: CartWidgetProps) {
  const { isAuthorized } = useUI();

  // Only show cart when logged in
  if (!isAuthorized) return null;

  // Hide when bottom navigation is visible (below lg breakpoint)
  return (
    <div className="hidden lg:block">
      <Suspense fallback={null}>
        <CartButton lang={lang} summaryVariant="amount" />
      </Suspense>
    </div>
  );
}
