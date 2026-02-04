/**
 * Tenant and Auth Context Resolver
 *
 * Centralizes tenant resolution logic used across all auth API routes.
 * Eliminates duplication of tenant/SSO URL resolution code.
 *
 * URL Resolution Priority:
 * 1. SSO_API_URL_OVERRIDE (local dev only, set in .env.local)
 * 2. NEXT_PUBLIC_SSO_URL (production SSO URL from .env)
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
  return process.env.SSO_API_URL || process.env.NEXT_PUBLIC_SSO_URL || '';
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
 * Get public origin from forwarded headers (for Docker/proxy environments).
 * Falls back to request.nextUrl.origin if no forwarded headers.
 *
 * In Docker with reverse proxy:
 * - Internal: Container runs on 0.0.0.0:3000
 * - External: Accessed via https://tenant.vendereincloud.it
 * - Proxy sets x-forwarded-host and x-forwarded-proto headers
 */
export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  if (host && !host.includes('0.0.0.0') && !host.includes('127.0.0.1')) {
    return `${forwardedProto}://${host}`;
  }
  return request.nextUrl.origin;
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

    // SSO_API_URL_OVERRIDE for local dev, otherwise use NEXT_PUBLIC_SSO_URL
    // Note: Don't use tenant.api.pimApiUrl - it may have localhost for dev
    ssoApiUrl = process.env.SSO_API_URL_OVERRIDE || ssoApiUrl;
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
