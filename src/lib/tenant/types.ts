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
 * Per-tenant feature flags. Each field is optional; unset means "fall back
 * to the env default". Keep this object small — it's serialized into the
 * client-side TenantPublicInfo.
 */
export interface TenantFeatures {
  /** Pricing data source. See `framework/basic-rest/pricing/pricing-source.ts`. */
  pricingSource?: 'inline' | 'erp' | 'hybrid';
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
  /** B2B storefront theme (e.g., "default", "time") */
  b2bTheme?: string;
  /** Support contact shown to users when their ERP/B2B profile is broken
   *  (email, phone, or URL). Optional. */
  supportContact?: string;
  /** Per-tenant feature flags. Hot-swappable from the tenant doc. */
  features?: TenantFeatures;
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
  b2bTheme?: string;
  supportContact?: string;
  /** Subset of feature flags safe to expose to the browser. */
  features?: TenantFeatures;
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
    b2bTheme: tenant.b2bTheme,
    supportContact: tenant.supportContact,
    features: tenant.features,
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
    projectCode: process.env.NEXT_PUBLIC_PROJECT_CODE || `vinc-${tenantId}`,
    domains: [],
    api: {
      pimApiUrl:
        process.env.PIM_API_URL || process.env.NEXT_PUBLIC_PIM_API_URL || '',
      b2bApiUrl:
        process.env.B2B_API_URL ||
        process.env.NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT ||
        '',
      apiKeyId:
        process.env.API_KEY_ID || process.env.NEXT_PUBLIC_API_KEY_ID || '',
      apiSecret:
        process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '',
    },
    database: {
      mongoUrl: process.env.MONGO_URL || '',
      mongoDb: process.env.MONGO_DB || `vinc-${tenantId}`,
    },
    requireLogin: process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true',
    homeSettingsCustomerId:
      process.env.NEXT_PUBLIC_HOME_SETTINGS_CUSTOMER_ID || 'default',
    builderUrl: process.env.NEXT_PUBLIC_B2B_BUILDER_URL || '',
    // Theme is part of the tenant config. In multi-tenant mode it comes
    // from the MongoDB tenant doc (b2b_theme). In single-tenant mode the
    // server-only B2B_THEME env var seeds it — we deliberately do NOT use
    // NEXT_PUBLIC_THEME so the value isn't bundled to the client and the
    // tenant context stays the single source of truth.
    b2bTheme: process.env.B2B_THEME || 'default',
    supportContact: process.env.NEXT_PUBLIC_SUPPORT_CONTACT || undefined,
    // Env doesn't drive features directly — the React hook reads
    // NEXT_PUBLIC_PRICING_SOURCE itself. Leaving features undefined here
    // means "no per-tenant override", so the env default applies.
    features: undefined,
    isActive: true,
  };
}
