import ManagedModal from '@components/common/modal/managed-modal';
import { ManagedUIContext } from '@contexts/ui.context';
import { Inter, Manrope, Figtree, Outfit } from 'next/font/google';
import { getThemeIdForTenant } from '@/lib/theme/resolver';
import { dir } from 'i18next';
import { languages } from '../i18n/settings';
import ManagedDrawer from '@components/common/drawer/managed-drawer';
import { Metadata, Viewport } from 'next';
import ToasterProvider from 'src/app/provider/toaster-provider';
import Providers from 'src/app/provider/provider';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { CustomScripts, CustomStyles } from '@components/common/custom-scripts';
import { EliaDrawer } from '@components/elia/elia-drawer';
import { headers } from 'next/headers';
import DemoBanner from '@components/demo/demo-banner';
import DemoChecklist from '@components/demo/demo-checklist';
import DemoBrowseTracker from '@components/demo/demo-browse-tracker';
import { DemoUiEnvProvider } from '@/lib/demo/use-demo-ui';
import { isMultiTenant, resolveTenantPublicState } from '@/lib/tenant';
import {
  TenantPublicInfo,
  toPublicInfo,
  buildTenantFromEnv,
} from '@/lib/tenant/types';
import TenantDisabled from '@components/tenant/tenant-disabled';
import TenantConfigError from '@components/tenant/tenant-config-error';
import { getSeoConfig } from '@/lib/vcs/seo';

// external
import 'react-toastify/dist/ReactToastify.css';

// base css file
import '@assets/css/scrollbar.css';
import '@assets/css/swiper-carousel.css';
import '@assets/css/custom-plugins.css';
import './globals.css';
import '@/components/themes/time/css/time-variables.css';
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

