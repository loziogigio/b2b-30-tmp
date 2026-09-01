import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import {
  buildTenantApiHeaders,
  withResolvedTenant,
  isSingleTenant,
} from '@/lib/tenant';
import { resolveSupportedLang } from '@/app/i18n/settings';
import { cacheTag, SINGLE_TENANT_ID } from '@/lib/cache/tags';
import { AUTH_COOKIES } from '@/lib/auth/cookies';
import { warnIfRedirectDroppedAuth } from '@/lib/tenant/auth-redirect-warning';

/**
 * Server-side PIM API fetch utilities.
 * Calls PIM API directly (bypasses Next.js proxy) with proper credentials.
 * Supports both single-tenant and multi-tenant modes.
 */

// Single-tenant config from .env
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

// Local dev override — when set, ignores the tenant's `pimApiUrl` from the DB
// and points all server-side PIM calls at this URL. Mirrors the same override
// in the b2b PIM proxy so local dev can hit a local commerce-suite.
const PIM_API_URL_OVERRIDE = process.env.PIM_API_URL_OVERRIDE;

interface ApiConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  tenantId: string;
}

/**
 * Run a PIM operation without returning the credential-bearing config across
 * an async React Server Component boundary. Development Flight payloads may
 * retain resolved await values, so only the operation's public result leaves
 * this function.
 */
async function withApiConfig<T>(
  fallback: T,
  operation: (config: ApiConfig) => Promise<T>,
): Promise<T> {
  if (isSingleTenant) {
    return operation({
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
      tenantId: SINGLE_TENANT_ID,
    });
  }

  const headersList = await headers();
  const hostname =
    headersList.get('x-tenant-hostname') ||
    headersList.get('host') ||
    'localhost';

  return withResolvedTenant(hostname, (tenant) => {
    if (!tenant) return fallback;

    return operation({
      pimApiUrl: PIM_API_URL_OVERRIDE || tenant.api.pimApiUrl,
      apiKeyId: tenant.api.apiKeyId,
      apiSecret: tenant.api.apiSecret,
      tenantId: tenant.id,
    });
  });
}

function buildHeaders(
  config: ApiConfig,
  authorization?: string,
): Record<string, string> {
  return buildTenantApiHeaders(config, {
    includeLegacyApiKeyAlias: true,
    authorization,
  });
}

async function getCurrentSsoAuthorization(
  privateContentRequested: boolean,
): Promise<string | undefined> {
  if (!privateContentRequested) return undefined;

  const token = (await cookies()).get(AUTH_COOKIES.ACCESS_TOKEN)?.value?.trim();

  if (!token || token === 'null' || token === 'undefined') return undefined;

  return `Bearer ${token}`;
}

// ===============================
// Product Search
// ===============================

export interface ServerSearchParams {
  lang?: string;
  text?: string;
  start?: number;
  rows?: number;
  filters?: Record<string, any>;
  group_variants?: boolean;
  facet_fields?: string[];
  include_dynamic_blocks?: boolean;
  /** Request private product content for the current visitor. This is only a
   *  request hint: CS receives and validates the visitor's SSO bearer token. */
  authenticated?: boolean;
}

export interface ServerSearchFacetValue {
  value: string;
  label?: string;
  count: number;
}

export interface ServerSearchResult {
  results: any[];
  total: number;
  numFound?: number;
  /** Facet results keyed by field name (only populated when `facet_fields` is
   *  passed). Each entry is the list of {value, label, count} buckets. */
  facets?: Record<string, ServerSearchFacetValue[]>;
}

