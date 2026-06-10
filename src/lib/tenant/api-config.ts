import type { NextRequest } from 'next/server';
import { isSingleTenant } from './config';
import { resolveTenant } from './service';

// Default API target/credentials from .env (single-tenant mode, or fallback
// when a hostname can't be resolved to a tenant).
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '';
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET;

/** Suite API base URL + credentials used by storefront proxy routes. */
export interface TenantApiConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
}

/**
 * Resolve the suite API base URL and API-key credentials for the current
 * request — from the tenant doc in multi-tenant mode, or from .env otherwise.
 * Shared by the proxy routes (home-settings, languages, …) so the resolution
 * lives in one place.
 */
export async function resolveTenantApiConfig(
  req: NextRequest,
): Promise<TenantApiConfig> {
  if (isSingleTenant) {
    return {
      pimApiUrl: DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
    };
  }

  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);

  return {
    pimApiUrl: tenant?.api.pimApiUrl || DEFAULT_PIM_API_URL,
    apiKeyId: tenant?.api.apiKeyId || DEFAULT_API_KEY_ID,
    apiSecret: tenant?.api.apiSecret || DEFAULT_API_SECRET,
  };
}
