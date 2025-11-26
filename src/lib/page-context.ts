import type { PageVersionTags } from "@/lib/types/blocks";
import { fallbackLng, languages } from "@/app/i18n/settings";

export type PageContextSource = "url" | "session" | "segment" | "default" | "language" | "cookie";

export interface PageContext extends PageVersionTags {
  source?: PageContextSource;
  landingPage?: string;
  landedAt?: string;
  utm?: Record<string, string | undefined>;
}

export const PAGE_CONTEXT_COOKIE = "hidros_campaign_context";
export const PAGE_CONTEXT_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours (seconds)

type AttributesInput =
  | Record<string, string | undefined | null>
  | Map<string, string | undefined | null>
  | undefined
  | null;

const ATTRIBUTE_KEYS = ["region", "language", "device"] as const;

export const normalizeValue = (value?: string | null) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeAttributes = (input: AttributesInput): Record<string, string> | undefined => {
  if (!input) return undefined;

  const entries =
    input instanceof Map ? Array.from(input.entries()) : Array.from(Object.entries(input));

  const normalized: Record<string, string> = {};
  for (const [key, raw] of entries) {
    if (!key) continue;
    const normalizedValue = normalizeValue(raw ?? undefined);
    if (normalizedValue) {
      normalized[key] = normalizedValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const contextHasData = (context?: PageContext | null) => {
  if (!context) return false;
  return Boolean(
    normalizeValue(context.campaign) ||
      normalizeValue(context.segment) ||
      normalizeAttributes(context.attributes)
  );
};

export const mergeContexts = (...contexts: Array<PageContext | null | undefined>): PageContext | null => {
  const merged: PageContext = {};

  contexts.forEach((ctx) => {
    if (!ctx) return;
    if (ctx.campaign) merged.campaign = ctx.campaign;
    if (ctx.segment) merged.segment = ctx.segment;
    if (ctx.attributes) {
      merged.attributes = { ...(merged.attributes ?? {}), ...ctx.attributes };
    }
    if (ctx.source) merged.source = ctx.source;
    if (ctx.landingPage) merged.landingPage = ctx.landingPage;
    if (ctx.landedAt) merged.landedAt = ctx.landedAt;
    if (ctx.utm) merged.utm = { ...(merged.utm ?? {}), ...ctx.utm };
  });

  return contextHasData(merged) ? merged : null;
};

export const contextToTags = (context?: PageContext | null): PageVersionTags | undefined => {
  if (!context) return undefined;

  const tags: PageVersionTags = {};
  const campaign = normalizeValue(context.campaign);
  const segment = normalizeValue(context.segment);
  const attributes = normalizeAttributes(context.attributes);

  if (campaign) tags.campaign = campaign;
  if (segment) tags.segment = segment;
  if (attributes) tags.attributes = attributes;

  return Object.keys(tags).length > 0 ? tags : undefined;
};

export const buildContextFromParams = (
  params: Record<string, string | undefined | null>,
  source: PageContextSource = "url"
): PageContext | null => {
  const campaign = normalizeValue(
    params.campaign ?? params.tag ?? params.homeTag ?? params.templateTag ?? undefined
  );
  const segment = normalizeValue(params.segment);
  const attributes = normalizeAttributes({
    region: params.region,
    language: params.language,
    device: params.device
  });

  if (!campaign && !segment && !attributes) {
    return null;
  }

  return {
    campaign,
    segment,
    attributes,
    source
  };
};

export const parseContextCookie = (value?: string | null): PageContext | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PageContext;
    const normalized: PageContext = {
      campaign: normalizeValue(parsed.campaign),
      segment: normalizeValue(parsed.segment),
      attributes: normalizeAttributes(parsed.attributes),
      source: parsed.source ?? "cookie",
      landingPage: parsed.landingPage,
      landedAt: parsed.landedAt,
      utm: parsed.utm
    };
    return contextHasData(normalized) ? normalized : null;
  } catch {
    return null;
  }
};

export const serializeTagsKey = (tags?: PageVersionTags): string => {
  if (!tags) return "default";
  const parts: string[] = [];

  if (tags.campaign) {
    parts.push(`c:${tags.campaign}`);
  }
  if (tags.segment) {
    parts.push(`s:${tags.segment}`);
  }
  if (tags.attributes) {
    const attrParts = Object.entries(tags.attributes)
      .filter(([, value]) => Boolean(value))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`);
    if (attrParts.length > 0) {
      parts.push(`a:${attrParts.join("|")}`);
    }
  }

  return parts.length > 0 ? parts.join("|") : "default";
};

export const ensureLanguageAttribute = (
  context: PageContext | null,
  language?: string
): PageContext | null => {
  const langValue = normalizeValue(language);
  if (!langValue) return context;
  const normalizedLang = languages.includes(langValue) ? langValue : fallbackLng;
  const languageAttributes = {
    ...(context?.attributes ?? {}),
    language: normalizedLang
  };
  return mergeContexts(context, {
    attributes: languageAttributes,
    source: context?.source ?? "language"
  });
};

export const extractAttributesFromUserAgent = (userAgent?: string | null): Record<string, string> => {
  if (!userAgent) return {};
  const lowered = userAgent.toLowerCase();
  const device =
    lowered.includes("mobile") || lowered.includes("iphone") || lowered.includes("android")
      ? "mobile"
      : "desktop";
  return { device };
};

export const pickAttributeKeys = (
  params: Record<string, string | undefined | null>
): Record<string, string | undefined> => {
  const picked: Record<string, string | undefined> = {};
  ATTRIBUTE_KEYS.forEach((key) => {
    if (params[key]) {
      picked[key] = params[key] ?? undefined;
    }
  });
  return picked;
};
