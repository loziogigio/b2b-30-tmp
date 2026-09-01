import type { NextRequest } from 'next/server';
import { MyMbErpClient, parseMyMbConnection } from 'vinc-erp';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { SINGLE_TENANT_ID } from '@/lib/cache/tags';
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

/**
 * Cache key for a tenant's `erp_settings`.
 *
 * MUST include the tenant. The key was once the Commerce Suite URL alone, but
 * six tenants share the cluster-internal `http://vinc-cs:3000`, so whichever of
 * them warmed the cache first served ITS settings to all the others — case
 * labels, packaging ids, the managed-substitutes/supplier flags and the
 * `erp_channel` promo filter leaked across tenants. Seen in production on
 * 2026-09-01: baseprotection-com's blanked labels rendered on bellieforti.com.
 *
 * The Suite URL stays in the key so the same tenant reached through a different
 * Suite (local override vs cluster) does not reuse the other's entry.
 */
export function erpSettingsCacheKey(
  tenantId: string,
  csBaseUrl: string,
): string {
  return `erp:settings:${tenantId || '_unresolved'}:${csBaseUrl}`;
}

async function getTenantBits(req: NextRequest) {
  if (isSingleTenant) {
    return {
      // No dedicated erp_url field: the MyMB connection lives in the B2B API
      // URL (credentials are stripped by parseMyMbConnection).
      erpUrl: (process.env.B2B_API_URL || undefined) as string | undefined,
      csBaseUrl: process.env.PIM_API_URL || '',
      apiKeyId: process.env.PIM_API_KEY_ID || '',
      apiSecret: process.env.PIM_API_SECRET || '',
      tenantId: SINGLE_TENANT_ID,
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);
  return {
    // Prefer an explicit erp_url if ever configured; otherwise use the B2B API
    // URL, which holds the MyMB connection string (with embedded credentials).
    erpUrl: tenant?.api.erpUrl || tenant?.api.b2bApiUrl,
    // PIM_API_URL_OVERRIDE first, mirroring resolveErpUrl above and
    // resolveTenantApiConfig: the tenant record holds a cluster-internal host
    // (vinc-cs) that does not resolve from a dev machine.
    csBaseUrl:
      process.env.PIM_API_URL_OVERRIDE ||
      tenant?.api.pimApiUrl ||
      process.env.PIM_API_URL ||
      '',
    apiKeyId: tenant?.api.apiKeyId || '',
    apiSecret: tenant?.api.apiSecret || '',
    // Falls back to the hostname so an unresolved tenant still gets its own
    // cache entry instead of sharing one bucket with every other unresolved host.
    tenantId: tenant?.id || hostname,
  };
}

/**
 * Build a MyMbErpClient for the current request: connection from
 * resolveErpUrl, behavior from the cached erp_settings data-model, Redis cache
 * for the client's own read-through caching.
 */
export async function getMyMbErpClient(
  req: NextRequest,
): Promise<MyMbErpClient> {
  const bits = await getTenantBits(req);
  const resolvedUrl = resolveErpUrl(bits.erpUrl);
  const { baseUrl, authHeader } = parseMyMbConnection(resolvedUrl);

  // TEMP DIAGNOSTIC — which ERP host is actually used (creds stripped) + source.
  const erpUrlSource = process.env.ERP_URL_OVERRIDE
    ? 'ERP_URL_OVERRIDE'
    : bits.erpUrl
      ? 'tenant.erpUrl'
      : 'ERP_URL';
  try {
    console.log(
      `[ERP factory] source=${erpUrlSource} host=${new URL(baseUrl).host}`,
    );
  } catch {
    /* ignore */
  }

  const settings = await cachedJson(
    erpSettingsCacheKey(bits.tenantId, bits.csBaseUrl),
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

  return new MyMbErpClient({
    baseUrl,
    authHeader,
    settings,
    cache: new RedisCacheAdapter(),
  });
}
