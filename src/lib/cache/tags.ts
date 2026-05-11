/**
 * Stable, tenant-scoped Next.js cache tags for PIM data.
 *
 * Used both by the `fetch(..., { next: { tags } })` call sites and by the
 * on-demand revalidation paths (`POST /api/revalidate`, the Redis invalidation
 * subscriber). Keep the names in sync with what the PIM publishes.
 */
import { headers } from 'next/headers';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

export const CACHE_TAG_NAMES = [
  'home-settings', // branding / header / footer / meta / scripts (portal config)
  'home-template', // home page blocks + SEO
  'menu', // header / footer / mobile navigation menus
  'categories', // category tree / landing
  'collections', // marketing collections
  'products', // product search/listing results
  'product-templates', // per-product SEO templates
  'sitemap', // sitemap URL set
  'page', // CMS content page (use with a slug suffix)
] as const;

export type CacheTagName = (typeof CACHE_TAG_NAMES)[number];

/** Tenant id used to scope tags in single-tenant mode (one container per tenant). */
export const SINGLE_TENANT_ID: string =
  process.env.VINC_TENANT_ID ||
  (() => {
    const key =
      process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID || '';
    const body = key.startsWith('ak_') ? key.slice(3) : key; // ak_{tenant}_{key}
    const lastSep = body.lastIndexOf('_');
    return lastSep > 0 ? body.slice(0, lastSep) : 'b2b';
  })();

/** Resolve the tenant id for the current request (env in single-tenant, hostname otherwise). */
export async function currentTenantId(): Promise<string> {
  if (isSingleTenant) return SINGLE_TENANT_ID;
  const headersList = await headers();
  const hostname =
    headersList.get('x-tenant-hostname') ||
    headersList.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname).catch(() => null);
  return tenant?.id ?? 'unknown';
}

export function cacheTag(
  name: CacheTagName,
  tenantId: string,
  suffix?: string,
): string {
  return suffix ? `${name}-${tenantId}-${suffix}` : `${name}-${tenantId}`;
}

/** Map a list of (possibly aliased) cache-name strings to concrete tags for a tenant. */
const ALIASES: Record<string, CacheTagName> = {
  sitemap: 'sitemap',
  'home-config': 'home-settings',
  'site-config': 'home-settings',
};

export function tagsForNames(
  names: readonly string[],
  tenantId: string,
): string[] {
  const out: string[] = [];
  for (const raw of names) {
    const [base, suffix] = raw.split(':', 2); // e.g. "page:chi-siamo"
    const resolved = (ALIASES[base] ?? base) as CacheTagName;
    if ((CACHE_TAG_NAMES as readonly string[]).includes(resolved)) {
      out.push(cacheTag(resolved, tenantId, suffix));
    }
  }
  return out;
}
