import { connectToDatabase } from "./connection";
import { PageModel, type PageDocument } from "./models/page";
import type { PageConfig, PageBlock, PageVersion, PageVersionTags } from "@/lib/types/blocks";
import { normalizeTagsInput, resolveVersion } from "@/lib/page-version-resolver";
import type { VersionStatus } from "@/lib/page-version-resolver";

const serializeBlock = (
  block: { id: string; type: string; order?: number; config: unknown; metadata?: Record<string, unknown> }
): PageBlock => ({
  id: String(block.id),
  type: String(block.type),
  order: Number(block.order ?? 0),
  config: block.config as any,
  metadata: block.metadata ?? {}
});

const serializeVersion = (version: any): PageVersion => ({
  version: version.version,
  blocks: Array.isArray(version.blocks) ? version.blocks.map((block: any) => serializeBlock(block)) : [],
  seo: version.seo,
  status: version.status,
  createdAt: version.createdAt,
  lastSavedAt: version.lastSavedAt,
  publishedAt: version.publishedAt,
  createdBy: version.createdBy,
  comment: version.comment,
  tag: version.tag,
  tags: version.tags ?? undefined,
  priority: typeof version.priority === "number" ? version.priority : undefined,
  isDefault: Boolean(version.isDefault),
  activeFrom: version.activeFrom ?? undefined,
  activeTo: version.activeTo ?? undefined
});

const serializePage = (
  doc: Record<string, unknown> & {
    versions?: unknown[];
    currentVersion?: number | null;
    currentPublishedVersion?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }
): PageConfig => ({
  slug: String(doc.slug ?? ""),
  name: String(doc.name ?? ""),
  versions: Array.isArray(doc.versions) ? doc.versions.map((v: any) => serializeVersion(v)) : [],
  currentVersion: doc.currentVersion || 0,
  currentPublishedVersion: doc.currentPublishedVersion ?? undefined,
  createdAt: new Date(doc.createdAt ?? Date.now()).toISOString(),
  updatedAt: new Date(doc.updatedAt ?? Date.now()).toISOString()
});

const buildResolutionPayload = (
  slug: string,
  matchedBy: string,
  version: PageVersion
) => ({
  slug,
  matchedBy,
  version: version.version,
  status: version.status,
  blocks: version.blocks,
  seo: version.seo,
  tags: version.tags ?? (version.tag ? { campaign: version.tag } : undefined),
  priority: version.priority,
  isDefault: version.isDefault,
  activeFrom: version.activeFrom,
  activeTo: version.activeTo,
  comment: version.comment,
  createdAt: version.createdAt,
  lastSavedAt: version.lastSavedAt,
  publishedAt: version.publishedAt
});

/**
 * Get published page configuration for rendering
 * Returns the current published version, or falls back to a default empty page
 */
export const getPublishedPageConfig = async (slug: string): Promise<PageConfig | null> => {
  await connectToDatabase();

  const doc = await PageModel.findOne({ slug }).lean<PageDocument | null>();
  if (!doc) {
    return null;
  }

  return serializePage(doc);
};

export interface ResolvePageOptions {
  tags?: PageVersionTags | null;
  includeDraft?: boolean;
  respectActiveWindow?: boolean;
  now?: Date;
}

export const resolvePageVersion = async (
  slug: string,
  options?: ResolvePageOptions
): Promise<ReturnType<typeof buildResolutionPayload> | null> => {
  await connectToDatabase();

  const doc = await PageModel.findOne({ slug }).lean<PageDocument | null>();
  if (!doc) {
    return null;
  }

  const page = serializePage(doc);
  const normalizedTags = normalizeTagsInput(options?.tags);
  const allowedStatuses: VersionStatus[] = options?.includeDraft ? ["draft", "published"] : ["published"];

  const resolution = resolveVersion({
    versions: page.versions,
    allowedStatuses,
    tags: normalizedTags,
    fallbackVersionNumber: page.currentPublishedVersion,
    respectActiveWindow: options?.respectActiveWindow ?? true,
    now: options?.now
  });

  if (!resolution) {
    return null;
  }

  return buildResolutionPayload(page.slug, resolution.matchedBy, resolution.version);
};

