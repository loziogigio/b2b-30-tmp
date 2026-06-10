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

/** Phase 2: map a `coupon_settings` data-model record `data` to typed config. Pure. */
export function mapCouponRecord(data: Record<string, unknown>): CouponConfig {
  const baseUrl = String(data.api_url ?? '').replace(/\/+$/, '');
  return {
    enabled: data.enabled === undefined ? true : Boolean(data.enabled),
    baseUrl,
    authHeader: authFromEnv(),
  };
}

/**
 * The single phase seam. Phase 1 returns the static env config. Phase 2 (a later task)
 * swaps the body to read the channel-scoped `coupon_settings` model.
 */
export async function resolveCouponConfig(_req: NextRequest): Promise<CouponConfig> {
  return resolveCouponConfigFromEnv();
}
