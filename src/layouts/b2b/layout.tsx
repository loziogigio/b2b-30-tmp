'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Footer from '@layouts/footer/footer';
import B2BMobileNavigation from '@layouts/mobile-navigation/b2b-mobile-navigation';
import CartHydrator from '@framework/cart/b2b-cart';
import ErpHydrator from '@components/common/erp-hydrator';
import AuthGuard from '@components/common/auth-guard';

const ConfigurableHeader = dynamic(
  () => import('@layouts/header/configurable-header'),
  {
    ssr: false,
    loading: () => (
      <>
        <div className="h-16 w-full bg-fill-secondary" />
        <div className="h-12 w-full bg-gray-50" />
      </>
    ),
  }
);

const MobileSearchOverlay = dynamic(() => import('./mobile-search-overlay'), {
  ssr: false,
});

export default function DefaultLayout({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: string;
}) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  // In preview mode, show minimal layout without header/footer
  if (isPreview) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="relative flex-grow">{children}</main>
      </div>
    );
  }

  return (
    <AuthGuard lang={lang}>
      <div className="flex min-h-screen flex-col">
        <ErpHydrator />
        <CartHydrator />

        {/* Header is client-only to avoid hydration mismatches when UI context mutates */}
        <ConfigurableHeader lang={lang} />

        {/* Mobile search overlay - triggered by bottom navigation search icon */}
        <MobileSearchOverlay lang={lang} />

        <main
          className="relative flex-grow"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </main>
        <Footer lang={lang} />
        <B2BMobileNavigation lang={lang} />
      </div>
    </AuthGuard>
  );
}
