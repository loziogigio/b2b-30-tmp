import type { MetadataRoute } from 'next';
import {
  fetchProductSkusForSitemap,
  serverFetchPimMenu,
  serverFetchCollections,
} from '@/lib/pim/server-fetch';
import { getCachedCmsPageRegistry } from '@/lib/db/cms-pages';
import { slugify } from '@/utils/slugify';

const PRODUCTS_PER_SITEMAP = 10000;
const LANGUAGES = ['it', 'en'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';
  if (!siteUrl) return [];

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // ===============================
  // Built-in routes (typed segments under app/[lang]/(default)/*)
  // ===============================
  const builtInRoutes = [
    { path: '', changeFrequency: 'daily' as const, priority: 1.0 },
    { path: '/search', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/category', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/collections', changeFrequency: 'weekly' as const, priority: 0.8 },
  ];

  for (const lang of LANGUAGES) {
    for (const page of builtInRoutes) {
      entries.push({
        url: `${siteUrl}/${lang}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    }
  }

  // ===============================
  // CMS pages authored in suite (b2bpages registry → /[lang]/[slug])
  // Cached via `sitemap` tag — suite invalidates on every page publish.
  // ===============================
  try {
    const cmsPages = await getCachedCmsPageRegistry();
    for (const lang of LANGUAGES) {
      for (const p of cmsPages) {
        entries.push({
          url: `${siteUrl}/${lang}/${p.slug}`,
          lastModified: p.updated_at ?? now,
          changeFrequency: 'monthly',
          priority: 0.4,
        });
      }
    }
  } catch {
    // Registry unreachable — skip rather than fail the whole sitemap.
  }

  // ===============================
  // Category pages from PIM menu
  // ===============================
  try {
    const menuItems = await serverFetchPimMenu('header');

    function extractCategoryPaths(
      items: any[],
      parentPath: string[] = [],
    ): string[][] {
      const paths: string[][] = [];
      for (const item of items) {
        const slug = slugify(item.reference_id || item.label || item.id);
        const currentPath = [...parentPath, slug];
        paths.push(currentPath);
        if (item.children?.length) {
          paths.push(...extractCategoryPaths(item.children, currentPath));
        }
      }
      return paths;
    }

    const categoryPaths = extractCategoryPaths(menuItems);
    for (const lang of LANGUAGES) {
      for (const path of categoryPaths) {
        entries.push({
          url: `${siteUrl}/${lang}/category/${path.join('/')}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch {
    // Skip categories if fetch fails
  }

  // ===============================
  // Collections pages
  // ===============================
  try {
    const collections = await serverFetchCollections();
    for (const lang of LANGUAGES) {
      for (const collection of collections) {
        if (collection.slug) {
          entries.push({
            url: `${siteUrl}/${lang}/collections/${collection.slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    // Skip collections if fetch fails
  }

  // ===============================
  // Product pages (paginated for 50k+ catalogs)
  // ===============================
  try {
    // First fetch to get total count
    const firstBatch = await fetchProductSkusForSitemap(
      0,
      PRODUCTS_PER_SITEMAP,
    );

    // Add first batch
    for (const sku of firstBatch.skus) {
      for (const lang of LANGUAGES) {
        entries.push({
          url: `${siteUrl}/${lang}/products/${encodeURIComponent(sku)}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }

    // Fetch remaining batches if needed
    const totalProducts = firstBatch.total;
    const remainingBatches = Math.ceil(
      (totalProducts - PRODUCTS_PER_SITEMAP) / PRODUCTS_PER_SITEMAP,
    );

    for (let i = 0; i < remainingBatches; i++) {
      const start = (i + 1) * PRODUCTS_PER_SITEMAP;
      const batch = await fetchProductSkusForSitemap(
        start,
        PRODUCTS_PER_SITEMAP,
      );

      for (const sku of batch.skus) {
        for (const lang of LANGUAGES) {
          entries.push({
            url: `${siteUrl}/${lang}/products/${encodeURIComponent(sku)}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // Skip products if fetch fails
  }

  return entries;
}
