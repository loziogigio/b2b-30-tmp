import type { NextRequest } from 'next/server';
import { parseMyMbConnection } from 'vinc-erp';

export type CouponConfig = {
  enabled: boolean;
  baseUrl: string;    // e.g. http://mymb.baseprotection.com:8884/MyMB/Service/web
  authHeader: string; // "Basic " + base64(user:pass)
};

/** Feature is active by default; empty connection means the proxy short-circuits. */
export const DEFAULT_COUPON_CONFIG: CouponConfig = {
  enabled: true, baseUrl: '', authHeader: '',
};

/** Build a Basic auth header from explicit user/pass env (used when the URL has no creds). */
function authFromEnv(): string {
  const user = process.env.COUPON_API_USER;
  const pass = process.env.COUPON_API_PASSWORD;
  if (!user || !pass) return '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

/** Phase 1: read static config from env. */
export function resolveCouponConfigFromEnv(): CouponConfig {
  const url = process.env.COUPON_API_URL;
  if (!url) return DEFAULT_COUPON_CONFIG;
  try {
    // Try embedded creds first; fall back to plain URL + env creds.
    try {
      const { baseUrl, authHeader } = parseMyMbConnection(url);
      return { enabled: true, baseUrl, authHeader };
    } catch {
      const baseUrl = url.replace(/\/+$/, '');
      return { enabled: true, baseUrl, authHeader: authFromEnv() };
    }
  } catch {
    return DEFAULT_COUPON_CONFIG;
  }
}

/** Build a Basic auth header from explicit user/pass strings; '' when either is missing. */
function basicAuth(user: string, pass: string): string {
  if (!user || !pass) return '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

/**
 * Phase 2: map a `coupon_settings` data-model record `data` to typed config. Pure.
 *
 * Credentials are sourced from the dynamic record so the container needs no
 * coupon secrets of its own (and they stay per-tenant). Resolution order:
 *   1. record `api_user` / `api_password` fields (preferred)
 *   2. credentials embedded in `api_url` (http://user:pass@host/path) — back-compat
 *   3. COUPON_API_USER / COUPON_API_PASSWORD env — last-resort fallback
 */
export function mapCouponRecord(data: Record<string, unknown>): CouponConfig {
  const rawUrl = String(data.api_url ?? '');
  const enabled = data.enabled === undefined ? true : Boolean(data.enabled);

  const user = data.api_user == null ? '' : String(data.api_user);
  const pass = data.api_password == null ? '' : String(data.api_password);
  const recordAuth = basicAuth(user, pass);
  if (recordAuth) {
    return { enabled, baseUrl: rawUrl.replace(/\/+$/, ''), authHeader: recordAuth };
  }

  try {
    const { baseUrl, authHeader } = parseMyMbConnection(rawUrl);
    return { enabled, baseUrl, authHeader };
  } catch {
    return { enabled, baseUrl: rawUrl.replace(/\/+$/, ''), authHeader: authFromEnv() };
  }
}

/** Sales-channel code the storefront reads its `coupon_settings` record under. */
function couponChannel(): string {
  return process.env.COUPON_CHANNEL || 'b2b';
}

/**
 * The single phase seam. Reads the channel-scoped `coupon_settings` record from
 * Commerce Suite for the request's tenant (cached), falling back to the static
 * env config when the tenant/CS bits are unavailable, the record is absent, or
 * the lookup fails. The MyMB Basic-auth credentials always come from env
 * (COUPON_API_USER / COUPON_API_PASSWORD) — the record carries only enabled + api_url.
 *
 * Dynamic imports keep the pure helpers above free of the ERP-factory / Redis
 * deps so they stay unit-testable in isolation.
 */
export async function resolveCouponConfig(req: NextRequest): Promise<CouponConfig> {
  const envCfg = resolveCouponConfigFromEnv();
  try {
    const [{ resolveTenantApiConfig }, { cachedJson }] = await Promise.all([
      import('@/lib/tenant/api-config'),
      import('@/lib/cache/redis-cache'),
    ]);
    // Same resolver every CS-reaching route uses: honours PIM_API_URL_OVERRIDE
    // (local dev → localhost suite) and falls back to env credentials.
    const api = await resolveTenantApiConfig(req);
    if (!api.pimApiUrl || !api.apiKeyId) return envCfg;

    const channel = couponChannel();
    const dyn = await cachedJson(
      `coupon:settings:${api.pimApiUrl}:${channel}`,
      { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
      () =>
        fetchCouponSettings({
          csBaseUrl: api.pimApiUrl,
          apiKeyId: api.apiKeyId as string,
          apiSecret: api.apiSecret ?? '',
          channel,
        }),
    );

    // Use the dynamic record only when it actually carries a connection URL;
    // otherwise fall back to env. Credentials always come from env.
    if (dyn?.baseUrl) {
      return { ...dyn, authHeader: dyn.authHeader || envCfg.authHeader };
    }
    return envCfg;
  } catch {
    return envCfg;
  }
}

interface FetchCouponArgs {
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
  channel: string;
}

/**
 * Phase 2: fetch the channel-scoped `coupon_settings` record from Commerce Suite
 * (mirrors fetchErpSettings). Returns DEFAULT_COUPON_CONFIG when absent.
 */
export async function fetchCouponSettings(args: FetchCouponArgs): Promise<CouponConfig> {
  const url = new URL(
    `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/coupon_settings/records`,
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
  if (!res.ok) return DEFAULT_COUPON_CONFIG;

  const json: any = await res.json();
  const record = json?.data?.items?.[0];
  if (!record?.data) return DEFAULT_COUPON_CONFIG;
  return mapCouponRecord(record.data as Record<string, unknown>);
}
