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
import CategorySeoProducts from '@components/category/category-seo-products';
import { getServerHomeSettings } from '@/lib/home-settings/fetch-server';
import { serverFetchPimCategories } from '@/lib/pim/server-fetch';
import { extractSearchText } from '@/lib/category-search-text';
import {
  findNodeByPath,
  buildNodeAncestry,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { transformPimCategoriesTree } from '@framework/product/get-pim-categories';
import {
  getSeoConfig,
  categoryRootForLang,
  canonicalSiteUrl,
} from '@/lib/vcs/seo';
import { categoryDetailHref } from '@/lib/seo/category-root';

/** True for a "leaf" category — one with no sub-categories (so it lists products). */
function isLeafCategory(node: MenuTreeNode | null): node is MenuTreeNode {
  return !!node && !(node.isGroup && (node.children?.length ?? 0) > 0);
}

function coercePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/**
 * Load the PIM category tree once per request: the raw items (for the React
 * Query prefetch) and the transformed tree (for SEO metadata / breadcrumbs).
 * Backed by `serverFetchPimCategories`, which is `revalidate: 300` +
 * `categories-${tenant}`-tagged.
 */
const loadCategoryMenu = cache(async (channel?: string) => {
  const raw = await serverFetchPimCategories(channel);
  return { raw, tree: transformPimCategoriesTree(raw as any) };
});

const ROOT_LABEL_IT = 'Tutti i gruppi';
const ROOT_LABEL_EN = 'All Groups';

/** Pull the channel out of the `category-menu` widget config (default 'b2b'). */
function resolveCategoryChannel(homeSettings: any): string {
  const rows = homeSettings?.headerConfig?.rows ?? [];
  const widget = rows
    .flatMap((r: any) => r.blocks ?? [])
    .flatMap((b: any) => b.widgets ?? [])
    .find((w: any) => w.type === 'category-menu');
  return (widget?.config?.channel as string | undefined) || 'b2b';
}

// Generate dynamic SEO metadata for category pages
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { lang, slug = [] } = await params;
  const sp = await searchParams;
  const page = coercePage(sp?.page);
  // Filtered combinations (`?filters-brand_id=…`) shouldn't compete with the
  // canonical category URL in the index; the bare URL stays the entry point.
  const hasFilterParam = Object.keys(sp || {}).some((k) =>
    k.startsWith('filters-'),
  );

  const [homeSettings, seoConfig] = await Promise.all([
    getServerHomeSettings(lang),
    getSeoConfig(),
  ]);
  const channel = seoConfig.channel || resolveCategoryChannel(homeSettings);
  const { tree } = await loadCategoryMenu(channel);

  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  const siteUrl = canonicalSiteUrl(seoConfig);
  const rootLabel = lang === 'it' ? ROOT_LABEL_IT : ROOT_LABEL_EN;
  // Public category root segment per locale (default `categorie`, spec D2/D3).
  const root = categoryRootForLang(seoConfig, lang);
  const rootIt = categoryRootForLang(seoConfig, 'it');
  const rootEn = categoryRootForLang(seoConfig, 'en');

  // No slug → "all categories" page
  if (!slug.length) {
    const description =
      lang === 'it'
        ? 'Esplora tutti i gruppi di prodotti'
        : 'Explore all product groups';
    const canonicalUrl = `${siteUrl}${categoryDetailHref(lang, [], root)}`;

    return {
      title: `${rootLabel} | ${brandingTitle}`,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          it: `${siteUrl}${categoryDetailHref('it', [], rootIt)}`,
          en: `${siteUrl}${categoryDetailHref('en', [], rootEn)}`,
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
  // Paginated leaf pages are self-canonical (`?page=N`); a `?page` on a
  // non-leaf (or page 1) canonicalises to the bare URL.
  const pageSuffix =
    isLeafCategory(category) && page > 1 ? `?page=${page}` : '';
  const canonicalUrl = `${siteUrl}${categoryDetailHref(
    lang,
    slug,
    root,
  )}${pageSuffix}`;
  const categoryImage = category.category_banner_image || '';
  const keywords = [categoryName, ...slug].filter(Boolean);

  return {
    title:
      page > 1
        ? `${categoryName} – ${lang === 'it' ? 'pagina' : 'page'} ${page} | ${brandingTitle}`
        : `${categoryName} | ${brandingTitle}`,
    description: categoryDescription,
    keywords: keywords.join(', '),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        it: `${siteUrl}${categoryDetailHref('it', slug, rootIt)}${pageSuffix}`,
        en: `${siteUrl}${categoryDetailHref('en', slug, rootEn)}${pageSuffix}`,
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
    robots: { index: !hasFilterParam, follow: true },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang, slug } = await params;
  const slugSegments = slug ?? [];
  const sp = await searchParams;
  const page = coercePage(sp?.page);

  // Collect URL-driven facet filters (e.g. `?filters-brand_id=BOSCH`) so the
  // SSR leaf grid can re-render server-side with them applied.
  const selectedFilters: Record<string, string> = {};
  for (const [key, value] of Object.entries(sp || {})) {
    if (key.startsWith('filters-') && value) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v) selectedFilters[key.replace('filters-', '')] = String(v);
    }
  }

  // Resolve the active sales channel so the server prefetch matches the
  // client `usePimCategoriesQuery` cache key.
  const [homeSettings, seoConfig] = await Promise.all([
    getServerHomeSettings(lang),
    getSeoConfig(),
  ]);
  const channel = seoConfig.channel || resolveCategoryChannel(homeSettings);
  const brandingTitle = homeSettings?.branding?.title || 'VINC - B2B';
  // Public, per-tenant category-root segment (default `categorie`, spec D2/D3).
  const categoryRoot = categoryRootForLang(seoConfig, lang);
  const siteUrl = canonicalSiteUrl(seoConfig);
  const { raw, tree } = await loadCategoryMenu(channel);

  const category: MenuTreeNode | null = slugSegments.length
    ? findNodeByPath(tree, slugSegments)
    : null;
  const ancestry =
    category && slugSegments.length ? buildNodeAncestry(tree, category) : [];
  const rootLabel = lang === 'it' ? ROOT_LABEL_IT : ROOT_LABEL_EN;

  // Leaf categories get the server-rendered, paginated SEO product grid;
  // the client CategoryPage then skips its own products carousel.
  const isLeaf = slugSegments.length > 0 && isLeafCategory(category);
  const basePath = categoryDetailHref(lang, slugSegments, categoryRoot);

  // Hydrate the tree into React Query for the client CategoryPage component.
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: channel ? ['pim-categories', channel] : ['pim-categories'],
    queryFn: async () => ({ menuItems: tree, flat: raw }),
  });

  return (
    <>
      <CategoryJsonLd
        category={category}
        ancestry={ancestry}
        lang={lang}
        rootLabel={rootLabel}
        siteName={brandingTitle}
        siteUrl={siteUrl}
        categoryRoot={categoryRoot}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CategoryPage
          lang={lang}
          slug={slugSegments}
          disableLeafCarousel={isLeaf}
          categoryRoot={categoryRoot}
        />
      </HydrationBoundary>
      {isLeaf && category ? (
        <CategorySeoProducts
          lang={lang}
          basePath={basePath}
          searchText={extractSearchText(category.url, category.slug)}
          categoryId={category.category_id}
          page={page}
          heading={category.label || category.name}
          selectedFilters={selectedFilters}
        />
      ) : null}
    </>
  );
}
