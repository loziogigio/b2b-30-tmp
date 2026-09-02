import type { NextRequest } from 'next/server';
import {
  DEFAULT_ACCOUNT_CONFIG,
  asSectionVisible,
  isAccountSectionVisible,
  type AccountConfig,
} from './account-config.types';

/**
 * Account-area display config, backed by the channel-scoped `account_settings`
 * data model in Commerce Suite. Mirrors the catalog-config / cart-config
 * plumbing: read server-side, Redis-cached, defaults when absent.
 *
 * Two entry points because the consumers differ:
 *  - `resolveAccountConfig(req)`        — the /api/b2b/account-settings route
 *  - `resolveAccountConfigFromHeaders()`— page server components, which have no
 *    NextRequest (they read `headers()`), and need this to 404 a hidden route.
 *
 * The pure shape + coercers live in account-config.types.ts so client components
 * can import them without dragging this server-only module into the browser.
 */
export {
  DEFAULT_ACCOUNT_CONFIG,
  asSectionVisible,
  isAccountSectionVisible,
  type AccountConfig,
};

/**
 * Map an `account_settings` record `data` to typed config. Pure. Absent fields
 * stay visible — see asSectionVisible.
 */
export function mapAccountRecord(data: Record<string, unknown>): AccountConfig {
  return {
    showFido: asSectionVisible(data.show_fido),
    showDeadlines: asSectionVisible(data.show_deadlines),
  };
}

/** Sales-channel code the storefront reads its `account_settings` record under. */
function accountChannel(): string {
  return (
    process.env.ACCOUNT_CHANNEL ||
    process.env.CATALOG_CHANNEL ||
    process.env.CART_CHANNEL ||
    'b2b'
  );
}

interface FetchAccountArgs {
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
  channel: string;
}

export async function fetchAccountSettings(
  args: FetchAccountArgs,
): Promise<AccountConfig | null> {
  try {
    const url = new URL(
      `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/account_settings/records`,
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
    return mapAccountRecord(record.data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Shared cache + fetch. Key is tenant-scoped: several tenants share one CS URL. */
async function resolveFor(api: {
  pimApiUrl: string;
  apiKeyId?: string;
  apiSecret?: string;
  tenantId: string;
}): Promise<AccountConfig> {
  if (!api.pimApiUrl || !api.apiKeyId) return DEFAULT_ACCOUNT_CONFIG;
  const { cachedJson } = await import('@/lib/cache/redis-cache');
  const channel = accountChannel();
  const dyn = await cachedJson(
    `account:settings:${api.tenantId}:${api.pimApiUrl}:${channel}`,
    { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
    () =>
      fetchAccountSettings({
        csBaseUrl: api.pimApiUrl,
        apiKeyId: api.apiKeyId as string,
        apiSecret: api.apiSecret ?? '',
        channel,
      }),
  );
  return dyn ?? DEFAULT_ACCOUNT_CONFIG;
}

/** For API routes, which have a NextRequest. */
export async function resolveAccountConfig(
  req: NextRequest,
): Promise<AccountConfig> {
  try {
    const { resolveTenantApiConfig } = await import('@/lib/tenant/api-config');
    return await resolveFor(await resolveTenantApiConfig(req));
  } catch {
    return DEFAULT_ACCOUNT_CONFIG;
  }
}

/**
 * For page server components, which have no NextRequest. Resolves the tenant
 * from `headers()` the way lib/pim/server-fetch.ts does.
 *
 * Fails OPEN (everything visible) on any error: this gates a 404, and a Redis
 * blip must not make a customer's own pages vanish.
 */
export async function resolveAccountConfigFromHeaders(): Promise<AccountConfig> {
  try {
    const [{ headers }, { resolveTenant, isSingleTenant }] = await Promise.all([
      import('next/headers'),
      import('@/lib/tenant'),
    ]);

    if (isSingleTenant) {
      return await resolveFor({
        pimApiUrl:
          process.env.PIM_API_URL_OVERRIDE ||
          process.env.PIM_API_PRIVATE_URL ||
          process.env.NEXT_PUBLIC_PIM_API_URL ||
          '',
        apiKeyId: process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID,
        apiSecret: process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET,
        tenantId: process.env.NEXT_PUBLIC_TENANT_ID || 'default',
      });
    }

    const headersList = await headers();
    const hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';
    const tenant = await resolveTenant(hostname);
    if (!tenant) return DEFAULT_ACCOUNT_CONFIG;

    return await resolveFor({
      pimApiUrl: process.env.PIM_API_URL_OVERRIDE || tenant.api.pimApiUrl,
      apiKeyId: tenant.api.apiKeyId,
      apiSecret: tenant.api.apiSecret,
      tenantId: tenant.id || hostname,
    });
  } catch {
    return DEFAULT_ACCOUNT_CONFIG;
  }
}
