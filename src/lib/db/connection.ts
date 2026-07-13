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
 * Connect to the appropriate database
 * - Single-tenant mode: uses MONGO_DB from .env
 * - Multi-tenant mode: resolves tenant from hostname and uses tenant's database
 */
export const connectToDatabase = async (): Promise<Connection> => {
  // Single-tenant mode: use .env values directly
  if (isSingleTenant) {
    return getPooledConnection(defaultMongoDb);
  }

  // Multi-tenant mode: resolve tenant from hostname
  let hostname = 'localhost';
  try {
    const headersList = await headers();
    hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';
  } catch {
    // headers() not available (e.g., in build or outside request context)
    console.warn('[DB] Could not get headers, using default database');
    return getPooledConnection(defaultMongoDb);
  }

  return withResolvedTenant(hostname, (tenant) => {
    if (!tenant) {
      console.warn(
        `[DB] No tenant found for ${hostname}, using default database`,
      );
    }
    return getPooledConnection(tenant?.database.mongoDb || defaultMongoDb);
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

  let hostname = 'localhost';
  try {
    const headersList = await headers();
    hostname =
      headersList.get('x-tenant-hostname') ||
      headersList.get('host') ||
      'localhost';
  } catch {
    return { dbName: defaultMongoDb, tenantId: SINGLE_TENANT_ID };
  }

  return withResolvedTenant(hostname, (tenant) =>
    tenant
      ? {
          dbName: tenant.database.mongoDb || defaultMongoDb,
          tenantId: tenant.id,
        }
      : { dbName: defaultMongoDb, tenantId: 'unknown' },
  );
};
