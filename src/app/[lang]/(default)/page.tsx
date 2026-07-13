import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import {
  getLatestHomeTemplateVersion,
  getPublishedHomeTemplate,
  getPublishedHomeTemplateCached,
} from '@/lib/db/home-templates';
import { HomePageWithPreview } from '@components/home/HomePageWithPreview';
import {
  PAGE_CONTEXT_COOKIE,
  ADDRESS_STATE_COOKIE,
  buildContextFromParams,
  contextToTags,
  ensureLanguageAttribute,
  mergeContexts,
  parseContextCookie,
  type PageContext,
} from '@/lib/page-context';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { canonicalSiteUrl, getSeoConfig } from '@/lib/vcs/seo';

// This page depends on external APIs. Force dynamic rendering so Docker/CI builds
// don't attempt to prerender it at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const [homeSettings, seoConfig] = await Promise.all([
    getServerHomeSettings(lang),
    getSeoConfig(),
  ]);
  const brandingTitle = homeSettings.branding?.title || 'VINC - B2B';
  const metaTags = homeSettings.meta_tags;
  const siteUrl = canonicalSiteUrl(seoConfig);
  const canonicalUrl =
    metaTags?.canonicalUrl || (siteUrl ? `${siteUrl}/${lang}` : undefined);
  const description =
    metaTags?.description ||
    (lang === 'it'
      ? `Portale B2B ${brandingTitle}`
      : `${brandingTitle} B2B portal`);

  return {
    title: { absolute: metaTags?.title || brandingTitle },
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    robots: seoConfig.robots.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: metaTags?.ogTitle || metaTags?.title || brandingTitle,
      description: metaTags?.ogDescription || description,
      url: canonicalUrl,
      siteName: metaTags?.ogSiteName || brandingTitle,
      type: 'website',
      images: metaTags?.ogImage ? [{ url: metaTags.ogImage }] : [],
    },
  };
}

type HomePageSearchParams = {
  preview?: string | string[];
  tag?: string | string[];
  homeTag?: string | string[];
  templateTag?: string | string[];
  campaign?: string | string[];
  segment?: string | string[];
  region?: string | string[];
  language?: string | string[];
  device?: string | string[];
  [key: string]: string | string[] | undefined;
};

const coerceParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function Page({
  params,
  searchParams,
}: {
  params: any;
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const { lang } = await params;
  const [homeSettings, seoConfig] = await Promise.all([
    getServerHomeSettings(lang),
    getSeoConfig(),
  ]);
  const siteUrl = canonicalSiteUrl(seoConfig);
  const siteName = homeSettings.branding?.title || 'VINC - B2B';
  const search = searchParams ? await searchParams : undefined;
  const previewParam = coerceParam(search?.preview);
  const isPreview = previewParam === 'true';
  const cookieStore = await cookies();
  const storedContext = parseContextCookie(
    cookieStore.get(PAGE_CONTEXT_COOKIE)?.value,
  );

  // Read addressState from cookie (set by AddressProvider when user selects delivery address)
  const addressStateCookie = cookieStore.get(ADDRESS_STATE_COOKIE)?.value;
  const addressState = addressStateCookie
    ? decodeURIComponent(addressStateCookie)
    : undefined;

  const queryContext = buildContextFromParams({
    campaign: coerceParam(search?.campaign),
    tag: coerceParam(search?.tag),
    homeTag: coerceParam(search?.homeTag),
    templateTag: coerceParam(search?.templateTag),
    segment: coerceParam(search?.segment),
    region: coerceParam(search?.region),
    language: coerceParam(search?.language),
    device: coerceParam(search?.device),
  });

  // Build address context if user has selected a delivery address
  const addressContext: PageContext | null = addressState
    ? { addressState, source: 'address' }
    : null;

  const baseContext = mergeContexts(
    storedContext,
    queryContext,
    addressContext,
  );
  const combinedContext = ensureLanguageAttribute(baseContext, lang);
  const versionTags = contextToTags(combinedContext);

  let homeTemplate = null;
  try {
    if (isPreview) {
      homeTemplate = await getLatestHomeTemplateVersion({ tags: versionTags });
      if (!homeTemplate) {
        console.warn(
          '[Home Page] No draft version available, falling back to published template',
        );
        homeTemplate = await getPublishedHomeTemplate({ tags: versionTags });
      }
    } else {
      homeTemplate = await getPublishedHomeTemplateCached({
        tags: versionTags,
      });
    }
  } catch (err) {
    console.error('[Home Page] Error loading home template:', err);
    homeTemplate = null;
  }

  // Render home page with template blocks (or empty for preview mode)
  return (
    <>
      {siteUrl ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteName,
              url: `${siteUrl}/${lang}`,
              inLanguage: lang,
            }),
          }}
        />
      ) : null}
      <HomePageWithPreview
        lang={lang}
        serverBlocks={homeTemplate?.blocks || []}
        isPreview={isPreview}
        templateTags={homeTemplate?.tags ?? versionTags}
        matchInfo={homeTemplate?.matchedBy}
      />
    </>
  );
}