export const serverFetchPimProducts = cache(
  async (params: ServerSearchParams): Promise<ServerSearchResult> => {
    return withApiConfig<ServerSearchResult>(
      { results: [], total: 0 },
      async (config) => {
        const url = `${config.pimApiUrl}/api/search/search`;
        const authorization = await getCurrentSsoAuthorization(
          params.authenticated === true,
        );

        const body: Record<string, any> = {
          lang: resolveSupportedLang(params.lang),
          text: params.text || '',
          start: params.start || 0,
          rows: params.rows || 12,
        };

        if (params.filters && Object.keys(params.filters).length > 0) {
          body.filters = params.filters;
        }
        if (params.group_variants) {
          body.group_variants = true;
        }
        if (params.facet_fields) {
          body.facet_fields = params.facet_fields;
        }
        // Always request per-product rich content blocks (the BE only attaches them
        // where they exist), so any storefront fetch path gets them without wiring.
        body.include_dynamic_blocks = true;

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: buildHeaders(config, authorization),
            body: JSON.stringify(body),
            ...(authorization
              ? { cache: 'no-store' as const }
              : {
                  next: {
                    revalidate: 300,
                    tags: [cacheTag('products', config.tenantId)],
                  },
                }),
          });

          warnIfRedirectDroppedAuth(response, url, Boolean(authorization));

          if (!response.ok) return { results: [], total: 0 };

          const data = await response.json();
          if (!data.success) return { results: [], total: 0 };

          // PIM returns facets under `facet_results` keyed by field name. Each
          // bucket is `{ value, count, label?, id? }`. We normalize to
          // `{ value, label, count }` so the renderer is agnostic.
          const rawFacets: Record<string, any[]> =
            data.data.facet_results || data.facet_results || {};
          const facets: Record<string, ServerSearchFacetValue[]> = {};
          for (const [field, buckets] of Object.entries(rawFacets)) {
            if (!Array.isArray(buckets)) continue;
            facets[field] = buckets
              .map((b: any) => ({
                value: String(b.value ?? b.id ?? b.code ?? ''),
                label: b.label || b.name || b.title || undefined,
                count: Number(b.count ?? b.numFound ?? 0),
              }))
              .filter((b) => b.value);
          }

          return {
            results: data.data.results || [],
            total: data.data.numFound ?? data.data.total ?? 0,
            numFound: data.data.numFound,
            ...(Object.keys(facets).length ? { facets } : {}),
          };
        } catch {
          return { results: [], total: 0 };
        }
      },
    );
  },
);

// ===============================
// Menu
// ===============================

export const serverFetchPimMenu = cache(
  async (location: string = 'header', lang?: string): Promise<any[]> => {
    return withApiConfig<any[]>([], async (config) => {
      const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : '';
      const url = `${config.pimApiUrl}/api/public/menu?location=${location}${langParam}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: buildHeaders(config),
          next: { revalidate: 300, tags: [cacheTag('menu', config.tenantId)] },
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.success) return [];

        return data.menuItems || [];
      } catch {
        return [];
      }
    });
  },
);

// ===============================
// Categories (PIM category tree)
// ===============================

export const serverFetchPimCategories = cache(
  async (channel?: string): Promise<any[]> => {
    return withApiConfig<any[]>([], async (config) => {
      const qs = channel ? `?channel=${encodeURIComponent(channel)}` : '';
      const url = `${config.pimApiUrl}/api/public/categories${qs}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: buildHeaders(config),
          next: {
            revalidate: 300,
            tags: [cacheTag('categories', config.tenantId)],
          },
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.success) return [];

        return data.categories || [];
      } catch {
        return [];
      }
    });
  },
);

// ===============================
// Collections
// ===============================

export const serverFetchCollections = cache(async (): Promise<any[]> => {
  return withApiConfig<any[]>([], async (config) => {
    const url = `${config.pimApiUrl}/api/public/collections`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(config),
        next: {
          revalidate: 300,
          tags: [cacheTag('collections', config.tenantId)],
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.collections || [];
    } catch {
      return [];
    }
  });
});

export const serverFetchCollectionBySlug = cache(
  async (slug: string): Promise<any | null> => {
    return withApiConfig<any | null>(null, async (config) => {
      const url = `${config.pimApiUrl}/api/public/collections/${slug}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: buildHeaders(config),
          next: {
            revalidate: 300,
            tags: [cacheTag('collections', config.tenantId)],
          },
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.collection || null;
      } catch {
        return null;
      }
    });
  },
);

// ===============================
// Product SKU list for sitemap (paginated, long cache)
// ===============================

export async function fetchProductSkusForSitemap(
  start: number = 0,
  rows: number = 100,
  lang: string = 'it',
): Promise<{ skus: string[]; total: number }> {
  return withApiConfig<{ skus: string[]; total: number }>(
    { skus: [], total: 0 },
    async (config) => {
      const url = `${config.pimApiUrl}/api/search/search`;
      const safeRows = Math.min(100, Math.max(1, Math.trunc(rows) || 100));

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: buildHeaders(config),
          body: JSON.stringify({
            lang,
            text: '',
            start,
            rows: safeRows,
            group_variants: true,
          }),
          next: {
            revalidate: 3600, // 1 hour cache for sitemap
            tags: [cacheTag('sitemap', config.tenantId)],
          },
        });

        if (!response.ok) return { skus: [], total: 0 };

        const data = await response.json();
        if (!data.success) return { skus: [], total: 0 };

        const results = data.data.results || [];
        const skus = results.map((p: any) => p.sku).filter(Boolean) as string[];

        return {
          skus,
          total: data.data.numFound ?? data.data.total ?? 0,
        };
      } catch {
        return { skus: [], total: 0 };
      }
    },
  );
}
