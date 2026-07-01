import { headers } from 'next/headers';
import type { MetadataRoute } from 'next';
import { currentTenantId } from '@/lib/cache/tags';
import { categoryRootFor } from '@/lib/seo/category-root';
import { buildTenantApiHeaders } from '@/lib/tenant';

/**
 * vinc-commerce-suite (vcs) SEO client.
 *
 * Thin, domain-aware, cached consumers of the vcs public B2B SEO endpoints
 * (spec §5). Tenant is resolved by vcs from the forwarded request host (same
 * mechanism as the B2C `public/sitemap-data`), so each fetcher passes the host
 * through as `x-tenant-host`.
 *
 * Every fetcher has a SAFE FALLBACK so an vcs outage degrades to the current
 * vinc-b2b behaviour instead of throwing/500ing:
 *   - resolve-product  → null
 *   - seo-config       → DEFAULT_SEO_CONFIG (categorie root + current static robots)
 *   - sitemap-data     → null (caller falls back to local generation)
 */

// ---------------------------------------------------------------------------
// Contract types (spec §5)
// ---------------------------------------------------------------------------

export interface ResolvedProduct {
  sku: string;
  parentSku?: string;
  name?: string;
  slug?: string;
  categoryAncestors?: string[];
  found: true;
}

export interface SeoConfigRobots {
  noindex?: boolean;
  allow?: string[];
  disallow?: string[];
  sitemapUrl?: string;
}

export interface SeoConfig {
  /** Per-locale category root segment. `default` falls back to `categorie`. */
  categoryRoot: Record<string, string> & { default: string };
  robots: SeoConfigRobots;
}

export interface SitemapEntry {
  loc: string; // e.g. "/it/some-slug"
  type?: 'product' | 'category' | 'page' | 'static';
  changefreq?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
  lastmod?: string;
}

export interface SitemapData {
  baseUrl: string;
  langs: string[];
  entries: SitemapEntry[];
}

// ---------------------------------------------------------------------------
// Defaults / fallbacks
// ---------------------------------------------------------------------------

/** Current static robots rules (mirror of `src/app/robots.ts`). */
export const DEFAULT_ROBOTS: SeoConfigRobots = {
  noindex: false,
  allow: ['/'],
  disallow: [
    '/api/',
    '/account/',
    '/checkout/',
    '/complete-order/',
    '/*?preview=true',
  ],
};

export const DEFAULT_SEO_CONFIG: SeoConfig = {
  categoryRoot: { default: 'categorie' },
  robots: DEFAULT_ROBOTS,
};

const REVALIDATE_SECONDS = 300;

// Cache-tag strings below mirror `cacheTag(name, tenantId)` from
// `@/lib/cache/tags` (`{name}-{tenantId}`), so the existing PIM/sitemap
// revalidation pub-sub invalidates these vcs responses too.

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable without the network)
// ---------------------------------------------------------------------------

/** Resolve the per-locale category root, falling back to `categorie`. */
export function categoryRootForLang(config: SeoConfig, lang: string): string {
  return categoryRootFor(config.categoryRoot, lang);
}

/** Coerce an arbitrary payload into a valid `SeoConfig`, merging in defaults. */
export function normalizeSeoConfig(raw: unknown): SeoConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_SEO_CONFIG;
  const obj = raw as Partial<SeoConfig>;
  const rootInput: Record<string, string> =
    obj.categoryRoot && typeof obj.categoryRoot === 'object'
      ? obj.categoryRoot
      : {};
  const categoryRoot: SeoConfig['categoryRoot'] = {
    ...rootInput,
    default: rootInput.default || 'categorie',
  };
  const robots: SeoConfigRobots = {
    noindex: obj.robots?.noindex ?? DEFAULT_ROBOTS.noindex,
    allow: obj.robots?.allow ?? DEFAULT_ROBOTS.allow,
    disallow: obj.robots?.disallow ?? DEFAULT_ROBOTS.disallow,
    sitemapUrl: obj.robots?.sitemapUrl,
  };
  return { categoryRoot, robots };
}

/** Map vcs sitemap-data into Next's `MetadataRoute.Sitemap`. */
export function sitemapDataToRoutes(data: SitemapData): MetadataRoute.Sitemap {
  const base = (data.baseUrl || '').replace(/\/$/, '');
  const out: MetadataRoute.Sitemap = [];
  for (const entry of data.entries ?? []) {
    if (!entry?.loc) continue;
    const loc = entry.loc.startsWith('/') ? entry.loc : `/${entry.loc}`;
    out.push({
      url: `${base}${loc}`,
      lastModified: entry.lastmod ? new Date(entry.lastmod) : undefined,
      changeFrequency: entry.changefreq,
      priority: entry.priority,
    });
  }
  return out;
}

