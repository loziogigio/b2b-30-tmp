/**
 * SSO API Client
 *
 * Client for calling Commerce Suite SSO API from vinc-b2b.
 *
 * Setup:
 * 1. Add to .env:
 *    SSO_API_URL=http://localhost:3001
 *    # Or use PIM_API_URL if SSO is served from Commerce Suite
 *    PIM_API_URL=http://localhost:3001
 *
 * 2. Use in code:
 *    import { ssoApi, getSsoApiForTenant } from '@/lib/sso-api';
 *
 *    // Login
 *    const result = await ssoApi.login({
 *      email: 'user@example.com',
 *      password: 'password123',
 *      tenant_id: 'tenant-id',
 *    });
 *
 *    // Validate token
 *    const validation = await ssoApi.validate(accessToken);
 *
 *    // Refresh token
 *    const newTokens = await ssoApi.refresh(refreshToken);
 *
 *    // Get B2B addresses
 *    const addresses = await ssoApi.getAddresses('customer-id', 'tenant-id');
 */

export {
  ssoApi,
  getSsoApi,
  getSsoApiForTenant,
  SSOApiClient,
  SSOApiError,
} from './client';

export {
  getSSOLoginUrl,
  getSSOLogoutUrl,
  getClientSSOLoginUrl,
} from './redirect';

export type { SSOApiConfig, TenantSsoConfig } from './client';
export type { SSORedirectParams } from './redirect';
export type * from './types';
