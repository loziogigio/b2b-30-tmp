import {
  connectToDatabase,
  getHomeTemplateModelForDb,
  getB2BPageModelForDb,
  resolveTenantDbTarget,
} from '@/lib/db/connection';
import { cachedJson } from '@/lib/cache/redis-cache';
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

/** Redis key prefix for a tenant's CMS pages (per-slug key appends the slug). */
export function cmsPageCachePrefix(tenantId: string): string {
  return `page:${tenantId}:`;
}

/** Redis key for a tenant's CMS page registry (sitemap/nav list). */
export function cmsRegistryCacheKey(tenantId: string): string {
  return `page-registry:${tenantId}`;
}

/**
 * Cached read of a published CMS page, stored in Redis per (tenant, slug).
 *
 * Works in both single- and multi-tenant mode: the tenant is resolved *outside*
 * the cache (so the producer keeps full request context, unlike an
 * `unstable_cache` callback). Stale-while-revalidate + stale-if-error absorb
 * transient Mongo blips; the publish-event subscriber deletes the key.
 * Falls back to a direct read when Redis is unavailable.
 */
export async function getCachedCmsPage(
  slug: string,
): Promise<CmsPageDocument | null> {
  const { tenantId } = await resolveTenantDbTarget();
  return cachedJson(
    `${cmsPageCachePrefix(tenantId)}${slug}`,
    { softTtlMs: 300_000, hardTtlSeconds: 3600 },
    () => loadCmsPage(slug),
  );
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
 * Cached read of the CMS page registry, stored in Redis per tenant. Flushed by
 * the publish-event subscriber on `sitemap`/`page` invalidations. Falls back to
 * a direct read when Redis is unavailable.
 */
export async function getCachedCmsPageRegistry(): Promise<
  CmsPageRegistryEntry[]
> {
  const { tenantId } = await resolveTenantDbTarget();
  return cachedJson(
    cmsRegistryCacheKey(tenantId),
    { softTtlMs: 300_000, hardTtlSeconds: 3600 },
    () => loadCmsPageRegistry(),
  );
}
