/**
 * Tenant Resolution Service
 *
 * Resolves tenant configuration based on hostname.
 * - Single-tenant mode: Returns config from environment variables
 * - Multi-tenant mode: Looks up tenant from MongoDB registry (vinc-admin.tenants)
 */

import { MongoClient, Db } from 'mongodb';
import { isMultiTenant, isSingleTenant, TENANT_CACHE_TTL } from './config';
import {
  TenantConfig,
  TenantPublicInfo,
  TenantRequestConfig,
  buildTenantFromEnv,
  toPublicInfo,
  toRequestConfig,
} from './types';

// =============================================================================
// MONGODB DOCUMENT TYPE (snake_case as stored in vinc-admin.tenants)
// =============================================================================

interface TenantDocument {
  tenant_id: string;
  name?: string;
  project_code: string;
  domains: Array<{
    hostname: string;
    is_primary?: boolean;
    is_active?: boolean;
  }>;
  api?: {
    pim_api_url?: string;
    b2b_api_url?: string;
    erp_url?: string;
    api_key_id?: string;
    api_secret?: string;
  };
  database?: {
    mongo_url?: string;
    mongo_db?: string;
  };
  require_login?: boolean;
  home_settings_customer_id?: string;
  builder_url?: string;
  b2b_theme?: string;
  support_contact?: string;
  /** Per-tenant feature flags. snake_case as stored. */
  features?: {
    pricing_source?: 'inline' | 'erp' | 'hybrid';
    is_demo?: boolean;
  };
  status: string;
}

/**
 * Convert MongoDB document (snake_case) to TenantConfig (camelCase)
 */
export function fromDocument(doc: TenantDocument): TenantConfig {
  return {
    id: doc.tenant_id,
    name: doc.name || doc.tenant_id,
    projectCode: doc.project_code,
    domains: doc.domains.map((d) => ({
      hostname: d.hostname,
      isPrimary: d.is_primary,
      isActive: d.is_active,
    })),
    api: {
      pimApiUrl: doc.api?.pim_api_url || process.env.PIM_API_URL || '',
      b2bApiUrl: doc.api?.b2b_api_url || process.env.B2B_API_URL || '',
      erpUrl: doc.api?.erp_url || process.env.ERP_URL || undefined,
      apiKeyId: doc.api?.api_key_id || '',
      apiSecret: doc.api?.api_secret || '',
    },
    database: {
      mongoUrl: doc.database?.mongo_url || process.env.MONGO_URL || '',
      mongoDb: doc.database?.mongo_db || `vinc-${doc.tenant_id}`,
    },
    requireLogin: doc.require_login,
    homeSettingsCustomerId: doc.home_settings_customer_id,
    builderUrl: doc.builder_url,
    b2bTheme: doc.b2b_theme || 'default',
    supportContact: doc.support_contact,
    features: doc.features
      ? {
          pricingSource: doc.features.pricing_source,
          isDemo: doc.features.is_demo,
        }
      : undefined,
    isActive: doc.status === 'active',
  };
}

// =============================================================================
// TENANT CACHE (in-memory)
// =============================================================================

interface CacheEntry {
  tenant: TenantConfig;
  expiresAt: number;
}

const tenantCache = new Map<string, CacheEntry>();

function getCachedTenant(hostname: string): TenantConfig | null {
  const entry = tenantCache.get(hostname);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    // Expired — caller should refresh from DB. We deliberately keep the entry
    // around (don't delete) so `getStaleTenant` can serve it if the refresh
    // fails (stale-if-error), avoiding a fallback to the empty default DB.
    return null;
  }
  return entry.tenant;
}

/**
 * Last-known tenant for a hostname, regardless of TTL. Used as a stale-if-error
 * fallback: a transient registry blip should not drop a previously-resolved
 * tenant to `vinc-default` (which yields empty home templates / "No Content").
 */
