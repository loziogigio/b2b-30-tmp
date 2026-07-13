import { cache } from 'react';
import { headers } from 'next/headers';
import type { HomeSettings } from '@/lib/home-settings/types';
import {
  buildTenantApiHeaders,
  withResolvedTenant,
  isSingleTenant,
} from '@/lib/tenant';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';
import {
  mapPortalToHomeSettings,
  type PortalPayload,
} from '@/lib/home-settings/portal-mapper';
import { cacheTag, SINGLE_TENANT_ID } from '@/lib/cache/tags';

// =============================================================================
// SINGLE-TENANT CONFIG (from .env)
// =============================================================================

const rawPimApiUrl =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';

function resolveBaseUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '');
  } catch {
    const prefixed = raw.startsWith('http') ? raw : `http://${raw}`;
    try {
      const parsed = new URL(prefixed);
      return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '');
    } catch {
      return prefixed.replace(/\/$/, '');
    }
  }
}

const DEFAULT_PIM_API_BASE = resolveBaseUrl(rawPimApiUrl);
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

// Local dev override — when set, point home-settings (header/footer config) at
// this URL instead of the tenant's `pimApiUrl`, mirroring `resolveTenantApiConfig`
// and the PIM proxy so the whole storefront can hit a local commerce-suite.
const PIM_API_URL_OVERRIDE = process.env.PIM_API_URL_OVERRIDE;

// =============================================================================
// HOME SETTINGS FETCH
// =============================================================================

interface FetchConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  tenantId?: string;
  lang?: string;
}

async function fetchHomeSettingsWithConfig(
  config: FetchConfig,
): Promise<HomeSettings | null> {
  const { pimApiUrl, apiKeyId, apiSecret, tenantId, lang } = config;

  try {
    const baseUrl = resolveBaseUrl(pimApiUrl);
    let url = new URL(
      '/api/b2b/b2b/public/home?portal=default',
      `${baseUrl}/`,
    ).toString();

    if (lang) {
      url += `&lang=${encodeURIComponent(lang)}`;
    }

    const response = await fetch(url, {
      headers: buildTenantApiHeaders(
        { apiKeyId, apiSecret },
        { includeLegacyApiKeyAlias: true },
      ),
      next: {
        revalidate: 300,
        tags: [cacheTag('home-settings', tenantId || SINGLE_TENANT_ID)],
      },
    }).catch(() => null);

    if (!response || !response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return null;
    }

    const data = (await response.json()) as { portal?: PortalPayload };
    return mapPortalToHomeSettings(data?.portal);
  } catch {
    return null;
  }
}

// Single-tenant cached fetch
// `lang` is part of the cache key (React `cache` memoizes on arguments), so
// each language is cached separately. Falls back to 'default' when absent.
const cachedSingleTenantFetch = cache((lang: string = 'default') =>
  fetchHomeSettingsWithConfig({
    pimApiUrl: PIM_API_URL_OVERRIDE || DEFAULT_PIM_API_BASE,
    apiKeyId: DEFAULT_API_KEY_ID,
    apiSecret: DEFAULT_API_SECRET,
    lang: lang === 'default' ? undefined : lang,
  }),
);

// Multi-tenant fetch (caches per hostname + language within same request).
// Both `hostname` and `lang` form the cache key (React `cache` memoizes on
// arguments), so each language is cached separately. Falls back to 'default'.
const cachedMultiTenantFetch = cache(
  async (hostname: string, lang: string = 'default') => {
    return withResolvedTenant(hostname, (tenant) => {
      // Keep the private API credentials inside the operation. Only fetched,
      // browser-safe home settings cross the React async boundary.
      const pimApiUrl = PIM_API_URL_OVERRIDE || tenant?.api.pimApiUrl;
      if (!pimApiUrl) return null;

      return fetchHomeSettingsWithConfig({
        pimApiUrl,
        apiKeyId: tenant?.api.apiKeyId || DEFAULT_API_KEY_ID,
        apiSecret: tenant?.api.apiSecret || DEFAULT_API_SECRET,
        tenantId:
          tenant?.id || process.env.NEXT_PUBLIC_TENANT_ID || SINGLE_TENANT_ID,
        lang: lang === 'default' ? undefined : lang,
      });
    });
  },
);

/**
 * Get home settings for the current request
 *
 * - Single-tenant mode: Uses .env configuration
 * - Multi-tenant mode: Resolves tenant from request hostname and uses tenant-specific config
 * - Returns DEFAULT_HOME_SETTINGS if no settings are configured
 */
export async function getServerHomeSettings(
  lang?: string,
): Promise<HomeSettings> {
  try {
    // Single-tenant mode: use .env config
    if (isSingleTenant) {
      const result = await cachedSingleTenantFetch(lang);
      return result || DEFAULT_HOME_SETTINGS;
    }

    // Multi-tenant mode: resolve tenant from hostname
    const headersList = await headers();
    const hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';

    const result = await cachedMultiTenantFetch(hostname, lang);
    return result || DEFAULT_HOME_SETTINGS;
  } catch {
    return DEFAULT_HOME_SETTINGS;
  }
}

/**
 * Get home settings for a specific tenant (useful for API routes)
 */
export async function getHomeSettingsForTenant(
  pimApiUrl: string,
  apiKeyId?: string,
  apiSecret?: string,
  tenantId?: string,
): Promise<HomeSettings | null> {
  return fetchHomeSettingsWithConfig({
    pimApiUrl,
    apiKeyId,
    apiSecret,
    tenantId,
  });
}
