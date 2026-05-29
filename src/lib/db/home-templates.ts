import {
  connectToDatabase,
  getPooledConnection,
  getHomeTemplateModelForDb,
  resolveTenantDbTarget,
} from './connection';
import type {
  HomeTemplateDocument,
  HomeTemplateVersion,
} from './models/home-template';
import type { PageVersionTags } from '@/lib/types/blocks';
import {
  normalizeTagsInput,
  resolveVersion,
} from '@/lib/page-version-resolver';
import { cachedJson } from '@/lib/cache/redis-cache';

const HOME_TEMPLATE_ID = 'home-page';

const buildReturnPayload = (
  version: HomeTemplateVersion | HomeTemplateDocument,
  matchedBy: string,
) => ({
  blocks: version.blocks,
  seo: version.seo,
  version: version.version,
  publishedAt: version.publishedAt,
  status: version.status,
  lastSavedAt: version.lastSavedAt,
  tags: version.tags ?? (version.tag ? { campaign: version.tag } : undefined),
  priority: version.priority,
  isDefault: version.isDefault,
  activeFrom: version.activeFrom,
  activeTo: version.activeTo,
  matchedBy,
});

/** Open the pooled connection for `dbName`, retrying a few times so a cold
 *  start or a transient remote-Mongo blip doesn't surface as a null template
 *  (→ "No Content Available"). Throws after the final attempt so the caller's
 *  cache does NOT store an empty result for a connection failure. */
async function connectForDbWithRetry(dbName: string, attempts = 3) {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await getPooledConnection(dbName);
    } catch (err) {
      lastErr = err;
      console.warn(
        `[getPublishedHomeTemplate] DB connect attempt ${i}/${attempts} for ${dbName} failed:`,
        (err as Error)?.message,
      );
      if (i < attempts) await new Promise((r) => setTimeout(r, i * 200));
    }
  }
  throw lastErr;
}

/**
 * Core fetch for an explicit database name (no `headers()` / tenant resolution
 * inside — so it is safe to wrap in `unstable_cache`). On a connection failure
 * it throws (rather than returning null) so the caller's cache treats it as an
 * error and serves stale instead of caching an empty page.
 */
async function fetchPublishedHomeTemplateForDb(
  dbName: string,
  options?: { tags?: PageVersionTags | null },
): Promise<any | null> {
  const connection = await connectForDbWithRetry(dbName);
  console.log('[getPublishedHomeTemplate] DB connected to:', connection.name);

  // Get model for this specific connection using model registry
  const HomeTemplateModel = await getHomeTemplateModelForDb(connection.name);

  const normalizedTags = normalizeTagsInput(options?.tags);

  // Find all versions for this template
  const versions = await HomeTemplateModel.find({
    templateId: HOME_TEMPLATE_ID,
    isActive: true,
  }).lean<HomeTemplateDocument[]>();

  console.log(
    '[getPublishedHomeTemplate] Found',
    versions?.length || 0,
    'versions',
  );
  if (versions?.length > 0) {
    console.log(
      '[getPublishedHomeTemplate] First version _id:',
      versions[0]._id?.toString(),
    );
    console.log(
      '[getPublishedHomeTemplate] First version name:',
      versions[0].name,
    );
  }

  if (!versions || versions.length === 0) {
    console.log('[getPublishedHomeTemplate] No versions found');
    return null;
  }

  // Find the current published version as fallback
  const currentPublished = versions.find((v) => v.isCurrentPublished);
  const fallbackVersionNumber = currentPublished?.version;
  console.log(
    '[getPublishedHomeTemplate] Fallback version:',
    fallbackVersionNumber,
  );

  const resolution = resolveVersion({
    versions: versions as any,
    allowedStatuses: ['published'],
    tags: normalizedTags,
    fallbackVersionNumber,
    respectActiveWindow: true,
  });

  console.log(
    '[getPublishedHomeTemplate] Resolution:',
    resolution
      ? `v${resolution.version.version} (${resolution.matchedBy})`
      : 'null',
  );

  if (!resolution) {
    return null;
  }

  const result = buildReturnPayload(resolution.version, resolution.matchedBy);
  console.log(
    '[getPublishedHomeTemplate] Returning',
    result.blocks?.length || 0,
    'blocks',
  );
  return result;
}

/**
 * Resolve the tenant DB + published home template (uncached).
 * Used by the preview path and as the producer behind the cached variant.
 */
export async function getPublishedHomeTemplate(options?: {
  tags?: PageVersionTags | null;
}): Promise<any | null> {
  const { dbName } = await resolveTenantDbTarget();
  return fetchPublishedHomeTemplateForDb(dbName, options);
}

/** Stable cache-key fragment for the version/context tags. Values may be
 *  nested objects (e.g. `attributes`), so serialize with sorted-key JSON to
 *  keep the key deterministic and collision-free. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

function tagsKey(tags?: PageVersionTags | null): string {
  const norm = normalizeTagsInput(tags);
  if (!norm || Object.keys(norm).length === 0) return 'default';
  return Object.keys(norm)
    .sort()
    .map((k) => `${k}=${stableStringify((norm as Record<string, unknown>)[k])}`)
    .join('&');
}

/** Redis cache key prefix for a tenant's home template (used for invalidation too). */
export function homeTemplateCachePrefix(tenantId: string): string {
  return `home-template:${tenantId}:`;
}

/**
 * Published home template, cached in Redis per (tenant, version-tags).
 *
 * Redis is the store so the value survives restarts and is shared across
 * processes; stale-while-revalidate + stale-if-error mean a transient
 * remote-Mongo blip serves the last-good template instead of an empty page.
 * The PIM publish-event subscriber deletes these keys on content changes.
 *
 * Falls back to a direct (uncached) fetch when Redis is unavailable.
 */
export async function getPublishedHomeTemplateCached(options?: {
  tags?: PageVersionTags | null;
}): Promise<any | null> {
  const { dbName, tenantId } = await resolveTenantDbTarget();
  const key = `${homeTemplateCachePrefix(tenantId)}${tagsKey(options?.tags)}`;
  return cachedJson(key, { softTtlMs: 300_000, hardTtlSeconds: 3600 }, () =>
    fetchPublishedHomeTemplateForDb(dbName, options),
  );
}

/**
 * Get the latest saved home template version (draft or published).
 * Used when the storefront loads with ?preview=true so admins see draft content.
 * New structure: Queries for all documents, uses version resolver
 */
export async function getLatestHomeTemplateVersion(options?: {
  tags?: PageVersionTags | null;
  allowDraft?: boolean;
}): Promise<any | null> {
  const connection = await connectToDatabase();

  // Get model for this specific connection using model registry
  const HomeTemplateModel = await getHomeTemplateModelForDb(connection.name);

  const normalizedTags = normalizeTagsInput(options?.tags);

  // Find all versions for this template
  const versions = await HomeTemplateModel.find({
    templateId: HOME_TEMPLATE_ID,
    isActive: true,
  }).lean<HomeTemplateDocument[]>();

  if (!versions || versions.length === 0) {
    return null;
  }

  // Find the current version as fallback
  const currentVersion = versions.find((v) => v.isCurrent);
  const fallbackVersionNumber = currentVersion?.version;

  const allowedStatuses =
    options?.allowDraft === false ? ['published'] : ['draft', 'published'];

  const resolution = resolveVersion({
    versions: versions as any,
    allowedStatuses,
    tags: normalizedTags,
    fallbackVersionNumber,
    respectActiveWindow: false,
  });

  if (!resolution) {
    return null;
  }

  return buildReturnPayload(resolution.version, resolution.matchedBy);
}
