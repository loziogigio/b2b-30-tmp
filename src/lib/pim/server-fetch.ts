import { cache } from 'react';
import { headers } from 'next/headers';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { resolveSupportedLang } from '@/app/i18n/settings';
import { cacheTag, SINGLE_TENANT_ID } from '@/lib/cache/tags';

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

interface ApiConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  tenantId: string;
}

/** Resolve PIM API config for the current request */
async function getApiConfig(): Promise<ApiConfig | null> {
  if (isSingleTenant) {
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
      tenantId: SINGLE_TENANT_ID,
    };
  }

  const headersList = await headers();
  const hostname =
    headersList.get('x-tenant-hostname') ||
    headersList.get('host') ||
    'localhost';

  const tenant = await resolveTenant(hostname);
  if (!tenant) return null;

  return {
    pimApiUrl: tenant.api.pimApiUrl,
    apiKeyId: tenant.api.apiKeyId,
    apiSecret: tenant.api.apiSecret,
    tenantId: tenant.id,
  };
}

function buildHeaders(config: ApiConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(config.apiKeyId && { 'X-API-Key': config.apiKeyId }),
    ...(config.apiSecret && { 'X-API-Secret': config.apiSecret }),
  };
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
}

export interface ServerSearchResult {
  results: any[];
  total: number;
  numFound?: number;
}

export const serverFetchPimProducts = cache(
  async (params: ServerSearchParams): Promise<ServerSearchResult> => {
    const config = await getApiConfig();
    if (!config) return { results: [], total: 0 };

    const url = `${config.pimApiUrl}/api/search/search`;

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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(body),
        next: {
          revalidate: 300,
          tags: [cacheTag('products', config.tenantId)],
        },
      });

      if (!response.ok) return { results: [], total: 0 };

      const data = await response.json();
      if (!data.success) return { results: [], total: 0 };

      return {
        results: data.data.results || [],
        total: data.data.numFound ?? data.data.total ?? 0,
        numFound: data.data.numFound,
      };
    } catch {
      return { results: [], total: 0 };
    }
  },
);

// ===============================
// Menu
// ===============================

export const serverFetchPimMenu = cache(
  async (location: string = 'header'): Promise<any[]> => {
    const config = await getApiConfig();
    if (!config) return [];

    const url = `${config.pimApiUrl}/api/public/menu?location=${location}`;

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
  },
);

// ===============================
// Collections
// ===============================

export const serverFetchCollections = cache(async (): Promise<any[]> => {
  const config = await getApiConfig();
  if (!config) return [];

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

export const serverFetchCollectionBySlug = cache(
  async (slug: string): Promise<any | null> => {
    const config = await getApiConfig();
    if (!config) return null;

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
  },
);

// ===============================
// Product SKU list for sitemap (paginated, long cache)
// ===============================

export async function fetchProductSkusForSitemap(
  start: number = 0,
  rows: number = 10000,
  lang: string = 'it',
): Promise<{ skus: string[]; total: number }> {
  const config = await getApiConfig();
  if (!config) return { skus: [], total: 0 };

  const url = `${config.pimApiUrl}/api/search/search`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify({
        lang,
        text: '',
        start,
        rows,
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
}
