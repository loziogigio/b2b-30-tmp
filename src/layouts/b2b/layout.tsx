'use client';

import dynamic from 'next/dynamic';
import Footer from '@layouts/footer/footer';
import B2BMobileNavigation from '@layouts/mobile-navigation/b2b-mobile-navigation';
import CartHydrator from '@framework/cart/b2b-cart';
import ErpHydrator from '@components/common/erp-hydrator';

const Header = dynamic(() => import('./header'), {
  ssr: false,
  loading: () => <div className="h-16 w-full bg-fill-secondary" />,
});

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
  return (
    <div className="flex flex-col min-h-screen">
      <ErpHydrator />
      <CartHydrator />

      {/* Header is client-only to avoid hydration mismatches when UI context mutates */}
      <Header lang={lang} />

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
  );
}
