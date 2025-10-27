import { connectToDatabase } from "./connection";
import {
  HomeTemplateModel,
  type HomeTemplateDocument,
  type HomeTemplateVersion
} from "./models/home-template";
import type { PageVersionTags } from "@/lib/types/blocks";
import { normalizeTagsInput, resolveVersion } from "@/lib/page-version-resolver";

const HOME_TEMPLATE_ID = "home-page";

const buildReturnPayload = (
  version: HomeTemplateVersion | HomeTemplateDocument,
  matchedBy: string
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
  matchedBy
});

/**
 * Get published home template for customer_web
 * New structure: Queries for all documents with same templateId, uses version resolver
 */
export async function getPublishedHomeTemplate(options?: { tags?: PageVersionTags | null }): Promise<any | null> {
  await connectToDatabase();
  const normalizedTags = normalizeTagsInput(options?.tags);

  // Find all versions for this template
  const versions = await HomeTemplateModel.find({
    templateId: HOME_TEMPLATE_ID,
    isActive: true
  }).lean<HomeTemplateDocument[]>();

  console.log("[getPublishedHomeTemplate] Versions found:", versions.length);

  if (!versions || versions.length === 0) {
    console.log("[getPublishedHomeTemplate] No versions available");
    return null;
  }

  // Find the current published version as fallback
  const currentPublished = versions.find((v) => v.isCurrentPublished);
  const fallbackVersionNumber = currentPublished?.version;

  console.log("[getPublishedHomeTemplate] currentPublishedVersion:", fallbackVersionNumber);

  const resolution = resolveVersion({
    versions: versions as any,
    allowedStatuses: ["published"],
    tags: normalizedTags,
    fallbackVersionNumber,
    respectActiveWindow: true
  });

  if (!resolution) {
    console.log("[getPublishedHomeTemplate] Unable to resolve published version");
    return null;
  }

  console.log(
    "[getPublishedHomeTemplate] Selected version:",
    resolution.version.version,
    "matchedBy:",
    resolution.matchedBy ?? "n/a",
    "tags:",
    resolution.version.tags ?? resolution.version.tag ?? "none"
  );

  return buildReturnPayload(resolution.version, resolution.matchedBy);
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
  await connectToDatabase();
  const normalizedTags = normalizeTagsInput(options?.tags);

  // Find all versions for this template
  const versions = await HomeTemplateModel.find({
    templateId: HOME_TEMPLATE_ID,
    isActive: true
  }).lean<HomeTemplateDocument[]>();

  console.log("[getLatestHomeTemplateVersion] Versions found:", versions.length);

  if (!versions || versions.length === 0) {
    console.log("[getLatestHomeTemplateVersion] No versions available");
    return null;
  }

  // Find the current version as fallback
  const currentVersion = versions.find((v) => v.isCurrent);
  const fallbackVersionNumber = currentVersion?.version;

  console.log("[getLatestHomeTemplateVersion] currentVersion:", fallbackVersionNumber);

  const allowedStatuses = options?.allowDraft === false ? ["published"] : ["draft", "published"];

  const resolution = resolveVersion({
    versions: versions as any,
    allowedStatuses,
    tags: normalizedTags,
    fallbackVersionNumber,
    respectActiveWindow: false
  });

  if (!resolution) {
    console.log("[getLatestHomeTemplateVersion] Unable to resolve version");
    return null;
  }

  console.log(
    "[getLatestHomeTemplateVersion] Returning version:",
    resolution.version.version,
    "status:",
    resolution.version.status,
    "matchedBy:",
    resolution.matchedBy ?? "n/a"
  );

  return buildReturnPayload(resolution.version, resolution.matchedBy);
}
