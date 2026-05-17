import { unstable_cache } from 'next/cache';
import {
  connectToDatabase,
  getHomeTemplateModelForDb,
} from '@/lib/db/connection';
import { cacheTag, currentTenantId } from '@/lib/cache/tags';
import type { HomeTemplateDocument } from '@/lib/db/models/home-template';

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
 */
export async function getCachedCmsPage(
  slug: string,
): Promise<CmsPageDocument | null> {
  const tenantId = await currentTenantId();
  const tag = cacheTag('page', tenantId, slug);
  const fn = unstable_cache(() => loadCmsPage(slug), [tag], {
    tags: [tag],
    revalidate: 300,
  });
  return fn();
}
