import { headers } from 'next/headers';
import { resolveTenant, isSingleTenant } from '@/lib/tenant/service';
import { buildTenantFromEnv } from '@/lib/tenant/types';
import { getThemeIdForTenant } from './resolver';
import type { ThemeId } from './types';

/**
 * Read the active theme id for the current request.
 *
 * Multi-tenant: resolve the tenant from `x-tenant-hostname` (set by middleware)
 * via the cached MongoDB lookup — same pattern as `getServerHomeSettings` and
 * the root layout.
 *
 * Single-tenant: read from the env-built tenant config.
 *
 * Falls back to `'default'` on any failure so a Mongo hiccup doesn't 500 the page.
 */
export async function getThemeIdFromRequest(): Promise<ThemeId> {
  try {
    if (isSingleTenant) {
      return getThemeIdForTenant(buildTenantFromEnv().b2bTheme);
    }
    const h = await headers();
    const hostname = h.get('x-tenant-hostname') || h.get('host') || 'localhost';
    const tenant = await resolveTenant(hostname);
    return getThemeIdForTenant(tenant?.b2bTheme);
  } catch {
    return 'default';
  }
}

export async function isTimeThemeFromRequest(): Promise<boolean> {
  return (await getThemeIdFromRequest()) === 'time';
}
