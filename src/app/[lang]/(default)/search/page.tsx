import { Suspense } from 'react';
import Divider from '@components/ui/divider';
import SearchB2BPageContent from './search-b2b-page-content';
import { Metadata } from 'next';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';

// Generate dynamic SEO metadata for search page
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    q?: string;
    collection?: string;
    [key: string]: string | undefined;
  }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const search = await searchParams;
  const homeSettings = await getServerHomeSettings();

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  const query = search?.q || '';
  const collection = search?.collection || '';

  // Build title based on search context
  let title: string;
  let description: string;

  if (query && collection) {
    title =
      lang === 'it'
        ? `Ricerca "${query}" in ${collection}`
        : `Search "${query}" in ${collection}`;
    description =
      lang === 'it'
        ? `Risultati della ricerca per "${query}" nella collezione ${collection}`
        : `Search results for "${query}" in collection ${collection}`;
  } else if (query) {
    title = lang === 'it' ? `Ricerca "${query}"` : `Search "${query}"`;
    description =
      lang === 'it'
        ? `Risultati della ricerca per "${query}"`
        : `Search results for "${query}"`;
  } else if (collection) {
    title =
      lang === 'it' ? `Collezione ${collection}` : `Collection ${collection}`;
    description =
      lang === 'it'
        ? `Prodotti della collezione ${collection}`
        : `Products in collection ${collection}`;
  } else {
    title = lang === 'it' ? 'Ricerca prodotti' : 'Product Search';
    description =
      lang === 'it'
        ? 'Cerca tra i nostri prodotti'
        : 'Search through our products';
  }

  // Build canonical URL (without query params for main search page)
  const canonicalUrl = `${siteUrl}/${lang}/search`;

  return {
    title: `${title} | ${brandingTitle}`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}/it/search`,
        en: `${siteUrl}/en/search`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: brandingTitle,
      type: 'website',
      locale: lang === 'it' ? 'it_IT' : 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      // Don't index search results pages with queries
      index: !query,
      follow: true,
    },
  };
}

function SearchBarFallback() {
  return <>Loading...</>;
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <>
      <Divider />
      <Suspense fallback={<SearchBarFallback />}>
        <SearchB2BPageContent lang={lang} />
      </Suspense>
    </>
  );
}
