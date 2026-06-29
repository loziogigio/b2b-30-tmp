import type { NextRequest } from 'next/server';
import { DEFAULT_CART_CONFIG, type CartConfig } from './cart-config.types';

/**
 * Cart UI toggles consumed by the time-theme cart/checkout. Mirrors the coupon
 * config plumbing (coupon-config.ts): a channel-scoped `cart_settings` data-model
 * record in Commerce Suite, read server-side (Redis-cached) with an env fallback.
 *
 * The pure shape + defaults live in cart-config.types.ts so client components can
 * import them without dragging this server-only module into the browser bundle.
 */
export { DEFAULT_CART_CONFIG, type CartConfig };

/**
 * Coerce loose record/env values ("true"/"1"/true) to a boolean. When the value
 * is absent (undefined/null) the supplied default is used, so flags like
 * `show_pickup` that must stay ON unless explicitly disabled can opt into a
 * truthy default.
 */
function asBool(v: unknown, fallback = false): boolean {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }
  return false;
}

/** Phase 1: read static config from env. */
export function resolveCartConfigFromEnv(): CartConfig {
  return {
    showLineNote: asBool(process.env.CART_SHOW_LINE_NOTE),
    showHeadNote: asBool(process.env.CART_SHOW_HEAD_NOTE),
    showPickup: asBool(process.env.CART_SHOW_PICKUP, true),
  };
}

/**
 * Phase 2: map a `cart_settings` data-model record `data` to typed config. Pure.
 * Note fields fall back to OFF; `show_pickup` falls back to ON (preserves the
 * pre-flag behaviour where pickup was always rendered).
 */
export function mapCartRecord(data: Record<string, unknown>): CartConfig {
  return {
    showLineNote: asBool(data.show_line_note),
    showHeadNote: asBool(data.show_head_note),
    showPickup: asBool(data.show_pickup, true),
  };
}

/** Sales-channel code the storefront reads its `cart_settings` record under. */
function cartChannel(): string {
  return process.env.CART_CHANNEL || process.env.COUPON_CHANNEL || 'b2b';
}

/**
 * The single phase seam. Reads the channel-scoped `cart_settings` record from
 * Commerce Suite for the request's tenant (cached), falling back to the static
 * env config when the tenant/CS bits are unavailable, the record is absent, or
 * the lookup fails.
 *
 * Dynamic imports keep the pure helpers above free of the ERP-factory / Redis
 * deps so they stay unit-testable in isolation.
 */
export async function resolveCartConfig(req: NextRequest): Promise<CartConfig> {
  const envCfg = resolveCartConfigFromEnv();
  try {
    const [{ resolveTenantApiConfig }, { cachedJson }] = await Promise.all([
      import('@/lib/tenant/api-config'),
      import('@/lib/cache/redis-cache'),
    ]);
    // Same resolver every CS-reaching route uses: honours PIM_API_URL_OVERRIDE
    // (local dev → localhost suite) and falls back to env credentials.
    const api = await resolveTenantApiConfig(req);
    if (!api.pimApiUrl || !api.apiKeyId) return envCfg;

    const channel = cartChannel();
    const dyn = await cachedJson(
      `cart:settings:${api.pimApiUrl}:${channel}`,
      { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
      () =>
        fetchCartSettings({
          csBaseUrl: api.pimApiUrl,
          apiKeyId: api.apiKeyId as string,
          apiSecret: api.apiSecret ?? '',
          channel,
        }),
    );

    return dyn ?? envCfg;
  } catch {
    return envCfg;
  }
}

interface FetchCartArgs {
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
  channel: string;
}

/**
 * Phase 2: fetch the channel-scoped `cart_settings` record from Commerce Suite
 * (mirrors fetchCouponSettings). Returns DEFAULT_CART_CONFIG when absent.
 */
export async function fetchCartSettings(args: FetchCartArgs): Promise<CartConfig> {
  const url = new URL(
    `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/cart_settings/records`,
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
  if (!res.ok) return DEFAULT_CART_CONFIG;

  const json: any = await res.json();
  const record = json?.data?.items?.[0];
  if (!record?.data) return DEFAULT_CART_CONFIG;
  return mapCartRecord(record.data as Record<string, unknown>);
}