function getStaleTenant(hostname: string): TenantConfig | null {
  return tenantCache.get(hostname)?.tenant ?? null;
}

function setCachedTenant(hostname: string, tenant: TenantConfig): void {
  tenantCache.set(hostname, {
    tenant,
    expiresAt: Date.now() + TENANT_CACHE_TTL,
  });
}

// =============================================================================
// MONGODB CONNECTION FOR TENANT REGISTRY
// =============================================================================

let registryClient: MongoClient | null = null;
let registryDb: Db | null = null;

/**
 * Get MongoDB connection to the tenant registry database (vinc-admin)
 */
async function getRegistryDb(): Promise<Db> {
  if (registryDb) return registryDb;

  const mongoUrl =
    process.env.TENANTS_MONGO_URL ||
    process.env.MONGO_URL ||
    'mongodb://root:root@localhost:27017/?authSource=admin';

  const dbName = process.env.TENANTS_DB || 'vinc-admin';

  const client = new MongoClient(mongoUrl, {
    minPoolSize: 1,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  // The first request after a cold start has to open this connection across
  // the network to the registry Mongo. A single slow/flaky attempt would
  // otherwise bubble up as a null tenant → fallback to the empty default DB →
  // "No Content Available". Retry a couple of times with short backoff so a
  // transient hiccup on the *first* visit doesn't surface as an empty page.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.connect();
      registryClient = client;
      registryDb = client.db(dbName);
      return registryDb;
    } catch (err) {
      lastErr = err;
      console.warn(
        `[TenantService] Registry connect attempt ${attempt}/3 failed:`,
        (err as Error)?.message,
      );
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 250));
      }
    }
  }

  // Don't cache a half-open client — closing it lets the next call retry
  // cleanly instead of reusing a dead connection.
  await client.close().catch(() => {});
  throw lastErr;
}

// =============================================================================
// TENANT RESOLUTION
// =============================================================================

/**
 * Single tenant config (built from .env, cached)
 */
let singleTenantConfig: TenantConfig | null = null;

function getSingleTenantConfig(): TenantConfig {
  if (!singleTenantConfig) {
    singleTenantConfig = buildTenantFromEnv();
  }
  return singleTenantConfig;
}

/**
 * Build hostname variations to search for
 * MongoDB may store hostnames with or without protocol
 */
function buildHostnameVariations(hostname: string): string[] {
  const lower = hostname.toLowerCase();
  const variations: string[] = [];

  // Add as-is
  variations.push(lower);

  // Add with protocols
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    variations.push(`http://${lower}`);
    variations.push(`https://${lower}`);
  }

  // Add without port
  const withoutPort = lower.split(':')[0];
  if (withoutPort !== lower) {
    variations.push(withoutPort);
    if (
      !withoutPort.startsWith('http://') &&
      !withoutPort.startsWith('https://')
    ) {
      variations.push(`http://${withoutPort}`);
      variations.push(`https://${withoutPort}`);
    }
  }

  return [...new Set(variations)]; // unique
}

/**
 * Resolve tenant from hostname by looking up in MongoDB
 */
