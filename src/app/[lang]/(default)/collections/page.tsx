import { Suspense } from 'react';
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from '@tanstack/react-query';
import Divider from '@components/ui/divider';
import CollectionPageContent from './collection-page-content';
import { Metadata } from 'next';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { serverFetchCollections } from '@/lib/pim/server-fetch';

// Generate dynamic SEO metadata for collections list page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const homeSettings = await getServerHomeSettings(lang);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  const title = lang === 'it' ? 'Collezioni' : 'Collections';
  const description =
    lang === 'it'
      ? 'Scopri le nostre collezioni di prodotti selezionati'
      : 'Discover our curated product collections';

  const canonicalUrl = `${siteUrl}/${lang}/collections`;

  return {
    title: `${title} | ${brandingTitle}`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}/it/collections`,
        en: `${siteUrl}/en/collections`,
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
      index: true,
      follow: true,
    },
  };
}

function CollectionFallback() {
  return <>Loading...</>;
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // Prefetch collections into React Query cache for SSR
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['collections'],
    queryFn: () => serverFetchCollections(),
  });

  return (
    <>
      <Divider />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<CollectionFallback />}>
          <CollectionPageContent lang={lang} />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
