/**
 * Tenant Configuration Types
 *
 * Defines the structure of tenant configuration stored in MongoDB
 * and used throughout the application.
 */

/**
 * Domain configuration for a tenant
 */
export interface TenantDomain {
  /** The domain (e.g., "tenant-a.example.com" or "custom-domain.com") */
  hostname: string;
  /** Whether this is the primary domain for the tenant */
  isPrimary?: boolean;
  /** Whether this domain is active */
  isActive?: boolean;
}

/**
 * API configuration for a tenant
 */
export interface TenantApiConfig {
  /** PIM API base URL */
  pimApiUrl: string;
  /** B2B API base URL */
  b2bApiUrl: string;
  /** API Key ID for authentication */
  apiKeyId: string;
  /** API Secret for authentication */
  apiSecret: string;
}

/**
 * Database configuration for a tenant
 */
export interface TenantDbConfig {
  /** MongoDB connection URL */
  mongoUrl: string;
  /** Database name for this tenant */
  mongoDb: string;
}

/**
 * Full tenant configuration as stored in MongoDB
 */
export interface TenantConfig {
  /** Unique tenant identifier (e.g., "tenant-a", "tenant-b") */
  id: string;
  /** Human-readable tenant name */
  name: string;
  /** Project code used in various places (e.g., "vinc-tenant-a") */
  projectCode: string;
  /** List of domains associated with this tenant */
  domains: TenantDomain[];
  /** API configuration */
  api: TenantApiConfig;
  /** Database configuration */
  database: TenantDbConfig;
  /** Whether login is required to view any page */
  requireLogin?: boolean;
  /** Home settings customer ID */
  homeSettingsCustomerId?: string;
  /** Builder/preview URL */
  builderUrl?: string;
  /** Whether this tenant is active */
  isActive: boolean;
  /** Timestamps */
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Tenant config passed through request headers (serializable subset)
 * Used by proxy routes to configure API calls
 */
export interface TenantRequestConfig {
  id: string;
  projectCode: string;
  pimApiUrl: string;
  b2bApiUrl: string;
  apiKeyId: string;
  apiSecret: string;
  mongoUrl: string;
  mongoDb: string;
}

/**
 * Public tenant info exposed to client-side code
 * Does NOT include sensitive credentials
 */
export interface TenantPublicInfo {
  id: string;
  name: string;
  projectCode: string;
  requireLogin?: boolean;
  builderUrl?: string;
}

/**
 * Convert full tenant config to request config (for headers)
 */
export function toRequestConfig(tenant: TenantConfig): TenantRequestConfig {
  return {
    id: tenant.id,
    projectCode: tenant.projectCode,
    pimApiUrl: tenant.api.pimApiUrl,
    b2bApiUrl: tenant.api.b2bApiUrl,
    apiKeyId: tenant.api.apiKeyId,
    apiSecret: tenant.api.apiSecret,
    mongoUrl: tenant.database.mongoUrl,
    mongoDb: tenant.database.mongoDb,
  };
}

/**
 * Convert full tenant config to public info (safe for client)
 */
export function toPublicInfo(tenant: TenantConfig): TenantPublicInfo {
  return {
    id: tenant.id,
    name: tenant.name,
    projectCode: tenant.projectCode,
    requireLogin: tenant.requireLogin,
    builderUrl: tenant.builderUrl,
  };
}

/**
 * Build tenant config from environment variables (single-tenant mode)
 */
export function buildTenantFromEnv(): TenantConfig {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';

  return {
    id: tenantId,
    name: tenantId,
    projectCode:
      process.env.NEXT_PUBLIC_PROJECT_CODE || `vinc-${tenantId}`,
    domains: [],
    api: {
      pimApiUrl:
        process.env.PIM_API_URL ||
        process.env.NEXT_PUBLIC_PIM_API_URL ||
        'http://localhost:3001',
      b2bApiUrl:
        process.env.B2B_API_URL ||
        process.env.NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT ||
        'http://localhost:8000/api/v1',
      apiKeyId:
        process.env.API_KEY_ID ||
        process.env.NEXT_PUBLIC_API_KEY_ID ||
        '',
      apiSecret:
        process.env.API_SECRET ||
        process.env.NEXT_PUBLIC_API_SECRET ||
        '',
    },
    database: {
      mongoUrl: process.env.MONGO_URL || '',
      mongoDb: process.env.MONGO_DB || `vinc-${tenantId}`,
    },
    requireLogin: process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true',
    homeSettingsCustomerId:
      process.env.NEXT_PUBLIC_HOME_SETTINGS_CUSTOMER_ID || 'default',
    builderUrl: process.env.NEXT_PUBLIC_B2B_BUILDER_URL || '',
    isActive: true,
  };
}
