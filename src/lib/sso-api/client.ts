/**
 * SSO API Client
 *
 * Client for calling Commerce Suite SSO API from vinc-b2b.
 * The SSO API handles authentication, session management, and proxies to VINC API.
 *
 * Usage:
 *   import { ssoApi, getSsoApiForTenant } from '@/lib/sso-api';
 *
 *   // Login
 *   const result = await ssoApi.login({ email, password, tenant_id });
 *
 *   // Validate token
 *   const valid = await ssoApi.validate(accessToken);
 *
 *   // Get addresses
 *   const addresses = await ssoApi.getAddresses(customerId, tenantId);
 */

import type {
  SSOLoginResponse,
  SSOValidateResponse,
  SSORefreshResponse,
  SSOLogoutResponse,
  SSOChangePasswordResponse,
  SSOResetPasswordResponse,
  B2BAddressesResponse,
} from './types';

export class SSOApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public lockoutUntil?: string,
    public attemptsRemaining?: number,
  ) {
    super(detail);
    this.name = 'SSOApiError';
  }
}

interface SSOApiConfig {
  baseUrl: string;
  tenantId?: string;
}

class SSOApiClient {
  private config: SSOApiConfig;

  constructor(config: SSOApiConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.tenantId && { 'X-Tenant-ID': this.config.tenantId }),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      let lockoutUntil: string | undefined;
      let attemptsRemaining: number | undefined;

      try {
        const error = await response.json();
        detail = error.error || error.detail || error.message || detail;
        lockoutUntil = error.lockout_until;
        attemptsRemaining = error.attempts_remaining;
      } catch {
        // ignore parse error
      }

      throw new SSOApiError(
        response.status,
        detail,
        lockoutUntil,
        attemptsRemaining,
      );
    }

    return response.json();
  }

  // ==========================================================================
  // AUTH
  // ==========================================================================

  /**
   * Login with email and password
   * Returns SSO tokens, user profile, and VINC tokens
   */
  async login(params: {
    email: string;
    password: string;
    tenant_id: string;
  }): Promise<SSOLoginResponse> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Validate an access token
   */
  async validate(accessToken: string): Promise<SSOValidateResponse> {
    return this.request('/api/auth/validate', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Refresh an expired access token
   */
  async refresh(refreshToken: string): Promise<SSORefreshResponse> {
    return this.request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  /**
   * Logout and end session
   */
  async logout(
    accessToken: string,
    options?: {
      session_id?: string;
      all_sessions?: boolean;
      redirect_uri?: string;
    },
  ): Promise<SSOLogoutResponse> {
    return this.request('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: options ? JSON.stringify(options) : undefined,
    });
  }

  /**
   * Change password for authenticated user
   * Email is extracted from the access token by the SSO API
   */
  async changePassword(params: {
    accessToken: string;
    currentPassword: string;
    password: string;
  }): Promise<SSOChangePasswordResponse> {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: params.currentPassword,
        password: params.password,
      }),
    });
  }

  /**
   * Reset password by email (forgot password flow)
   */
  async resetPassword(params: {
    email: string;
    tenant_id: string;
    password?: string;
    ragioneSociale?: string;
    contactName?: string;
  }): Promise<SSOResetPasswordResponse> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ==========================================================================
  // B2B
  // ==========================================================================

  /**
   * Get customer shipping addresses
   */
  async getAddresses(
    customerId: string,
    tenantId: string,
  ): Promise<B2BAddressesResponse> {
    return this.request('/api/b2b/addresses', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        tenant_id: tenantId,
      }),
    });
  }
}

// =============================================================================
// SINGLETON & FACTORY
// =============================================================================

let _instance: SSOApiClient | null = null;

const TENANT_MODE = process.env.TENANT_MODE || 'single';
const isMultiTenant = TENANT_MODE === 'multi';

/**
 * Get the SSO API client instance (single-tenant mode)
 */
export function getSsoApi(): SSOApiClient {
  if (isMultiTenant) {
    console.warn(
      '[SsoApi] getSsoApi() called in multi-tenant mode. Use getSsoApiForTenant() instead.',
    );
  }

  if (!_instance) {
    const baseUrl = process.env.SSO_API_URL || process.env.PIM_API_URL;
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!baseUrl) {
      throw new Error(
        'SSO_API_URL or PIM_API_URL environment variable is required',
      );
    }

    _instance = new SSOApiClient({
      baseUrl,
      tenantId,
    });
  }

  return _instance;
}

/**
 * Configuration for multi-tenant SSO API client
 */
export interface TenantSsoConfig {
  tenantId: string;
  ssoApiUrl?: string;
}

/**
 * Get SSO API client for a specific tenant (multi-tenant mode)
 */
export function getSsoApiForTenant(
  tenantConfig: TenantSsoConfig,
): SSOApiClient {
  const baseUrl =
    tenantConfig.ssoApiUrl ||
    process.env.SSO_API_URL ||
    process.env.PIM_API_URL;

  if (!baseUrl) {
    console.error(
      '[SsoApi] Missing SSO_API_URL for tenant:',
      tenantConfig.tenantId,
    );
    throw new Error('SSO_API_URL is required');
  }

  return new SSOApiClient({
    baseUrl,
    tenantId: tenantConfig.tenantId,
  });
}

/**
 * Convenience export for direct usage
 */
export const ssoApi = {
  login: (params: { email: string; password: string; tenant_id: string }) =>
    getSsoApi().login(params),

  validate: (accessToken: string) => getSsoApi().validate(accessToken),

  refresh: (refreshToken: string) => getSsoApi().refresh(refreshToken),

  logout: (
    accessToken: string,
    options?: {
      session_id?: string;
      all_sessions?: boolean;
      redirect_uri?: string;
    },
  ) => getSsoApi().logout(accessToken, options),

  changePassword: (params: {
    accessToken: string;
    currentPassword: string;
    password: string;
  }) => getSsoApi().changePassword(params),

  resetPassword: (params: {
    email: string;
    tenant_id: string;
    password?: string;
    ragioneSociale?: string;
    contactName?: string;
  }) => getSsoApi().resetPassword(params),

  getAddresses: (customerId: string, tenantId: string) =>
    getSsoApi().getAddresses(customerId, tenantId),
};

export { SSOApiClient };
export type { SSOApiConfig };
