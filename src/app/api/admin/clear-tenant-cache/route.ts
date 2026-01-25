import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { clearTenantCache } from '@/lib/tenant/service';

const isDev = process.env.NODE_ENV === 'development';

// MongoDB connection for token validation (same as tenant registry)
const MONGO_URL =
  process.env.TENANTS_MONGO_URL ||
  process.env.MONGO_URL ||
  'mongodb://root:root@localhost:27017/?authSource=admin';
const TENANTS_DB = process.env.TENANTS_DB || 'vinc-admin';

/**
 * Validate admin token against vinc-admin database
 */
async function validateAdminToken(token: string): Promise<boolean> {
  if (!token) return false;

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(TENANTS_DB);

    // Check if token exists in admin_tokens collection
    const tokenDoc = await db.collection('admin_tokens').findOne({
      token,
      is_active: { $ne: false },
      $or: [
        { expires_at: { $exists: false } },
        { expires_at: null },
        { expires_at: { $gt: new Date() } },
      ],
    });

    return !!tokenDoc;
  } catch (error) {
    console.error('[Admin] Token validation error:', error);
    return false;
  } finally {
    if (client) await client.close();
  }
}

/**
 * POST /api/admin/clear-tenant-cache
 *
 * Clears the tenant cache. Called by vinc-admin backend after tenant updates.
 *
 * Authentication:
 *   - Token validated against vinc-admin.admin_tokens collection
 *   - In development: No auth required (for convenience)
 *
 * Headers:
 *   x-admin-token: token-from-vinc-admin-db
 *   OR
 *   Authorization: Bearer token-from-vinc-admin-db
 *
 * Body (optional):
 *   { "hostname": "specific-hostname.com" } - clear specific hostname
 *   { "tenantId": "tenant-id" } - clear by tenant ID
 *   {} or no body - clear all cached tenants
 */
export async function POST(request: Request) {
  // Auth check - validate token against vinc-admin database
  if (!isDev) {
    const token =
      request.headers.get('x-admin-token') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      console.warn('[Admin] Missing admin token');
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const isValid = await validateAdminToken(token);
    if (!isValid) {
      console.warn('[Admin] Invalid or expired admin token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const hostname = body?.hostname;
    const tenantId = body?.tenantId;

    if (hostname) {
      clearTenantCache(hostname);
      console.log(`[Admin] Cleared tenant cache for hostname: ${hostname}`);
      return NextResponse.json({
        success: true,
        cleared: 'hostname',
        value: hostname,
        message: `Cache cleared for hostname: ${hostname}`,
      });
    }

    if (tenantId) {
      // Clear all - tenant ID based clearing would need tracking which hostnames map to which tenant
      // For now, clear all when tenantId is specified
      clearTenantCache();
      console.log(`[Admin] Cleared all tenant cache (tenantId: ${tenantId})`);
      return NextResponse.json({
        success: true,
        cleared: 'all',
        tenantId,
        message: `All cache cleared for tenant: ${tenantId}`,
      });
    }

    clearTenantCache();
    console.log('[Admin] Cleared all tenant cache');
    return NextResponse.json({
      success: true,
      cleared: 'all',
      message: 'All tenant cache cleared',
    });
  } catch (error) {
    console.error('[Admin] Failed to clear cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 },
    );
  }
}
