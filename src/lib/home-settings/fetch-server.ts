import { cache } from 'react';
import { headers } from 'next/headers';
import type { HomeSettings } from '@/lib/home-settings/types';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';

// =============================================================================
// SINGLE-TENANT CONFIG (from .env)
// =============================================================================

const rawPimApiUrl =
  process.env.PIM_API_PRIVATE_URL ||
  process.env.NEXT_PUBLIC_PIM_API_URL ||
  'http://localhost:3001';

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

// =============================================================================
// HOME SETTINGS FETCH
// =============================================================================

interface FetchConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  tenantId?: string;
}

async function fetchHomeSettingsWithConfig(
  config: FetchConfig,
): Promise<HomeSettings | null> {
  const { pimApiUrl, apiKeyId, apiSecret, tenantId } = config;

  try {
    const baseUrl = resolveBaseUrl(pimApiUrl);
    const url = new URL('/api/b2b/home-settings', `${baseUrl}/`).toString();

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(apiKeyId && { 'X-API-Key': apiKeyId }),
        ...(apiSecret && { 'X-API-Secret': apiSecret }),
      },
      next: {
        revalidate: 300,
        tags: tenantId ? [`home-settings-${tenantId}`] : ['home-settings'],
      },
    }).catch(() => null);

    if (!response || !response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return null;
    }

    const data = (await response.json()) as HomeSettings;
    return data;
  } catch {
    return null;
  }
}

// Single-tenant cached fetch
const cachedSingleTenantFetch = cache(() =>
  fetchHomeSettingsWithConfig({
    pimApiUrl: DEFAULT_PIM_API_BASE,
    apiKeyId: DEFAULT_API_KEY_ID,
    apiSecret: DEFAULT_API_SECRET,
  }),
);

// Multi-tenant fetch (caches per hostname within same request)
const cachedMultiTenantFetch = cache(async (hostname: string) => {
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    return null;
  }

  return fetchHomeSettingsWithConfig({
    pimApiUrl: tenant.api.pimApiUrl,
    apiKeyId: tenant.api.apiKeyId,
    apiSecret: tenant.api.apiSecret,
    tenantId: tenant.id,
  });
});

/**
 * Get home settings for the current request
 *
 * - Single-tenant mode: Uses .env configuration
 * - Multi-tenant mode: Resolves tenant from request hostname and uses tenant-specific config
 * - Returns DEFAULT_HOME_SETTINGS if no settings are configured
 */
export async function getServerHomeSettings(): Promise<HomeSettings> {
  try {
    // Single-tenant mode: use .env config
    if (isSingleTenant) {
      const result = await cachedSingleTenantFetch();
      return result || DEFAULT_HOME_SETTINGS;
    }

    // Multi-tenant mode: resolve tenant from hostname
    const headersList = await headers();
    const hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';

    const result = await cachedMultiTenantFetch(hostname);
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
