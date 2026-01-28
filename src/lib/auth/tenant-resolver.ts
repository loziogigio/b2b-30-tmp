/**
 * Tenant and Auth Context Resolver
 *
 * Centralizes tenant resolution logic used across all auth API routes.
 * Eliminates duplication of tenant/SSO URL resolution code.
 *
 * URL Resolution Priority (multi-tenant mode):
 * 1. SSO_API_URL_OVERRIDE (local dev only, set in .env.local)
 * 2. tenant.api.pimApiUrl (from MongoDB tenant config)
 * 3. SSO_API_URL / PIM_API_URL (fallback from .env)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isMultiTenant, TenantConfig } from '@/lib/tenant';
import { getSsoApiForTenant, SSOApiClient } from '@/lib/sso-api';

/**
 * Resolved auth context for API routes
 */
export interface ResolvedAuthContext {
  /** Tenant ID (e.g., "tenant-a") */
  tenantId: string;
  /** SSO API URL to use for this request */
  ssoApiUrl: string;
  /** Pre-configured SSO API client */
  ssoApi: SSOApiClient;
  /** Full tenant config (only in multi-tenant mode) */
  tenant?: TenantConfig;
}

/**
 * Result of tenant resolution
 */
export type TenantResolveResult =
  | { success: true; context: ResolvedAuthContext }
  | { success: false; response: NextResponse };

/**
 * Get SSO API URL with consistent priority.
 * Priority: SSO_API_URL > NEXT_PUBLIC_SSO_URL
 */
export function getDefaultSsoApiUrl(): string {
  return (
    process.env.SSO_API_URL || process.env.NEXT_PUBLIC_SSO_URL || ''
  );
}

/**
 * Extract hostname from request headers.
 * Checks x-tenant-hostname (set by middleware) first, then host header.
 */
export function getHostnameFromRequest(request: NextRequest): string {
  return (
    request.headers.get('x-tenant-hostname') ||
    request.headers.get('host') ||
    'localhost'
  );
}

/**
 * Resolve auth context from request.
 *
 * Use in API routes to avoid duplicating tenant resolution logic.
 * Returns tenant ID, SSO API URL, and a pre-configured SSO client.
 *
 * @param request - The incoming NextRequest
 * @param routeName - Name of the route (for logging)
 * @returns Success with context, or failure with error response
 *
 * @example
 * ```typescript
 * const result = await resolveAuthContext(request, 'login');
 * if (!result.success) return result.response;
 * const { tenantId, ssoApi } = result.context;
 * ```
 */
export async function resolveAuthContext(
  request: NextRequest,
  routeName: string,
): Promise<TenantResolveResult> {
  // Default values from .env (used in single-tenant mode or as fallback)
  let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
  let ssoApiUrl = getDefaultSsoApiUrl();
  let tenant: TenantConfig | undefined;

  // Multi-tenant mode: resolve from MongoDB via hostname
  if (isMultiTenant) {
    const hostname = getHostnameFromRequest(request);
    const resolvedTenant = await resolveTenant(hostname);

    if (!resolvedTenant) {
      console.error(`[${routeName}] Tenant not found for hostname:`, hostname);
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        ),
      };
    }

    tenantId = resolvedTenant.id;
    tenant = resolvedTenant;

    // URL priority: Override > MongoDB tenant config > .env fallback
    ssoApiUrl =
      process.env.SSO_API_URL_OVERRIDE ||
      resolvedTenant.api.pimApiUrl ||
      getDefaultSsoApiUrl();
  }

  // Create pre-configured SSO API client
  const ssoApi = getSsoApiForTenant({ tenantId, ssoApiUrl });

  return {
    success: true,
    context: {
      tenantId,
      ssoApiUrl,
      ssoApi,
      tenant,
    },
  };
}

/**
 * Simple tenant resolution without SSO client creation.
 * Use when you only need tenant info, not the SSO client.
 */
export async function resolveTenantContext(
  request: NextRequest,
  routeName: string,
): Promise<
  | { success: true; tenantId: string; tenant?: TenantConfig }
  | { success: false; response: NextResponse }
> {
  let tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
  let tenant: TenantConfig | undefined;

  if (isMultiTenant) {
    const hostname = getHostnameFromRequest(request);
    const resolvedTenant = await resolveTenant(hostname);

    if (!resolvedTenant) {
      console.error(`[${routeName}] Tenant not found for hostname:`, hostname);
      return {
        success: false,
        response: NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        ),
      };
    }

    tenantId = resolvedTenant.id;
    tenant = resolvedTenant;
  }

  return { success: true, tenantId, tenant };
}