/** Map vcs robots config into Next's `MetadataRoute.Robots`. */
export function robotsConfigToRoute(
  robots: SeoConfigRobots,
  sitemapUrl?: string,
): MetadataRoute.Robots {
  if (robots?.noindex) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: sitemapUrl || robots.sitemapUrl || undefined,
    };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: robots?.allow ?? DEFAULT_ROBOTS.allow,
        disallow: robots?.disallow ?? DEFAULT_ROBOTS.disallow,
      },
    ],
    sitemap: sitemapUrl || robots?.sitemapUrl || undefined,
  };
}

// ---------------------------------------------------------------------------
// Domain / config resolution
// ---------------------------------------------------------------------------

function suiteBase(): string {
  const raw =
    process.env.VINC_SUITE_API_BASE ||
    process.env.PIM_API_PRIVATE_URL ||
    process.env.NEXT_PUBLIC_PIM_API_URL ||
    '';
  return raw.replace(/\/$/, '');
}

function suiteKeyId(): string {
  return process.env.VINC_SUITE_API_KEY_ID || process.env.API_KEY_ID || '';
}

function suiteSecret(): string {
  return process.env.VINC_SUITE_API_SECRET || process.env.API_SECRET || '';
}

/** The request host vcs uses to resolve the tenant. */
async function requestHost(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get('x-tenant-hostname') ||
      h.get('x-forwarded-host') ||
      h.get('host') ||
      'localhost'
    );
  } catch {
    return 'localhost';
  }
}

async function suiteHeaders(): Promise<Record<string, string>> {
  const host = await requestHost();
  const keyId = suiteKeyId();
  const secret = suiteSecret();
  return {
    ...buildTenantApiHeaders(
      { apiKeyId: keyId, apiSecret: secret },
      { includeLegacyApiKeyAlias: true },
    ),
    // vcs resolves the tenant from the forwarded host. Its host-resolver reads
    // `x-forwarded-host`/`host`, so forward the tenant host under that name;
    // keep `x-tenant-host` too for forward-compat.
    'x-forwarded-host': host,
    'x-tenant-host': host,
  };
}

// ---------------------------------------------------------------------------
// Fetchers (domain-aware, cached, safe-fallback)
// ---------------------------------------------------------------------------

/**
 * Resolve a flat product slug → SKU via vcs (spec §5.1).
 * Returns `null` when not found, not configured, or vcs is unreachable.
 */
export async function resolveProduct(
  slug: string,
  lang: string,
): Promise<ResolvedProduct | null> {
  const base = suiteBase();
  if (!base || !slug) return null;
  try {
    const url = new URL('/api/public/b2b/resolve-product', `${base}/`);
    url.searchParams.set('slug', slug);
    url.searchParams.set('lang', lang);
    const tenantId = await currentTenantId();
    const res = await fetch(url.toString(), {
      headers: await suiteHeaders(),
      next: { revalidate: REVALIDATE_SECONDS, tags: [`products-${tenantId}`] },
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const data = (await res.json()) as {
      found?: boolean;
      sku?: string;
      parentSku?: string;
      name?: string;
      slug?: string;
      categoryAncestors?: string[];
    };
    if (!data || data.found === false || !data.sku) return null;
    return {
      sku: data.sku,
      parentSku: data.parentSku,
      name: data.name,
      slug: data.slug,
      categoryAncestors: data.categoryAncestors,
      found: true,
    };
  } catch {
    return null;
  }
}

/**
 * Per-tenant SEO/routing config (spec §5.2).
 * Falls back to `DEFAULT_SEO_CONFIG` on any failure.
 */
export async function getSeoConfig(): Promise<SeoConfig> {
  const base = suiteBase();
  if (!base) return DEFAULT_SEO_CONFIG;
  try {
    const url = new URL('/api/public/b2b/seo-config', `${base}/`);
    const tenantId = await currentTenantId();
    const res = await fetch(url.toString(), {
      headers: await suiteHeaders(),
      next: {
        revalidate: REVALIDATE_SECONDS,
        tags: [`home-settings-${tenantId}`],
      },
    }).catch(() => null);
    if (!res || !res.ok) return DEFAULT_SEO_CONFIG;
    return normalizeSeoConfig(await res.json());
  } catch {
    return DEFAULT_SEO_CONFIG;
  }
}

/**
 * Per-tenant sitemap entries (spec §5.3).
 * Returns `null` on failure so the caller can fall back to local generation.
 */
export async function getSitemapData(): Promise<SitemapData | null> {
  const base = suiteBase();
  if (!base) return null;
  try {
    const url = new URL('/api/public/b2b/sitemap-data', `${base}/`);
    const tenantId = await currentTenantId();
    const res = await fetch(url.toString(), {
      headers: await suiteHeaders(),
      next: { revalidate: REVALIDATE_SECONDS, tags: [`sitemap-${tenantId}`] },
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const data = (await res.json()) as SitemapData;
    if (!data || !Array.isArray(data.entries)) return null;
    return data;
  } catch {
    return null;
  }
}
