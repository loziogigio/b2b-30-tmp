import { connectToDatabase, getHomeTemplateModelForDb } from './connection';
import type {
  HomeTemplateDocument,
  HomeTemplateVersion,
} from './models/home-template';
import type { PageVersionTags } from '@/lib/types/blocks';
import {
  normalizeTagsInput,
  resolveVersion,
} from '@/lib/page-version-resolver';

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

/**
 * Get published home template for vinc-b2b
 * New structure: Queries for all documents with same templateId, uses version resolver
 */
export async function getPublishedHomeTemplate(options?: {
  tags?: PageVersionTags | null;
}): Promise<any | null> {
  console.log('[getPublishedHomeTemplate] Starting...');

  let connection;
  try {
    connection = await connectToDatabase();
    console.log('[getPublishedHomeTemplate] DB connected to:', connection.name);
  } catch (err) {
    console.error('[getPublishedHomeTemplate] DB connection failed:', err);
    return null;
  }

  // Get model for this specific connection using model registry
  const HomeTemplateModel = await getHomeTemplateModelForDb(connection.name);

  const normalizedTags = normalizeTagsInput(options?.tags);

  // Find all versions for this template
  const versions = await HomeTemplateModel.find({
    templateId: HOME_TEMPLATE_ID,
    isActive: true,
  }).lean<HomeTemplateDocument[]>();

  console.log('[getPublishedHomeTemplate] Found', versions?.length || 0, 'versions');
  if (versions?.length > 0) {
    console.log('[getPublishedHomeTemplate] First version _id:', versions[0]._id?.toString());
    console.log('[getPublishedHomeTemplate] First version name:', versions[0].name);
  }

  if (!versions || versions.length === 0) {
    console.log('[getPublishedHomeTemplate] No versions found');
    return null;
  }

  // Find the current published version as fallback
  const currentPublished = versions.find((v) => v.isCurrentPublished);
  const fallbackVersionNumber = currentPublished?.version;
  console.log('[getPublishedHomeTemplate] Fallback version:', fallbackVersionNumber);

  const resolution = resolveVersion({
    versions: versions as any,
    allowedStatuses: ['published'],
    tags: normalizedTags,
    fallbackVersionNumber,
    respectActiveWindow: true,
  });

  console.log('[getPublishedHomeTemplate] Resolution:', resolution ? `v${resolution.version.version} (${resolution.matchedBy})` : 'null');

  if (!resolution) {
    return null;
  }

  const result = buildReturnPayload(resolution.version, resolution.matchedBy);
  console.log('[getPublishedHomeTemplate] Returning', result.blocks?.length || 0, 'blocks');
  return result;
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
