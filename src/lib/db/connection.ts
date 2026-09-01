import { Connection } from 'mongoose';
import { headers } from 'next/headers';
import { withResolvedTenant, isSingleTenant } from '@/lib/tenant';
import { SINGLE_TENANT_ID } from '@/lib/cache/tags';
import {
  getPooledConnection,
  closeAllConnections,
  getPoolStats,
} from 'vinc-mongo-db';

// Re-export pool utilities
export { getPooledConnection, closeAllConnections, getPoolStats };

// Re-export model registry utilities
export {
  getModel,
  getHomeTemplateModelForDb,
  getProductTemplateModelForDb,
  getB2BPageModelForDb,
} from './model-registry';

// Default database name from .env
const defaultMongoDb = process.env.MONGO_DB ?? 'vinc-default';

/**
 * Raised when a multi-tenant request cannot be mapped to a tenant database.
 *
 * Falling back to `defaultMongoDb` here used to turn a registry/Mongo outage
 * into a storefront rendering "No Content Available" from the empty default
 * database — indistinguishable from a misconfigured tenant, and cacheable. A
 * throw surfaces the outage as an error instead, and lets the Redis
 * stale-if-error layer serve the last-known page rather than an empty one.
 */
export class TenantDbUnresolvedError extends Error {
  constructor(readonly hostname: string) {
    super(
      `[DB] No tenant found for ${hostname} — refusing to fall back to the default database`,
    );
    this.name = 'TenantDbUnresolvedError';
  }
}

/**
 * Resolve the request hostname used for tenant lookup.
 * Returns null outside a request context (build, scripts, background jobs).
 */
const requestHostname = async (): Promise<string | null> => {
  try {
    const headersList = await headers();
    return (
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost'
    );
  } catch {
    // headers() not available (e.g., in build or outside request context)
    return null;
  }
};

/**
 * Connect to the appropriate database
 * - Single-tenant mode: uses MONGO_DB from .env
 * - Multi-tenant mode: resolves tenant from hostname and uses tenant's database
 *
 * @throws {TenantDbUnresolvedError} in multi-tenant mode when the hostname does
 * not resolve to a tenant (typically the tenant registry being unreachable).
 */
export const connectToDatabase = async (): Promise<Connection> => {
  // Single-tenant mode: use .env values directly
  if (isSingleTenant) {
    return getPooledConnection(defaultMongoDb);
  }

  // Multi-tenant mode: resolve tenant from hostname
  const hostname = await requestHostname();
  if (hostname === null) {
    console.warn('[DB] Could not get headers, using default database');
    return getPooledConnection(defaultMongoDb);
  }

  return withResolvedTenant(hostname, (tenant) => {
    if (!tenant) {
      throw new TenantDbUnresolvedError(hostname);
    }
    return getPooledConnection(tenant.database.mongoDb || defaultMongoDb);
  });
};

/**
 * Resolve the target tenant database NAME (+ tenant id) without opening a
 * connection. Used as a stable cache key so request-scoped data (e.g. the home
 * template) can be cached per-tenant via `unstable_cache` — whose callback
 * cannot itself call `headers()` to resolve the tenant.
 */
export const resolveTenantDbTarget = async (): Promise<{
  dbName: string;
  tenantId: string;
}> => {
  if (isSingleTenant) {
    return { dbName: defaultMongoDb, tenantId: SINGLE_TENANT_ID };
  }

  const hostname = await requestHostname();
  if (hostname === null) {
    return { dbName: defaultMongoDb, tenantId: SINGLE_TENANT_ID };
  }

  return withResolvedTenant(hostname, (tenant) => {
    // Same reasoning as connectToDatabase: an unresolved tenant must not key a
    // cache entry against the empty default database.
    if (!tenant) {
      throw new TenantDbUnresolvedError(hostname);
    }
    return {
      dbName: tenant.database.mongoDb || defaultMongoDb,
      tenantId: tenant.id,
    };
  });
};
