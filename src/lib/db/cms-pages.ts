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
 *
 * When `lang` is provided, the page is additionally gated on the b2bpage
 * record's `lang` field: if a record exists with a *different* lang, we
 * return null so the wrong-language URL falls through to product resolution
 * or 404. Missing b2bpage records are not blocked (legacy / orphan templates
 * that predate per-language CMS pages continue to work).
 */
export async function loadCmsPage(
  slug: string,
  lang?: string,
): Promise<CmsPageDocument | null> {
  const connection = await connectToDatabase();

  // Language gate: look up the b2bpage record to check its lang.
  // Only block when a record IS present AND its lang differs from the URL lang.
  if (lang !== undefined) {
    const B2BPageModel = await getB2BPageModelForDb(connection.name);
    const pageRecord = await B2BPageModel
      .findOne({ portal_slug: PORTAL_SLUG, slug, status: 'active' })
      .select({ lang: 1 })
      .lean<{ lang?: string } | null>();
    if (pageRecord && pageRecord.lang && pageRecord.lang !== lang) {
      return null;
    }
  }

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
 * Cached read of a published CMS page, stored in Redis per (tenant, slug, lang).
 *
 * Works in both single- and multi-tenant mode: the tenant is resolved *outside*
 * the cache (so the producer keeps full request context, unlike an
 * `unstable_cache` callback). Stale-while-revalidate + stale-if-error absorb
 * transient Mongo blips; the publish-event subscriber deletes the key.
 * Falls back to a direct read when Redis is unavailable.
 */
export async function getCachedCmsPage(
  slug: string,
  lang?: string,
): Promise<CmsPageDocument | null> {
  const { tenantId } = await resolveTenantDbTarget();
  const key = `${cmsPageCachePrefix(tenantId)}${slug}${lang ? `:${lang}` : ''}`;
  return cachedJson(
    key,
    { softTtlMs: 300_000, hardTtlSeconds: 3600 },
    () => loadCmsPage(slug, lang),
  );
}

/** Lightweight registry entry — only the fields sitemap/nav consumers need. */
export type CmsPageRegistryEntry = Pick<
  B2BPageDocument,
  'slug' | 'title' | 'lang' | 'show_in_nav' | 'sort_order' | 'updated_at'
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
    .select({ slug: 1, title: 1, lang: 1, show_in_nav: 1, sort_order: 1, updated_at: 1 })
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
