/**
 * Tenant Module
 *
 * Provides multi-tenant support for the application.
 *
 * Usage:
 *   import { resolveTenant, getTenantConfig, isMultiTenant } from '@/lib/tenant';
 *
 * Configuration:
 *   Set TENANT_MODE=single or TENANT_MODE=multi in .env
 */

export * from './config';
export * from './types';
export * from './service';
