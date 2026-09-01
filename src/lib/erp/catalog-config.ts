import type { NextRequest } from 'next/server';
import {
  DEFAULT_CATALOG_CONFIG,
  asCatalogView,
  asProductOpenMode,
  asAvailabilityDisplay,
  asArrivalDisplay,
  type CatalogConfig,
} from './catalog-config.types';

/**
 * Catalog UI config consumed by the time-theme search/listing. Mirrors the
 * cart-config / coupon-config plumbing: a channel-scoped `catalog_settings`
 * data-model record in Commerce Suite, read server-side (Redis-cached) with an
 * env fallback.
 *
 * The pure shape + coercers live in catalog-config.types.ts so client components
 * can import them without dragging this server-only module into the browser
 * bundle.
 */
export {
  DEFAULT_CATALOG_CONFIG,
  asCatalogView,
  asProductOpenMode,
  asAvailabilityDisplay,
  asArrivalDisplay,
  type CatalogConfig,
};

/** Phase 1: read static config from env. */
export function resolveCatalogConfigFromEnv(): CatalogConfig {
  return {
    defaultView: asCatalogView(process.env.CATALOG_DEFAULT_VIEW),
    productOpenMode: asProductOpenMode(process.env.CATALOG_PRODUCT_OPEN_MODE),
    availabilityDisplay: asAvailabilityDisplay(
      process.env.CATALOG_AVAILABILITY_DISPLAY,
    ),
    arrivalDisplay: asArrivalDisplay(process.env.CATALOG_ARRIVAL_DISPLAY),
  };
}

/**
 * Phase 2: map a `catalog_settings` data-model record `data` to typed config.
 * Pure. Unknown/absent fields fall back to the defaults (grid + modal + in_out).
 */
export function mapCatalogRecord(data: Record<string, unknown>): CatalogConfig {
  return {
    defaultView: asCatalogView(data.default_view),
    productOpenMode: asProductOpenMode(data.product_open_mode),
    availabilityDisplay: asAvailabilityDisplay(data.availability_display),
    arrivalDisplay: asArrivalDisplay(data.arrival_display),
  };
}

/** Sales-channel code the storefront reads its `catalog_settings` record under. */
function catalogChannel(): string {
  return (
    process.env.CATALOG_CHANNEL ||
    process.env.CART_CHANNEL ||
    process.env.COUPON_CHANNEL ||
    'b2b'
  );
}

/**
 * The single phase seam. Reads the channel-scoped `catalog_settings` record from
 * Commerce Suite for the request's tenant (cached), falling back to the static
 * env config when the tenant/CS bits are unavailable, the record is absent, or
 * the lookup fails.
 *
 * Dynamic imports keep the pure helpers above free of the ERP-factory / Redis
 * deps so they stay unit-testable in isolation.
 */
export async function resolveCatalogConfig(
  req: NextRequest,
): Promise<CatalogConfig> {
  const envCfg = resolveCatalogConfigFromEnv();
  try {
    const [{ resolveTenantApiConfig }, { cachedJson }] = await Promise.all([
      import('@/lib/tenant/api-config'),
      import('@/lib/cache/redis-cache'),
    ]);
    const api = await resolveTenantApiConfig(req);
    if (!api.pimApiUrl || !api.apiKeyId) return envCfg;

    const channel = catalogChannel();
    const dyn = await cachedJson(
      `catalog:settings:${api.tenantId}:${api.pimApiUrl}:${channel}`,
      { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
      () =>
        fetchCatalogSettings({
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

interface FetchCatalogArgs {
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
  channel: string;
}

/**
 * Phase 2: fetch the channel-scoped `catalog_settings` record from Commerce
 * Suite (mirrors fetchCartSettings).
 *
 * Returns `null` — NOT the defaults — when the record is absent or the lookup
 * fails, so `resolveCatalogConfig`'s `dyn ?? envCfg` correctly falls through to
 * the env config. Returning DEFAULT_CATALOG_CONFIG here would be a truthy
 * object that swallows `??`, silently killing the env fallback whenever
 * Commerce Suite is reachable but has no record — which made
 * CATALOG_AVAILABILITY_DISPLAY do nothing.
 */
export async function fetchCatalogSettings(
  args: FetchCatalogArgs,
): Promise<CatalogConfig | null> {
  try {
    const url = new URL(
      `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/catalog_settings/records`,
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
    if (!res.ok) return null;

    const json: any = await res.json();
    const record = json?.data?.items?.[0];
    if (!record?.data) return null;
    return mapCatalogRecord(record.data as Record<string, unknown>);
  } catch {
    return null;
  }
}
