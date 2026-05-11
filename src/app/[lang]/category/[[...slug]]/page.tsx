// app/[lang]/category/[[...slug]]/page.tsx  (Next.js App Router)

import { Metadata } from 'next';
import { cache } from 'react';
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from '@tanstack/react-query';
import CategoryPage from '@components/category/category-page';
import CategoryJsonLd from '@components/seo/category-json-ld';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { serverFetchPimMenu } from '@/lib/pim/server-fetch';
import {
  transformPimMenuTree,
  findNodeByPath,
  buildNodeAncestry,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';

/**
 * Load the header menu once per request: the raw items (for the React Query
 * prefetch) and the transformed tree (for SEO metadata / breadcrumbs). Backed
 * by `serverFetchPimMenu`, which is `revalidate: 300` + `menu-${tenant}`-tagged.
 */
const loadCategoryMenu = cache(async () => {
  const raw = await serverFetchPimMenu('header');
  return { raw, tree: transformPimMenuTree(raw as any) };
});

const ROOT_LABEL_IT = 'Tutti i gruppi';
const ROOT_LABEL_EN = 'All Groups';

// Generate dynamic SEO metadata for category pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { lang, slug = [] } = await params;

  const [{ tree }, homeSettings] = await Promise.all([
    loadCategoryMenu(),
    getServerHomeSettings(),
  ]);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || '').replace(
    /\/$/,
    '',
  );
  const rootLabel = lang === 'it' ? ROOT_LABEL_IT : ROOT_LABEL_EN;

  // No slug → "all categories" page
  if (!slug.length) {
    const description =
      lang === 'it'
        ? 'Esplora tutti i gruppi di prodotti'
        : 'Explore all product groups';
    const canonicalUrl = `${siteUrl}/${lang}/category`;

    return {
      title: `${rootLabel} | ${brandingTitle}`,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          it: `${siteUrl}/it/category`,
          en: `${siteUrl}/en/category`,
        },
      },
      openGraph: {
        title: rootLabel,
        description,
        url: canonicalUrl,
        siteName: brandingTitle,
        type: 'website',
        locale: lang === 'it' ? 'it_IT' : 'en_US',
      },
      twitter: { card: 'summary', title: rootLabel, description },
      robots: { index: true, follow: true },
    };
  }

  const category = findNodeByPath(tree, slug);
  if (!category) {
    return {
      title: `Categoria | ${brandingTitle}`,
      description: 'Categoria di prodotti',
    };
  }

  const categoryName = category.label || category.name;
  const categoryDescription =
    category.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    (lang === 'it'
      ? `Scopri i prodotti della categoria ${categoryName}`
      : `Discover products in ${categoryName} category`);
  const canonicalUrl = `${siteUrl}/${lang}/category/${slug.join('/')}`;
  const categoryImage = category.category_banner_image || '';
  const keywords = [categoryName, ...slug].filter(Boolean);

  return {
    title: `${categoryName} | ${brandingTitle}`,
    description: categoryDescription,
    keywords: keywords.join(', '),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}/it/category/${slug.join('/')}`,
        en: `${siteUrl}/en/category/${slug.join('/')}`,
      },
    },
    openGraph: {
      title: categoryName,
      description: categoryDescription,
      url: canonicalUrl,
      siteName: brandingTitle,
      type: 'website',
      locale: lang === 'it' ? 'it_IT' : 'en_US',
      images: categoryImage
        ? [{ url: categoryImage, width: 1200, height: 630, alt: categoryName }]
        : [],
    },
    twitter: {
      card: categoryImage ? 'summary_large_image' : 'summary',
      title: categoryName,
      description: categoryDescription,
      images: categoryImage ? [categoryImage] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await params;
  const slugSegments = slug ?? [];

  const { raw, tree } = await loadCategoryMenu();

  const category: MenuTreeNode | null = slugSegments.length
    ? findNodeByPath(tree, slugSegments)
    : null;
  const ancestry =
    category && slugSegments.length ? buildNodeAncestry(tree, category) : [];
  const rootLabel = lang === 'it' ? ROOT_LABEL_IT : ROOT_LABEL_EN;

  // Hydrate the menu into React Query for the client CategoryPage component.
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['pim-menu', 'header'],
    queryFn: async () => ({ menuItems: tree, flat: raw }),
  });

  return (
    <>
      <CategoryJsonLd
        category={category}
        ancestry={ancestry}
        lang={lang}
        rootLabel={rootLabel}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CategoryPage lang={lang} slug={slugSegments} />
      </HydrationBoundary>
    </>
  );
}
