import ManagedModal from '@components/common/modal/managed-modal';
import { ManagedUIContext } from '@contexts/ui.context';
import { Inter, Manrope } from 'next/font/google';
import { dir } from 'i18next';
import { languages } from '../i18n/settings';
import ManagedDrawer from '@components/common/drawer/managed-drawer';
import { Metadata, Viewport } from 'next';
import ToasterProvider from 'src/app/provider/toaster-provider';
import Providers from 'src/app/provider/provider';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { EliaDrawer } from '@components/elia/elia-drawer';
import { headers } from 'next/headers';
import {
  resolveTenant,
  isMultiTenant,
  hasCriticalErrors,
  logTenantConfigIssues,
} from '@/lib/tenant';
import { toPublicInfo, buildTenantFromEnv } from '@/lib/tenant/types';
import TenantDisabled from '@components/tenant/tenant-disabled';
import TenantConfigError from '@components/tenant/tenant-config-error';

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

  // Resolve tenant configuration
  let tenant = null;
  if (isMultiTenant) {
    const headersList = await headers();
    const hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';
    tenant = await resolveTenant(hostname);

    // If tenant not found or not active, show disabled page
    if (!tenant || !tenant.isActive) {
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
    if (hasCriticalErrors(tenant)) {
      logTenantConfigIssues(tenant, `Tenant: ${tenant.id}`);
      return (
        <html lang={lang} dir={dir(lang)} suppressHydrationWarning={true}>
          <head />
          <body suppressHydrationWarning={true}>
            <TenantConfigError
              errorType="invalid_config"
              details={`Tenant: ${tenant.id}`}
            />
          </body>
        </html>
      );
    }
  } else {
    // Single-tenant mode: build tenant from env variables
    tenant = buildTenantFromEnv();
  }

  // Convert to public info for client-side (no secrets)
  const tenantPublicInfo = toPublicInfo(tenant);

  const homeSettings = await getServerHomeSettings();
  const branding = homeSettings?.branding ?? {
    title: 'B2B Store',
    primaryColor: '#009f7f',
    secondaryColor: '#02b290',
    logo: '/assets/images/logo-placeholder.svg',
    favicon: '/assets/vinc/favicon.svg',
  };

  return (
    <html lang={lang} dir={dir(lang)} suppressHydrationWarning={true}>
      <head />
      <body
        className={`${inter.variable} ${manrope.variable}`}
        style={{
          // Ensure CSS variables available on first paint
          ['--color-brand' as string]: branding.primaryColor,
          ['--color-brand-secondary' as string]: branding.secondaryColor,
        }}
        suppressHydrationWarning={true}
      >
        <Providers
          initialHomeSettings={homeSettings}
          tenant={tenantPublicInfo}
          isMultiTenant={isMultiTenant}
        >
          <ManagedUIContext>
            {children}
            <ManagedModal lang={lang} />
            <ManagedDrawer lang={lang} />
            <EliaDrawer />
            <ToasterProvider />
          </ManagedUIContext>
        </Providers>
      </body>
    </html>
  );
}
