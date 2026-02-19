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
  TenantRequestConfig,
  buildTenantFromEnv,
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
  status: string;
}

/**
 * Convert MongoDB document (snake_case) to TenantConfig (camelCase)
 */
function fromDocument(doc: TenantDocument): TenantConfig {
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
    tenantCache.delete(hostname);
    return null;
  }
  return entry.tenant;
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

  registryClient = new MongoClient(mongoUrl, {
    minPoolSize: 1,
    maxPoolSize: 5,
  });

  await registryClient.connect();
  registryDb = registryClient.db(dbName);

  return registryDb;
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
async function resolveTenantFromDb(
  hostname: string,
): Promise<TenantConfig | null> {
  // Check cache first
  const cached = getCachedTenant(hostname);
  if (cached) return cached;

  try {
    const db = await getRegistryDb();
    const tenantsCollection = db.collection<TenantDocument>('tenants');

    // Build all hostname variations to search for
    const variations = buildHostnameVariations(hostname);

    // Look up tenant by any hostname variation
    const doc = await tenantsCollection.findOne({
      'domains.hostname': { $in: variations },
      'domains.is_active': { $ne: false },
      status: 'active',
    });

    if (doc) {
      console.log('[TenantService] Found tenant document:', {
        tenant_id: doc.tenant_id,
        require_login: doc.require_login,
        status: doc.status,
      });
      const tenant = fromDocument(doc);
      console.log('[TenantService] Converted tenant config:', {
        id: tenant.id,
        requireLogin: tenant.requireLogin,
        isActive: tenant.isActive,
      });
      setCachedTenant(hostname, tenant);
      return tenant;
    }

    // Try matching subdomain pattern (e.g., "tenant-b2b" from "tenant-b2b.vendereincloud.it")
    const normalizedHostname = hostname.toLowerCase().split(':')[0];
    const subdomain = normalizedHostname.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      const docBySubdomain = await tenantsCollection.findOne({
        tenant_id: subdomain,
        status: 'active',
      });

      if (docBySubdomain) {
        const tenant = fromDocument(docBySubdomain);
        setCachedTenant(hostname, tenant);
        return tenant;
      }
    }

    console.warn(`[TenantService] No tenant found for hostname: ${hostname}`);
    return null;
  } catch (error) {
    console.error('[TenantService] Error resolving tenant:', error);
    return null;
  }
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