const figtree = Figtree({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const outfit = Outfit({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

// Dynamic metadata based on branding and meta_tags from home settings
export async function generateMetadata(): Promise<Metadata> {
  const homeSettings = await getServerHomeSettings();
  const branding = homeSettings?.branding;
  const metaTags = homeSettings?.meta_tags;
  const brandingTitle = branding?.title || 'VINC - B2B';

  // Build comprehensive metadata from meta_tags if available
  const metadata: Metadata = {
    title: {
      template: `%s | ${metaTags?.title || brandingTitle}`,
      default: metaTags?.title || brandingTitle,
    },
    // Favicon/icons
    icons: {
      icon: branding?.favicon || '/assets/vinc/favicon.svg',
      shortcut: branding?.favicon || '/assets/vinc/favicon.svg',
      apple: branding?.favicon || '/assets/vinc/favicon.svg',
    },
  };

  // Description
  if (metaTags?.description) {
    metadata.description = metaTags.description;
  }

  // Keywords
  if (metaTags?.keywords) {
    metadata.keywords = metaTags.keywords;
  }

  // Author
  if (metaTags?.author) {
    metadata.authors = [{ name: metaTags.author }];
  }

  // Robots
  if (metaTags?.robots) {
    metadata.robots = metaTags.robots;
  }

  // Canonical URL
  if (metaTags?.canonicalUrl) {
    metadata.alternates = {
      canonical: metaTags.canonicalUrl,
    };
  }

  // Open Graph
  metadata.openGraph = {
    title: metaTags?.ogTitle || metaTags?.title || brandingTitle,
    description: metaTags?.ogDescription || metaTags?.description,
    siteName: metaTags?.ogSiteName || brandingTitle,
    type: (metaTags?.ogType as 'website' | 'article') || 'website',
    ...(metaTags?.ogImage && {
      images: [{ url: metaTags.ogImage }],
    }),
  };

  // Twitter Card
  metadata.twitter = {
    card: metaTags?.twitterCard || 'summary_large_image',
    ...(metaTags?.twitterSite && { site: metaTags.twitterSite }),
    ...(metaTags?.twitterCreator && { creator: metaTags.twitterCreator }),
    ...(metaTags?.twitterImage && {
      images: [metaTags.twitterImage],
    }),
  };

  // Verification
  if (metaTags?.googleSiteVerification || metaTags?.bingSiteVerification) {
    metadata.verification = {
      ...(metaTags.googleSiteVerification && {
        google: metaTags.googleSiteVerification,
      }),
      ...(metaTags.bingSiteVerification && {
        other: { 'msvalidate.01': metaTags.bingSiteVerification },
      }),
    };
  }

  return metadata;
}

// Viewport configuration (themeColor moved here from metadata per Next.js 14+)
export async function generateViewport(): Promise<Viewport> {
  const homeSettings = await getServerHomeSettings();
  const metaTags = homeSettings?.meta_tags;

  return {
    themeColor: metaTags?.themeColor || '#009f7f',
    width: 'device-width',
    initialScale: 1,
  };
}

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

  // Read the DEMO_UI_ENABLED runtime server env (not a NEXT_PUBLIC_ var — surfaced
  // to client components via DemoUiEnvProvider below).
  const demoUiEnabled = process.env.DEMO_UI_ENABLED === 'true';

  // Resolve only browser-safe tenant state. The full registry record contains
  // API/database credentials and must never be the value of an awaited promise
  // in a React Server Component (development Flight payloads retain those
  // values for replay/debugging).
  let tenantPublicInfo: TenantPublicInfo;
  let tenantTheme: string | undefined;
  if (isMultiTenant) {
    const headersList = await headers();
    const hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';
    const resolved = await resolveTenantPublicState(hostname);

    // If tenant not found or not active, show disabled page
    if (!resolved || !resolved.isActive) {
      return (
        <html lang={lang} dir={dir(lang)} suppressHydrationWarning={true}>
          <head />
          <body suppressHydrationWarning={true}>
            <TenantDisabled />
          </body>
        </html>
      );
    }

    // Check for critical configuration errors
    if (resolved.hasCriticalErrors) {
      return (
        <html lang={lang} dir={dir(lang)} suppressHydrationWarning={true}>
          <head />
          <body suppressHydrationWarning={true}>
            <TenantConfigError
              errorType="invalid_config"
              details={`Tenant: ${resolved.tenant.id}`}
            />
          </body>
        </html>
      );
    }
    tenantPublicInfo = resolved.tenant;
    tenantTheme = resolved.tenant.b2bTheme;
  } else {
    // Single-tenant mode: build tenant from env variables
    const tenant = buildTenantFromEnv();
    tenantPublicInfo = toPublicInfo(tenant);
    tenantTheme = tenant.b2bTheme;
  }

  // Resolve theme: tenant config > env var > "default"
  const themeId = getThemeIdForTenant(tenantTheme);

  // Resolve category routing on the server and hydrate it alongside the other
  // providers. Header menus can build canonical links on their first render,
  // with no browser-side SEO-config waterfall.
  const [homeSettings, seoConfig] = await Promise.all([
    getServerHomeSettings(lang),
    getSeoConfig(),
  ]);
  const branding = homeSettings?.branding ?? {
    title: 'B2B Store',
    primaryColor: '#009f7f',
    secondaryColor: '#02b290',
    logo: '/assets/images/logo-placeholder.svg',
    favicon: '/assets/vinc/favicon.svg',
  };

  return (
    <html
      lang={lang}
      dir={dir(lang)}
      data-theme={themeId}
      suppressHydrationWarning={true}
    >
      <head>
        <CustomScripts scripts={homeSettings.customScripts} placement="head" />
        <CustomStyles css={homeSettings.customCss} />
      </head>
      <body
        className={
          themeId === 'time'
            ? `${figtree.variable} ${outfit.variable}`
            : `${inter.variable} ${manrope.variable}`
        }
        style={
          themeId === 'time'
            ? {
                ['--color-brand' as string]: branding.primaryColor || '#e63946',
                ['--color-brand-secondary' as string]:
                  branding.secondaryColor || '#c1121f',
                ['--time-red' as string]: branding.primaryColor || '#e63946',
                ['--time-dark' as string]: branding.textColor || '#1a1d23',
                fontFamily: 'var(--font-body), sans-serif',
                background: branding.backgroundColor || '#ffffff',
              }
            : {
                ['--color-brand' as string]: branding.primaryColor,
                ['--color-brand-secondary' as string]: branding.secondaryColor,
              }
        }
        suppressHydrationWarning={true}
      >
        <Providers
          initialHomeSettings={homeSettings}
          lang={lang}
          tenant={tenantPublicInfo}
          isMultiTenant={isMultiTenant}
          categoryRoots={seoConfig.categoryRoot}
        >
          <ManagedUIContext>
            <DemoUiEnvProvider value={demoUiEnabled}>
              <DemoBanner />
              <DemoBrowseTracker />
              <DemoChecklist />
              {children}
            </DemoUiEnvProvider>
            <ManagedModal lang={lang} />
            <ManagedDrawer lang={lang} />
            {/* <EliaDrawer /> */}
            <ToasterProvider />
          </ManagedUIContext>
        </Providers>
        <CustomScripts
          scripts={homeSettings.customScripts}
          placement="body_end"
        />
      </body>
    </html>
  );
}
