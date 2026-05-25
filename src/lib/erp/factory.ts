import type { NextRequest } from 'next/server';
import { MyMbErpClient, parseMyMbConnection } from 'vinc-erp';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { cachedJson } from '@/lib/cache/redis-cache';
import { RedisCacheAdapter } from './redis-cache-adapter';
import { fetchErpSettings, DEFAULT_ERP_SETTINGS } from './data-model-config';

/** Connection URL resolution: override env → tenant config → base env. */
export function resolveErpUrl(tenantUrl: string | undefined): string {
  const url = process.env.ERP_URL_OVERRIDE || tenantUrl || process.env.ERP_URL;
  if (!url) {
    throw new Error('No ERP URL configured (set ERP_URL or ERP_URL_OVERRIDE).');
  }
  return url;
}

async function getTenantBits(req: NextRequest) {
  if (isSingleTenant) {
    return {
      erpUrl: undefined as string | undefined,
      csBaseUrl: process.env.PIM_API_URL || '',
      apiKeyId: process.env.PIM_API_KEY_ID || '',
      apiSecret: process.env.PIM_API_SECRET || '',
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') || req.headers.get('host') || 'localhost';
  const tenant = await resolveTenant(hostname);
  return {
    erpUrl: tenant?.api.erpUrl,
    csBaseUrl: tenant?.api.pimApiUrl || process.env.PIM_API_URL || '',
    apiKeyId: tenant?.api.apiKeyId || '',
    apiSecret: tenant?.api.apiSecret || '',
  };
}

/**
 * Build a MyMbErpClient for the current request: connection from
 * resolveErpUrl, behavior from the cached erp_settings data-model, Redis cache
 * for the client's own read-through caching.
 */
export async function getMyMbErpClient(req: NextRequest): Promise<MyMbErpClient> {
  const bits = await getTenantBits(req);
  const { baseUrl, authHeader } = parseMyMbConnection(resolveErpUrl(bits.erpUrl));

  const settings = await cachedJson(
    `erp:settings:${bits.csBaseUrl}`,
    { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
    async () => {
      if (!bits.csBaseUrl || !bits.apiKeyId) return DEFAULT_ERP_SETTINGS;
      return fetchErpSettings({
        csBaseUrl: bits.csBaseUrl,
        apiKeyId: bits.apiKeyId,
        apiSecret: bits.apiSecret,
      });
    },
  );

  return new MyMbErpClient({ baseUrl, authHeader, settings, cache: new RedisCacheAdapter() });
}
