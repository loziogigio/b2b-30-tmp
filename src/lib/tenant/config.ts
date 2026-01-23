/**
 * Tenant Mode Configuration
 *
 * Controls whether the app runs in single-tenant or multi-tenant mode.
 *
 * - "single": Uses .env values directly (current behavior, default)
 * - "multi": Resolves tenant from hostname, loads config from MongoDB
 */

export type TenantMode = 'single' | 'multi';

export const TENANT_MODE: TenantMode =
  (process.env.TENANT_MODE as TenantMode) || 'single';

export const isMultiTenant = TENANT_MODE === 'multi';
export const isSingleTenant = TENANT_MODE === 'single';

/**
 * Tenant cookie/header names used to pass tenant info through the request chain
 */
export const TENANT_HEADER = 'x-tenant-id';
export const TENANT_COOKIE = 'tenant_id';

/**
 * Cache TTL for tenant config (in milliseconds)
 * In multi-tenant mode, tenant configs are cached to avoid DB lookups on every request
 *
 * Set TENANT_CACHE_TTL_SECONDS in .env to override (e.g., "30" for 30 seconds in dev)
 */
export const TENANT_CACHE_TTL = process.env.TENANT_CACHE_TTL_SECONDS
  ? parseInt(process.env.TENANT_CACHE_TTL_SECONDS, 10) * 1000
  : 5 * 60 * 1000; // default: 5 minutes
