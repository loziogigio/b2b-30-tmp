import type { PageVersionTags } from '@/lib/types/blocks';
import { normalizeAttributes, normalizeValue } from '@/lib/page-context';

export type VersionStatus = 'draft' | 'published';

export interface TaggedVersionLike {
  version: number;
  status: VersionStatus;
  priority?: number;
  isDefault?: boolean;
  activeFrom?: Date | string | null;
  activeTo?: Date | string | null;
  tag?: string | null;
  tags?: PageVersionTags | null;
}

export interface VersionResolutionOptions<TVersion extends TaggedVersionLike> {
  versions?: TVersion[];
  tags?: PageVersionTags | null;
  fallbackVersionNumber?: number | null;
  allowedStatuses?: VersionStatus[];
  respectActiveWindow?: boolean;
  now?: Date;
}

export interface VersionResolutionResult<TVersion extends TaggedVersionLike> {
  version: TVersion;
  matchedBy: string;
}

const weightings = {
  baseMatch: 1000,
  campaign: 400,
  segment: 200,
  addressState: 300, // High priority for address-based targeting
  attributes: 50,
  campaignSegmentBonus: 100,
} as const;

const toDateSafe = (value?: Date | string | null) => {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const isVersionActive = (version: TaggedVersionLike, now: Date) => {
  const start = toDateSafe(version.activeFrom);
  const end = toDateSafe(version.activeTo);
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
};

const getVersionTags = (
  version: TaggedVersionLike,
): PageVersionTags | undefined => {
  const campaign = normalizeValue(version.tags?.campaign ?? version.tag);
  const segment = normalizeValue(version.tags?.segment);

  // Extract string-only attributes for normalizeAttributes (it doesn't handle arrays)
  const rawAttrs = version.tags?.attributes;
  const stringOnlyAttrs: Record<string, string | undefined> = {};
  if (rawAttrs) {
    Object.entries(rawAttrs).forEach(([key, value]) => {
      if (typeof value === 'string') {
        stringOnlyAttrs[key] = value;
      }
    });
  }
  const baseAttributes = normalizeAttributes(stringOnlyAttrs);

  // Preserve addressStates array separately (normalizeAttributes only handles strings)
  const addressStates = rawAttrs?.addressStates;
  const hasAddressStates =
    Array.isArray(addressStates) && addressStates.length > 0;

  // Combine base attributes with addressStates
  const attributes =
    baseAttributes || hasAddressStates
      ? { ...baseAttributes, ...(hasAddressStates ? { addressStates } : {}) }
      : undefined;

  if (!campaign && !segment && !attributes) {
    return undefined;
  }

  const tags: PageVersionTags = {};
  if (campaign) tags.campaign = campaign;
  if (segment) tags.segment = segment;
  if (attributes) tags.attributes = attributes;
  return tags;
};

const evaluateMatch = (
  version: TaggedVersionLike,
  context?: PageVersionTags | null,
) => {
  if (!context) {
    return {
      matched: false,
      score: version.priority ?? 0,
      matchedBy: null as string | null,
    };
  }

  const versionTags = getVersionTags(version);
  const matchSummary: string[] = [];
  let score = version.priority ?? 0;
  let matched = false;

  const contextCampaign = normalizeValue(context.campaign);
  const versionCampaign = normalizeValue(versionTags?.campaign);
  if (
    contextCampaign &&
    versionCampaign &&
    contextCampaign.toLowerCase() === versionCampaign.toLowerCase()
  ) {
    score += weightings.campaign;
    matchSummary.push('campaign');
    matched = true;
  }

  const contextSegment = normalizeValue(context.segment);
  const versionSegment = normalizeValue(versionTags?.segment);
  if (
    contextSegment &&
    versionSegment &&
    contextSegment.toLowerCase() === versionSegment.toLowerCase()
  ) {
    score += weightings.segment;
    matchSummary.push('segment');
    matched = true;
  }

  // Check addressState: user's state should be in version's addressStates array
  const contextAddressState = normalizeValue(context.addressState);
  const versionAddressStates = versionTags?.attributes?.addressStates;
  if (
    contextAddressState &&
    Array.isArray(versionAddressStates) &&
    versionAddressStates.length > 0
  ) {
    const normalizedUserState = contextAddressState.toUpperCase();
    const matchesState = versionAddressStates.some(
      (state) =>
        typeof state === 'string' &&
        state.toUpperCase() === normalizedUserState,
    );
    if (matchesState) {
      score += weightings.addressState;
      matchSummary.push('addressState');
      matched = true;
    }
  }

  if (context.attributes && versionTags?.attributes) {
    const attributeMatches: string[] = [];
    Object.entries(context.attributes).forEach(([key, value]) => {
      // Skip addressStates - handled separately above
      if (key === 'addressStates') return;

      const normalizedCtx = normalizeValue(value as string | undefined);
      const versionAttrValue = versionTags.attributes?.[key];
      const normalizedVersionAttr = normalizeValue(
        typeof versionAttrValue === 'string' ? versionAttrValue : undefined,
      );
      if (
        normalizedCtx &&
        normalizedVersionAttr &&
        normalizedCtx.toLowerCase() === normalizedVersionAttr.toLowerCase()
      ) {
        score += weightings.attributes;
        attributeMatches.push(key);
        matched = true;
      }
    });
    if (attributeMatches.length > 0) {
      matchSummary.push('attributes');
    }
  }

  if (matchSummary.includes('campaign') && matchSummary.includes('segment')) {
    score += weightings.campaignSegmentBonus;
  }

  if (matched) {
    score += weightings.baseMatch;
  }

  return {
    matched,
    score,
    matchedBy: matched ? matchSummary.join('+') || 'context' : null,
  };
};

const sortByPriority = <TVersion extends TaggedVersionLike>(
  versions: TVersion[],
) =>
  [...versions].sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) ||
      (b.version ?? 0) - (a.version ?? 0),
  );

