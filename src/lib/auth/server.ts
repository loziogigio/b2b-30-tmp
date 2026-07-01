/**
 * Auth Library - Server-only exports
 *
 * These utilities use MongoDB and can only be used in:
 * - API routes
 * - Server components
 * - getServerSideProps
 *
 * Usage:
 *   import { resolveAuthContext, clearAuthCookiesServer } from '@/lib/auth/server';
 */

// Tenant resolution (server-only - uses MongoDB)
export {
  resolveAuthContext,
  resolveTenantContext,
  getDefaultSsoApiUrl,
  getHostnameFromRequest,
  getPublicOrigin,
  type ResolvedAuthContext,
  type TenantResolveResult,
} from './tenant-resolver';

// Server-side cookie utilities (uses NextResponse)
export {
  AUTH_COOKIES,
  AUTH_COOKIE_MAX_AGE_SECONDS,
  clearAuthCookiesServer,
  expireAuthCookieServer,
  authCookieOptions,
  setAuthTokensServer,
  OAUTH_CONFIG,
} from './cookies';