async function ensureTenantLoadedFromDb(hostname: string): Promise<boolean> {
  // Check cache first
  const cached = getCachedTenant(hostname);
  if (cached) return true;

  try {
    const db = await getRegistryDb();
    const tenantsCollection = db.collection<TenantDocument>('tenants');

    // Build all hostname variations to search for
    const variations = buildHostnameVariations(hostname);

    // Look up tenant by any hostname variation
    // Do not directly await a promise whose resolved value is the raw tenant
    // document. In development, React Flight records suspended await values in
    // the RSC debug payload; directly awaiting `findOne()` can therefore expose
    // registry-only fields (API credentials and database URLs) in the initial
    // HTML. `forEach()` resolves to void and delivers the document only to this
    // server-side callback, so the private value never crosses an await boundary.
    let foundByDomain = false;
    await tenantsCollection
      .find({
        'domains.hostname': { $in: variations },
        'domains.is_active': { $ne: false },
        status: 'active',
      })
      .limit(1)
      .forEach((doc) => {
        setCachedTenant(hostname, fromDocument(doc));
        foundByDomain = true;
      });

    if (foundByDomain) {
      return true;
    }

    // Try matching subdomain pattern (e.g., "tenant-b2b" from "tenant-b2b.vendereincloud.it")
    const normalizedHostname = hostname.toLowerCase().split(':')[0];
    const subdomain = normalizedHostname.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      let foundBySubdomain = false;
      await tenantsCollection
        .find({
          tenant_id: subdomain,
          status: 'active',
        })
        .limit(1)
        .forEach((doc) => {
          setCachedTenant(hostname, fromDocument(doc));
          foundBySubdomain = true;
        });

      if (foundBySubdomain) {
        return true;
      }
    }

    console.warn(`[TenantService] No tenant found for hostname: ${hostname}`);
    return false;
  } catch (error) {
    console.error('[TenantService] Error resolving tenant:', error);
    // Registry lookup failed (e.g. transient network blip to the registry
    // Mongo). If we resolved this hostname before, serve the stale config
    // rather than null — null sends `connectToDatabase` to the empty default
    // DB and renders "No Content Available" for an otherwise-healthy tenant.
    const stale = getStaleTenant(hostname);
    if (stale) {
      console.warn(
        `[TenantService] Serving stale tenant for ${hostname} after registry error`,
      );
      // Reset the broken registry handle so the next call reconnects.
      registryDb = null;
      registryClient = null;
      return true;
    }
    registryDb = null;
    registryClient = null;
    return false;
  }
}

/**
 * Resolve a full tenant config for trusted server-only callers such as route
 * handlers. React Server Components must use `withResolvedTenant` or
 * `resolveTenantPublicState` instead: awaiting a promise whose value is the
 * private config can make that value appear in a development Flight payload.
 */
async function resolveTenantFromDb(
  hostname: string,
): Promise<TenantConfig | null> {
  const loaded = await ensureTenantLoadedFromDb(hostname);
  return loaded ? getStaleTenant(hostname) : null;
}

/**
 * Run a server-side operation with the private tenant config without ever
 * resolving an awaited promise to that config. Only the operation's result
 * crosses the async boundary, so callers must return a safe final value (for
 * example fetched products, a theme id, or a database connection), never the
 * tenant itself.
 */
export async function withResolvedTenant<T>(
  hostname: string,
  operation: (tenant: TenantConfig | null) => T | Promise<T>,
): Promise<T> {
  if (isSingleTenant) {
    return operation(getSingleTenantConfig());
  }

  const loaded = await ensureTenantLoadedFromDb(hostname);
  return operation(loaded ? getStaleTenant(hostname) : null);
}

export interface ResolvedTenantPublicState {
  tenant: TenantPublicInfo;
  isActive: boolean;
  hasCriticalErrors: boolean;
}

/** Safe tenant state intended for layouts and other React Server Components. */
export function resolveTenantPublicState(
  hostname: string,
): Promise<ResolvedTenantPublicState | null> {
  return withResolvedTenant(hostname, (tenant) => {
    if (!tenant) return null;

    const critical = hasCriticalErrors(tenant);
    if (critical) {
      logTenantConfigIssues(tenant, `Tenant: ${tenant.id}`);
    }

    return {
      tenant: toPublicInfo(tenant),
      isActive: tenant.isActive,
      hasCriticalErrors: critical,
    };
  });
}

/**
 * Main tenant resolution function
 *
 * @param hostname - The request hostname (e.g., "tenant-b2b.vendereincloud.it")
 * @returns TenantConfig or null if not found
 */