export const normalizeTagsInput = (
  tags?: PageVersionTags | null,
): PageVersionTags | undefined => {
  if (!tags) return undefined;
  const normalized: PageVersionTags = {};
  const campaign = normalizeValue(tags.campaign);
  const segment = normalizeValue(tags.segment);
  const addressState = normalizeValue(tags.addressState);
  const attributes = normalizeAttributes(tags.attributes);

  if (campaign) normalized.campaign = campaign;
  if (segment) normalized.segment = segment;
  if (addressState) normalized.addressState = addressState;
  if (attributes) normalized.attributes = attributes;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export function resolveVersion<TVersion extends TaggedVersionLike>(
  options: VersionResolutionOptions<TVersion>,
): VersionResolutionResult<TVersion> | null {
  const {
    versions = [],
    tags,
    fallbackVersionNumber,
    allowedStatuses = ['published'],
    respectActiveWindow = true,
  } = options;

  if (!versions.length) {
    return null;
  }

  const eligible = versions.filter((version) =>
    allowedStatuses.includes(version.status),
  );
  if (eligible.length === 0) {
    return null;
  }

  const now = options.now ?? new Date();
  const activeCandidates = respectActiveWindow
    ? eligible.filter((v) => isVersionActive(v, now))
    : eligible;
  const candidatePool =
    activeCandidates.length > 0 ? activeCandidates : eligible;

  const pickFromPool = () => {
    if (tags) {
      const matches = candidatePool
        .map((version) => ({
          version,
          ...evaluateMatch(version, tags),
        }))
        .filter((result) => result.matched)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.version.priority ?? 0) - (a.version.priority ?? 0) ||
            (b.version.version ?? 0) - (a.version.version ?? 0),
        );

      if (matches.length > 0) {
        const top = matches[0];
        return { version: top.version, matchedBy: top.matchedBy ?? 'context' };
      }
    }

    if (fallbackVersionNumber != null) {
      const fallback = candidatePool.find(
        (v) => v.version === fallbackVersionNumber,
      );
      if (fallback) {
        return { version: fallback, matchedBy: 'fallback-version' };
      }
    }

    const defaultVersion = candidatePool.find((v) => v.isDefault);
    if (defaultVersion) {
      return { version: defaultVersion, matchedBy: 'default' };
    }

    const prioritized = sortByPriority(candidatePool);
    if (prioritized.length > 0) {
      return {
        version: prioritized[0],
        matchedBy: tags ? 'priority' : 'latest',
      };
    }

    return null;
  };

  const result = pickFromPool();
  if (result) {
    return result;
  }

  if (respectActiveWindow && candidatePool !== eligible) {
    return resolveVersion({
      versions: eligible,
      tags,
      fallbackVersionNumber,
      allowedStatuses,
      respectActiveWindow: false,
      now,
    });
  }

  return null;
}
