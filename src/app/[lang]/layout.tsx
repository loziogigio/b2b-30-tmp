import ManagedModal from '@components/common/modal/managed-modal';
import { ManagedUIContext } from '@contexts/ui.context';
import { Inter, Manrope } from 'next/font/google';
import { dir } from 'i18next';
import { languages } from '../i18n/settings';
import ManagedDrawer from '@components/common/drawer/managed-drawer';
import { Metadata } from 'next';
import ToasterProvider from 'src/app/provider/toaster-provider';
import Providers from 'src/app/provider/provider';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';

// external
import 'react-toastify/dist/ReactToastify.css';

// base css file
import '@assets/css/scrollbar.css';
import '@assets/css/swiper-carousel.css';
import '@assets/css/custom-plugins.css';
import './globals.css';
import '@assets/css/rc-drawer.css';

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: {
    template: 'BoroBazar | %s',
    default: 'BoroBazar',
  },
};

// Force dynamic rendering for all pages to avoid timeout during Docker build
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const { lang } = await params;
  const homeSettings = await getServerHomeSettings();
  const branding = homeSettings?.branding ?? {
    title: 'B2B Store',
    primaryColor: '#009f7f',
    secondaryColor: '#02b290',
    logo: undefined,
    favicon: undefined
  };

  return (
    <html lang={lang} dir={dir(lang)} suppressHydrationWarning={true}>
      <head>
        <title>{branding.title}</title>
        {branding.favicon ? <link rel="icon" href={branding.favicon} /> : null}
      </head>
      <body
        className={`${inter.variable} ${manrope.variable}`}
        style={{
          // Ensure CSS variables available on first paint
          ['--color-brand' as string]: branding.primaryColor,
          ['--color-brand-secondary' as string]: branding.secondaryColor
        }}
        suppressHydrationWarning={true}
      >
        <Providers initialHomeSettings={homeSettings}>
          <ManagedUIContext>
            {children}
            <ManagedModal lang={lang} />
            <ManagedDrawer lang={lang} />
            <ToasterProvider />
          </ManagedUIContext>
        </Providers>
      </body>
    </html>
  );
}
