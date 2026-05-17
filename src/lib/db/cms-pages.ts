import { unstable_cache } from 'next/cache';
import {
  connectToDatabase,
  getHomeTemplateModelForDb,
  getB2BPageModelForDb,
} from '@/lib/db/connection';
import { cacheTag, SINGLE_TENANT_ID } from '@/lib/cache/tags';
import { isSingleTenant } from '@/lib/tenant';
import type { HomeTemplateDocument } from '@/lib/db/models/home-template';
import type { B2BPageDocument } from '@/lib/db/models/b2b-page';

// vinc-b2b is one-portal-per-tenant: the suite admin allows multiple portals,
// but the storefront only renders the `default` portal's pages.
const PORTAL_SLUG = 'default';

const buildTemplateId = (slug: string) => `b2b-${PORTAL_SLUG}-page-${slug}`;

export type CmsPageDocument = Pick<
  HomeTemplateDocument,
  | 'templateId'
  | 'name'
  | 'version'
  | 'status'
  | 'blocks'
  | 'seo'
  | 'publishedAt'
>;

/**
 * Raw, uncached read of a published CMS page by slug.
 * Returns null when the page is missing or only has a draft version.
 */
export async function loadCmsPage(
  slug: string,
): Promise<CmsPageDocument | null> {
  const connection = await connectToDatabase();
  const Model = await getHomeTemplateModelForDb(connection.name);
  const doc = await Model.findOne({
    templateId: buildTemplateId(slug),
    status: 'published',
  }).lean<CmsPageDocument | null>();
  return doc ?? null;
}

/**
 * Cached read of a published CMS page. Tagged with `page-{tenantId}-{slug}`
 * so suite's `invalidateB2BCache(tenantId, ['page:{slug}'])` flushes it on
 * publish. 5-minute TTL safety net when REDIS_HOST is unset.
 *
 * Only used in single-tenant mode: in multi-tenant, connectToDatabase resolves
 * the tenant DB from request headers, which `unstable_cache` callbacks can't
 * read (they run outside the request context, so headers() falls back and
 * returns the wrong tenant's data).
 */
export async function getCachedCmsPage(
  slug: string,
): Promise<CmsPageDocument | null> {
  if (!isSingleTenant) return loadCmsPage(slug);
  const tag = cacheTag('page', SINGLE_TENANT_ID, slug);
  const fn = unstable_cache(
    () => loadCmsPage(slug),
    ['cms-page', SINGLE_TENANT_ID, slug],
    { tags: [tag], revalidate: 300 },
  );
  return fn();
}

/** Lightweight registry entry — only the fields sitemap/nav consumers need. */
export type CmsPageRegistryEntry = Pick<
  B2BPageDocument,
  'slug' | 'title' | 'show_in_nav' | 'sort_order' | 'updated_at'
>;

/**
 * Raw, uncached read of every active CMS page in the default portal.
 * Sorted by `sort_order` ascending so navigation menus get a stable order.
 */
export async function loadCmsPageRegistry(): Promise<CmsPageRegistryEntry[]> {
  const connection = await connectToDatabase();
  const Model = await getB2BPageModelForDb(connection.name);
  return Model.find({ portal_slug: PORTAL_SLUG, status: 'active' })
    .sort({ sort_order: 1 })
    .select({ slug: 1, title: 1, show_in_nav: 1, sort_order: 1, updated_at: 1 })
    .lean<CmsPageRegistryEntry[]>();
}

/**
 * Cached read of the CMS page registry. Tagged with `sitemap-{tenantId}` so
 * suite's `invalidateB2BCache(tenantId, ['sitemap'])` (already emitted on
 * every page publish) flushes it. Single-tenant only — same caveat as
 * `getCachedCmsPage`.
 */
export async function getCachedCmsPageRegistry(): Promise<
  CmsPageRegistryEntry[]
> {
  if (!isSingleTenant) return loadCmsPageRegistry();
  const tag = cacheTag('sitemap', SINGLE_TENANT_ID);
  const fn = unstable_cache(
    () => loadCmsPageRegistry(),
    ['cms-page-registry', SINGLE_TENANT_ID],
    { tags: [tag], revalidate: 300 },
  );
  return fn();
}
