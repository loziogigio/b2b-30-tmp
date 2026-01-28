/**
 * Auth Library - Client-safe exports
 *
 * Centralized authentication utilities for vinc-b2b.
 * This barrel file only exports client-safe code (no MongoDB/server imports).
 *
 * For server-only utilities (tenant resolution), use:
 *   import { resolveAuthContext } from '@/lib/auth/server';
 *
 * Usage:
 *   import { getAuthToken, refreshAccessToken, addAuthInterceptors } from '@/lib/auth';
 */

// Cookie management (client-safe)
export {
  AUTH_COOKIES,
  ALL_AUTH_COOKIES,
  getAuthToken,
  getRefreshToken,
  getTokenExpiresAt,
  hasAuthToken,
  setAuthTokensClient,
  clearAuthCookiesClient,
  clearAllCookiesClient,
} from './cookies';

// Token refresh (client-safe)
export {
  refreshAccessToken,
  dispatchSessionExpired,
  SESSION_EXPIRED_EVENT,
  REFRESH_BUFFER_MS,
  MIN_REFRESH_INTERVAL_MS,
  type RefreshResult,
} from './token-refresh';

// HTTP interceptors (client-safe)
export {
  addAuthInterceptors,
  addAuthRequestInterceptor,
} from './http-interceptor';

// Types (always safe)
export type {
  SSOUserProfile,
  SSOCustomer,
  SSOAddress,
  AuthTokens,
  LoginResponse,
  RefreshResponse,
  ValidateResponse,
} from './types';
