import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * When the tenant registry is unreachable, tenant resolution yields `null`.
 * Silently connecting to the empty `vinc-default` database in that case turns a
 * database outage into a storefront that renders "No Content Available" — which
 * reads as a misconfiguration and hides the real failure. Multi-tenant requests
 * must fail loudly instead.
 */

let resolvedTenant: { database: { mongoDb: string }; id: string } | null = null;
let singleTenant = false;

vi.mock('next/headers', () => ({
  headers: async () => new Map([['host', 'shop.example.com']]),
}));

vi.mock('@/lib/tenant', () => ({
  get isSingleTenant() {
    return singleTenant;
  },
  withResolvedTenant: async (_hostname: string, operation: any) =>
    operation(resolvedTenant),
}));

const getPooledConnection = vi.fn(async (dbName: string) => ({
  name: dbName,
  readyState: 1,
}));

vi.mock('vinc-mongo-db', () => ({
  getPooledConnection: (dbName: string) => getPooledConnection(dbName),
  closeAllConnections: vi.fn(),
  getPoolStats: vi.fn(),
}));

const importConnection = () => import('@/lib/db/connection');

beforeEach(() => {
  vi.clearAllMocks();
  resolvedTenant = null;
  singleTenant = false;
  process.env.MONGO_DB = 'vinc-default';
});

describe('multi-tenant database resolution', () => {
  it('connects to the resolved tenant database', async () => {
    resolvedTenant = { id: 'tenant-a', database: { mongoDb: 'vinc-tenant-a' } };
    const { connectToDatabase } = await importConnection();

    const conn = await connectToDatabase();

    expect(conn.name).toBe('vinc-tenant-a');
    expect(getPooledConnection).toHaveBeenCalledWith('vinc-tenant-a');
  });

  it('throws instead of falling back to the default database when the tenant cannot be resolved', async () => {
    resolvedTenant = null;
    const { connectToDatabase } = await importConnection();

    await expect(connectToDatabase()).rejects.toThrow(/shop\.example\.com/);
    expect(getPooledConnection).not.toHaveBeenCalled();
  });

  it('throws when resolving the tenant db target for an unknown host', async () => {
    resolvedTenant = null;
    const { resolveTenantDbTarget } = await importConnection();

    await expect(resolveTenantDbTarget()).rejects.toThrow(/shop\.example\.com/);
  });

  it('still uses the configured database in single-tenant mode', async () => {
    singleTenant = true;
    const { connectToDatabase, resolveTenantDbTarget } =
      await importConnection();

    await connectToDatabase();
    expect(getPooledConnection).toHaveBeenCalledWith('vinc-default');

    await expect(resolveTenantDbTarget()).resolves.toMatchObject({
      dbName: 'vinc-default',
    });
  });
});
