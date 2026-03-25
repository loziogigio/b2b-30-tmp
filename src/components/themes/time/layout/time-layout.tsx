'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import CartHydrator from '@framework/cart/b2b-cart';
import ErpHydrator from '@components/common/erp-hydrator';
import AuthGuard from '@components/common/auth-guard';
import TimeHeader from './time-header';
import TimeFooter from './time-footer';

const MobileSearchOverlay = dynamic(
  () => import('@/layouts/b2b/mobile-search-overlay'),
  { ssr: false },
);

const B2BMobileNavigation = dynamic(
  () => import('@/layouts/mobile-navigation/b2b-mobile-navigation'),
  { ssr: false },
);

export default function TimeLayout({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: string;
}) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  if (isPreview) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <main className="relative flex-grow">{children}</main>
      </div>
    );
  }

  return (
    <AuthGuard lang={lang}>
      <div className="flex min-h-screen flex-col bg-white">
        <ErpHydrator />
        <CartHydrator />

        <TimeHeader lang={lang} />

        <MobileSearchOverlay lang={lang} />

        <main
          className="relative flex-grow"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </main>

        <TimeFooter lang={lang} />

        {/* Mobile bottom navigation - same as default, works with time styling */}
        <B2BMobileNavigation lang={lang} />
      </div>
    </AuthGuard>
  );
}
