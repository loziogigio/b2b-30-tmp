import { Suspense } from 'react';
import Divider from '@components/ui/divider';
import CollectionDetailContent from './collection-detail-content';
import { Metadata } from 'next';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';

// Server-side collection fetch for SEO metadata
async function fetchCollectionForSeo(slug: string) {
  const PIM_API_BASE_URL = process.env.NEXT_PUBLIC_PIM_API_URL || '';
  const url = `${PIM_API_BASE_URL}/api/public/collections/${slug}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID || '',
        'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET || '',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.collection || null;
  } catch {
    return null;
  }
}

// Generate dynamic SEO metadata for collection pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;

  const [collection, homeSettings] = await Promise.all([
    fetchCollectionForSeo(slug),
    getServerHomeSettings(),
  ]);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  // Fallback metadata if collection not found
  if (!collection) {
    return {
      title: `Collezione | ${brandingTitle}`,
      description: 'Collezione di prodotti',
    };
  }

  const collectionName = collection.name || slug;
  const collectionDescription =
    collection.seo?.description ||
    collection.description ||
    `${collectionName} - Scopri la nostra collezione`;

  // Get collection image
  const collectionImage = collection.hero_image?.url || '';

  // Build canonical URL
  const canonicalUrl = `${siteUrl}/${lang}/collections/${slug}`;

  // Build keywords
  const keywords = [collectionName, ...(collection.seo?.keywords || [])].filter(
    Boolean,
  );

  return {
    title: collection.seo?.title || `${collectionName} | Collezione`,
    description: collectionDescription,
    keywords: keywords.join(', '),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}/it/collections/${slug}`,
        en: `${siteUrl}/en/collections/${slug}`,
      },
    },
    openGraph: {
      title: collectionName,
      description: collectionDescription,
      url: canonicalUrl,
      siteName: brandingTitle,
      type: 'website',
      locale: lang === 'it' ? 'it_IT' : 'en_US',
      images: collectionImage
        ? [
            {
              url: collectionImage,
              width: 1200,
              height: 630,
              alt: collectionName,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: collectionName,
      description: collectionDescription,
      images: collectionImage ? [collectionImage] : [],
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
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;

  return (
    <>
      <Divider />
      <Suspense fallback={<CollectionFallback />}>
        <CollectionDetailContent lang={lang} slug={slug} />
      </Suspense>
    </>
  );
}