export const getPageVersions = async (slug: string, status?: VersionStatus): Promise<PageVersion[]> => {
  await connectToDatabase();
  const doc = await PageModel.findOne({ slug }).lean<PageDocument | null>();
  if (!doc) return [];
  const page = serializePage(doc);
  if (!status) return page.versions;
  return page.versions.filter((version) => version.status === status);
};

export interface UpdatePublishingOptions {
  versionNumber: number;
  tags?: PageVersionTags | null;
  priority?: number;
  isDefault?: boolean;
  activeFrom?: string | Date | null;
  activeTo?: string | Date | null;
  comment?: string | null;
  status?: VersionStatus;
}

const coerceDate = (value?: string | Date | null) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const updatePagePublishing = async (
  slug: string,
  options: UpdatePublishingOptions
): Promise<PageVersion | null> => {
  await connectToDatabase();

  const { versionNumber } = options;
  if (versionNumber == null) {
    return null;
  }

  if (options.isDefault) {
    await PageModel.updateOne(
      { slug },
      { $set: { "versions.$[].isDefault": false } }
    ).catch(() => {});
  }

  const setOps: Record<string, any> = {};
  const unsetOps: Record<string, "" | 1> = {};
  const normalizedTags = normalizeTagsInput(options.tags);

  if (options.tags !== undefined) {
    if (normalizedTags) {
      setOps["versions.$.tags"] = normalizedTags;
    } else {
      unsetOps["versions.$.tags"] = "";
    }
  }

  if (typeof options.priority === "number" && Number.isFinite(options.priority)) {
    setOps["versions.$.priority"] = options.priority;
  } else if (options.priority === null) {
    unsetOps["versions.$.priority"] = "";
  }

  if (typeof options.isDefault === "boolean") {
    setOps["versions.$.isDefault"] = options.isDefault;
  }

  if (options.activeFrom !== undefined) {
    const coerced = coerceDate(options.activeFrom);
    if (coerced) {
      setOps["versions.$.activeFrom"] = coerced;
    } else {
      unsetOps["versions.$.activeFrom"] = "";
    }
  }

  if (options.activeTo !== undefined) {
    const coerced = coerceDate(options.activeTo);
    if (coerced) {
      setOps["versions.$.activeTo"] = coerced;
    } else {
      unsetOps["versions.$.activeTo"] = "";
    }
  }

  if (typeof options.comment === "string") {
    setOps["versions.$.comment"] = options.comment;
  } else if (options.comment === null) {
    unsetOps["versions.$.comment"] = "";
  }

  if (options.status) {
    setOps["versions.$.status"] = options.status;
    if (options.status === "published") {
      setOps["currentPublishedVersion"] = versionNumber;
    }
  }

  const updatePayload: Record<string, any> = {};
  if (Object.keys(setOps).length > 0) {
    updatePayload.$set = setOps;
  }
  if (Object.keys(unsetOps).length > 0) {
    updatePayload.$unset = unsetOps;
  }

  if (!Object.keys(updatePayload).length) {
    return null;
  }

  const result = await PageModel.updateOne(
    { slug, "versions.version": versionNumber },
    updatePayload
  );

  if (!result.matchedCount) {
    return null;
  }

  const refreshed = await PageModel.findOne({ slug }).lean<PageDocument | null>();
  if (!refreshed) return null;
  const serialized = serializePage(refreshed);
  return serialized.versions.find((v) => v.version === versionNumber) ?? null;
};

/**
 * Get product detail page blocks for server-side rendering
 * First checks for product-specific page (product-detail-{productId})
 * Falls back to default template (product-detail)
 */
export const getProductDetailBlocks = async (productId: string): Promise<PageBlock[]> => {
  await connectToDatabase();

  // Try product-specific page first
  const productSpecificSlug = `product-detail-${productId}`;
  let doc = await PageModel.findOne({ slug: productSpecificSlug }).lean<PageDocument | null>();

  // Fall back to default template
  if (!doc) {
    doc = await PageModel.findOne({ slug: "product-detail" }).lean<PageDocument | null>();
  }

  // No page configuration found, return empty blocks
  if (!doc) {
    return [];
  }

  const pageConfig = serializePage(doc);

  // Get the published version
  const publishedVersion = pageConfig.versions.find(
    (v) => v.version === pageConfig.currentPublishedVersion
  );

  if (publishedVersion) {
    return publishedVersion.blocks;
  }

  // If no published version, return empty (don't show drafts on live site)
  return [];
};
