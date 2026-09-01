import type { NextRequest } from 'next/server';
import { parseMyMbConnection } from 'vinc-erp';

export type ArxivarConfig = {
  enabled: boolean;
  baseUrl: string; // e.g. http://mymb.bellieforti.com:8883/MyMB/Service/web
  authHeader: string; // "Basic " + base64(user:pass)
};

export const DEFAULT_ARXIVAR_CONFIG: ArxivarConfig = {
  enabled: false,
  baseUrl: '',
  authHeader: '',
};

function authFromEnv(): string {
  const user = process.env.ARXIVAR_API_USER;
  const pass = process.env.ARXIVAR_API_PASSWORD;
  if (!user || !pass) return '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

function basicAuth(user: string, pass: string): string {
  if (!user || !pass) return '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

/** Phase 1: static config from env. */
export function resolveArxivarConfigFromEnv(): ArxivarConfig {
  const url = process.env.ARXIVAR_API_URL;
  if (!url) return DEFAULT_ARXIVAR_CONFIG;
  try {
    try {
      const { baseUrl, authHeader } = parseMyMbConnection(url);
      return { enabled: true, baseUrl, authHeader };
    } catch {
      return {
        enabled: true,
        baseUrl: url.replace(/\/+$/, ''),
        authHeader: authFromEnv(),
      };
    }
  } catch {
    return DEFAULT_ARXIVAR_CONFIG;
  }
}

/**
 * Map an `arxivar_settings` record `data` to typed config. Pure.
 * Credential resolution order:
 *   1. record api_user / api_password (preferred)
 *   2. credentials embedded in api_url (http://user:pass@host/path)
 *   3. ARXIVAR_API_USER / ARXIVAR_API_PASSWORD env (last resort)
 */
export function mapArxivarRecord(data: Record<string, unknown>): ArxivarConfig {
  const rawUrl = String(data.api_url ?? '');
  const enabled = data.enabled === undefined ? true : Boolean(data.enabled);

  const user = data.api_user == null ? '' : String(data.api_user);
  const pass = data.api_password == null ? '' : String(data.api_password);
  const recordAuth = basicAuth(user, pass);
  if (recordAuth) {
    return {
      enabled,
      baseUrl: rawUrl.replace(/\/+$/, ''),
      authHeader: recordAuth,
    };
  }
  try {
    const { baseUrl, authHeader } = parseMyMbConnection(rawUrl);
    return { enabled, baseUrl, authHeader };
  } catch {
    return {
      enabled,
      baseUrl: rawUrl.replace(/\/+$/, ''),
      authHeader: authFromEnv(),
    };
  }
}

function arxivarChannel(): string {
  return process.env.ARXIVAR_CHANNEL || 'b2b';
}

/**
 * Read the channel-scoped `arxivar_settings` record from Commerce Suite for the
 * request's tenant (Redis-cached), falling back to env config when the tenant/CS
 * bits are unavailable, the record is absent, or the lookup fails.
 */
export async function resolveArxivarConfig(
  req: NextRequest,
): Promise<ArxivarConfig> {
  const envCfg = resolveArxivarConfigFromEnv();
  try {
    const [{ resolveTenantApiConfig }, { cachedJson }] = await Promise.all([
      import('@/lib/tenant/api-config'),
      import('@/lib/cache/redis-cache'),
    ]);
    const api = await resolveTenantApiConfig(req);
    if (!api.pimApiUrl || !api.apiKeyId) return envCfg;

    const channel = arxivarChannel();
    const dyn = await cachedJson(
      `arxivar:settings:${api.tenantId}:${api.pimApiUrl}:${channel}`,
      { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
      () =>
        fetchArxivarSettings({
          csBaseUrl: api.pimApiUrl,
          apiKeyId: api.apiKeyId as string,
          apiSecret: api.apiSecret ?? '',
          channel,
        }),
    );
    if (dyn?.baseUrl) {
      return { ...dyn, authHeader: dyn.authHeader || envCfg.authHeader };
    }
    return envCfg;
  } catch {
    return envCfg;
  }
}

interface FetchArxivarArgs {
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
  channel: string;
}

/**
 * Fetch the channel-scoped `arxivar_settings` record from Commerce Suite
 * (mirrors fetchCouponSettings). Returns DEFAULT_ARXIVAR_CONFIG when absent.
 */
export async function fetchArxivarSettings(
  args: FetchArxivarArgs,
): Promise<ArxivarConfig> {
  const url = new URL(
    `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/arxivar_settings/records`,
  );
  url.searchParams.set('channel', args.channel);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'x-auth-method': 'api-key',
      'x-api-key-id': args.apiKeyId,
      'x-api-secret': args.apiSecret,
    },
  });
  if (!res.ok) return DEFAULT_ARXIVAR_CONFIG;

  const json: any = await res.json();
  const record = json?.data?.items?.[0];
  if (!record?.data) return DEFAULT_ARXIVAR_CONFIG;
  return mapArxivarRecord(record.data as Record<string, unknown>);
}
