import type { NextRequest } from 'next/server';
import { isSingleTenant } from './config';
import { resolveTenant } from './service';

// Default API target/credentials from .env (single-tenant mode, or fallback
// when a hostname can't be resolved to a tenant).
const DEFAULT_PIM_API_URL =
  process.env.PIM_API_PRIVATE_URL ||
  process.env.PIM_API_URL ||
  process.env.NEXT_PUBLIC_PIM_API_URL ||
  '';
// Accept both credential env conventions used across the app: the proxy family
// (API_KEY_ID/API_SECRET) and the data-models family (PIM_API_KEY_ID/…).
const DEFAULT_API_KEY_ID =
  process.env.API_KEY_ID ||
  process.env.PIM_API_KEY_ID ||
  process.env.NEXT_PUBLIC_API_KEY_ID;
const DEFAULT_API_SECRET =
  process.env.API_SECRET ||
  process.env.PIM_API_SECRET ||
  process.env.NEXT_PUBLIC_API_SECRET;

/** Suite API base URL + credentials used by storefront proxy routes. */
export interface TenantApiConfig {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  tenantId: string;
}

export interface TenantApiHeaderOptions {
  authorization?: string | null;
  contentType?: string | false;
  accept?: string | false;
  includeLegacyApiKeyAlias?: boolean;
}

type TenantApiCredentials = Pick<TenantApiConfig, 'apiKeyId' | 'apiSecret'>;

/**
 * Build the standard commerce-suite API-key headers.
 *
 * `x-api-key-id` / `x-api-secret` are the canonical names used by current
 * suite routes. `X-API-Key` is available as a compatibility alias for older
 * PIM endpoints that identify the tenant from that header.
 */
export function buildTenantApiHeaders(
  config: TenantApiCredentials,
  options: TenantApiHeaderOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (options.accept !== false) {
    headers.Accept = options.accept || 'application/json';
  }

  if (options.contentType !== false) {
    headers['Content-Type'] = options.contentType || 'application/json';
  }

  if (config.apiKeyId && config.apiSecret) {
    headers['x-auth-method'] = 'api-key';
  }

  if (config.apiKeyId) {
    headers['x-api-key-id'] = config.apiKeyId;
    if (options.includeLegacyApiKeyAlias) {
      headers['X-API-Key'] = config.apiKeyId;
    }
  }

  if (config.apiSecret) {
    headers['x-api-secret'] = config.apiSecret;
  }

  if (options.authorization) {
    headers.Authorization = options.authorization;
  }

  return headers;
}

/**
 * Resolve the suite API base URL and API-key credentials for the current
 * request — from the tenant doc in multi-tenant mode, or from .env otherwise.
 * This is the single common method every route should use to reach the PIM API
 * so resolution lives in one place (proxy, home-settings, languages, addresses, …).
 *
 * `PIM_API_URL_OVERRIDE` always wins so local dev can point every PIM call at a
 * locally-running suite (e.g. http://localhost:3001) instead of the Docker-only
 * tenant hostname (e.g. http://vinc-cs:3000) stored in the tenant doc.
 */
export async function resolveTenantApiConfig(
  req: NextRequest,
): Promise<TenantApiConfig> {
  const override = process.env.PIM_API_URL_OVERRIDE;
  const fallbackTenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';

  if (isSingleTenant) {
    return {
      pimApiUrl: override || DEFAULT_PIM_API_URL,
      apiKeyId: DEFAULT_API_KEY_ID,
      apiSecret: DEFAULT_API_SECRET,
      tenantId: fallbackTenantId,
    };
  }

  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);

  return {
    pimApiUrl: override || tenant?.api.pimApiUrl || DEFAULT_PIM_API_URL,
    apiKeyId: tenant?.api.apiKeyId || DEFAULT_API_KEY_ID,
    apiSecret: tenant?.api.apiSecret || DEFAULT_API_SECRET,
    tenantId: tenant?.id || fallbackTenantId,
  };
}