export async function resolveTenant(
  hostname: string,
): Promise<TenantConfig | null> {
  // Single-tenant mode: always return .env config
  if (isSingleTenant) {
    return getSingleTenantConfig();
  }

  // Multi-tenant mode: look up from MongoDB
  return resolveTenantFromDb(hostname);
}

/**
 * Get tenant config for use in proxy routes
 * Extracts config from request headers (set by middleware)
 */
export function getTenantFromHeaders(
  headers: Headers,
): TenantRequestConfig | null {
  const tenantHeader = headers.get('x-tenant-config');
  if (!tenantHeader) return null;

  try {
    return JSON.parse(tenantHeader) as TenantRequestConfig;
  } catch {
    return null;
  }
}

/**
 * Get tenant config - unified function that works in both modes
 *
 * In single-tenant mode: returns config from .env
 * In multi-tenant mode: extracts config from request headers
 */
export function getTenantConfig(headers?: Headers): TenantRequestConfig {
  // Single-tenant mode: use .env
  if (isSingleTenant) {
    return toRequestConfig(getSingleTenantConfig());
  }

  // Multi-tenant mode: extract from headers
  if (headers) {
    const fromHeaders = getTenantFromHeaders(headers);
    if (fromHeaders) return fromHeaders;
  }

  // Fallback to .env (shouldn't happen in multi-tenant mode)
  console.warn(
    '[TenantService] No tenant in headers, falling back to .env config',
  );
  return toRequestConfig(getSingleTenantConfig());
}

/**
 * Clear tenant cache (useful for admin operations)
 */
export function clearTenantCache(hostname?: string): void {
  if (hostname) {
    tenantCache.delete(hostname);
  } else {
    tenantCache.clear();
  }
}

/**
 * Check if tenant mode is multi-tenant
 */
export { isMultiTenant, isSingleTenant };

// =============================================================================
// TENANT CONFIG VALIDATION
// =============================================================================

export interface TenantConfigError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validate tenant configuration for required fields
 * Returns list of configuration issues
 */
export function validateTenantConfig(
  tenant: TenantConfig,
): TenantConfigError[] {
  const errors: TenantConfigError[] = [];

  // Required fields
  if (!tenant.id) {
    errors.push({
      field: 'id',
      message: 'Tenant ID is missing',
      severity: 'error',
    });
  }
  if (!tenant.projectCode) {
    errors.push({
      field: 'projectCode',
      message: 'Project code is missing',
      severity: 'error',
    });
  }

  // API URLs
  if (!tenant.api.pimApiUrl) {
    errors.push({
      field: 'api.pimApiUrl',
      message: 'PIM API URL is missing',
      severity: 'error',
    });
  }
  if (!tenant.api.b2bApiUrl) {
    errors.push({
      field: 'api.b2bApiUrl',
      message: 'B2B API URL is missing',
      severity: 'error',
    });
  }

  // Warnings for optional but recommended fields
  if (!tenant.api.apiKeyId) {
    errors.push({
      field: 'api.apiKeyId',
      message: 'API Key ID is not configured',
      severity: 'warning',
    });
  }
  if (!tenant.api.apiSecret) {
    errors.push({
      field: 'api.apiSecret',
      message: 'API Secret is not configured',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Check if tenant config has critical errors
 */
export function hasCriticalErrors(tenant: TenantConfig): boolean {
  const errors = validateTenantConfig(tenant);
  return errors.some((e) => e.severity === 'error');
}

/**
 * Log tenant configuration issues
 */
export function logTenantConfigIssues(
  tenant: TenantConfig,
  context?: string,
): void {
  const errors = validateTenantConfig(tenant);
  if (errors.length === 0) return;

  const prefix = context ? `[${context}]` : '[TenantConfig]';

  errors.forEach((err) => {
    if (err.severity === 'error') {
      console.error(`${prefix} ERROR: ${err.field} - ${err.message}`);
    } else {
      console.warn(`${prefix} WARNING: ${err.field} - ${err.message}`);
    }
  });
}
