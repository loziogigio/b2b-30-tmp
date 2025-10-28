'use client';

import { useSessionStorage } from 'react-use';
import Image from '@components/ui/image';
import HighlightedBar from '@components/common/highlighted-bar';
import Countdown from '@components/common/countdown';
import dynamic from 'next/dynamic';
import Footer from '@layouts/footer/footer';
import B2BMobileNavigation from '@layouts/mobile-navigation/b2b-mobile-navigation';
import { useTranslation } from 'src/app/i18n/client';
import CartHydrator from '@framework/cart/b2b-cart';

const Header = dynamic(() => import('./header'), {
  ssr: false,
  loading: () => <div className="h-16 w-full bg-fill-secondary" />,
});

// Client-only component to avoid hydration mismatch
const ClientRenderedHighLightedBar = dynamic(
  () => import('@components/common/highlighted-bar-wrapper'),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function DefaultLayout({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: string;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <ClientRenderedHighLightedBar />
      {/* End of highlighted bar  */}
      <CartHydrator/>

      {/* Header is client-only to avoid hydration mismatches when UI context mutates */}
      <Header lang={lang} />
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
