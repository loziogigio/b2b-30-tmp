/**
 * Centralized Cookie Management for Authentication
 *
 * Single source of truth for all auth-related cookie names and operations.
 * Provides both client-side (js-cookie) and server-side (NextResponse) utilities.
 */

import Cookies from 'js-cookie';
import { NextResponse } from 'next/server';

// =============================================================================
// COOKIE NAME CONSTANTS - Single source of truth
// =============================================================================

/**
 * All authentication-related cookie names.
 * Use these constants instead of hardcoded strings.
 */
export const AUTH_COOKIES = {
  /** JWT access token for API calls */
  ACCESS_TOKEN: 'auth_token',
  /** JWT refresh token for token renewal */
  REFRESH_TOKEN: 'refresh_token',
  /** Timestamp when access token expires (ms since epoch) */
  TOKEN_EXPIRES_AT: 'auth_token_expires_at',
  /** Session ID from SSO */
  SESSION_ID: 'session_id',
  /** VINC API access token (for change-password) */
  VINC_ACCESS_TOKEN: 'vinc_access_token',
  /** User profile JSON (short-lived, for bootstrap) */
  SSO_USER_PROFILE: 'sso_user_profile',
  /** Flag indicating profile needs to be fetched */
  SSO_PROFILE_PENDING: 'sso_profile_pending',
  /** Tenant ID for multi-tenant mode */
  SSO_TENANT_ID: 'sso_tenant_id',
} as const;

/** All auth cookies that should be cleared on logout */
export const ALL_AUTH_COOKIES = Object.values(AUTH_COOKIES);

// =============================================================================
// OAUTH CONFIGURATION - Single source of truth for OAuth client credentials
// =============================================================================

/**
 * OAuth client credentials from environment.
 * Used for authorization code exchange and token refresh.
 */
export const OAUTH_CONFIG = {
  CLIENT_ID: process.env.SSO_CLIENT_ID || 'vinc-b2b',
  CLIENT_SECRET: process.env.SSO_CLIENT_SECRET || '',
} as const;

// =============================================================================
// CLIENT-SIDE COOKIE OPERATIONS (using js-cookie)
// =============================================================================

/**
 * Get the current auth token (client-side).
 * Returns null if on server or token not set.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get(AUTH_COOKIES.ACCESS_TOKEN) || null;
}

/**
 * Get the refresh token (client-side).
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get(AUTH_COOKIES.REFRESH_TOKEN) || null;
}

/**
 * Get token expiration timestamp (client-side).
 * Returns milliseconds since epoch, or null if not set.
 */
export function getTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;
  const value = Cookies.get(AUTH_COOKIES.TOKEN_EXPIRES_AT);
  return value ? parseInt(value, 10) : null;
}

/**
 * Check if the auth token exists (client-side).
 */
export function hasAuthToken(): boolean {
  return getAuthToken() !== null;
}

/**
 * Set auth tokens in cookies (client-side).
 * Call this after successful login or token refresh.
 */
export function setAuthTokensClient(tokens: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}): void {
  if (typeof window === 'undefined') return;

  Cookies.set(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken);

  if (tokens.refreshToken) {
    Cookies.set(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken);
  }

  if (tokens.expiresIn) {
    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    Cookies.set(AUTH_COOKIES.TOKEN_EXPIRES_AT, String(expiresAt));
  }
}

/**
 * Delete a single cookie with robust clearing.
 * Uses multiple strategies to ensure cookie is deleted regardless of how it was set.
 */
function deleteCookieClient(name: string): void {
  // Strategy 1: js-cookie with path
  Cookies.remove(name, { path: '/' });
  // Strategy 2: raw document.cookie for edge cases
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Clear all authentication cookies (client-side).
 * Call this on logout.
 */
export function clearAuthCookiesClient(): void {
  if (typeof window === 'undefined') return;

  ALL_AUTH_COOKIES.forEach((name) => {
    deleteCookieClient(name);
  });
}

/**
 * Clear ALL cookies (client-side).
 * Use with caution - clears everything, not just auth cookies.
 */
export function clearAllCookiesClient(): void {
  if (typeof window === 'undefined') return;

  const allCookies = Cookies.get();
  for (const name of Object.keys(allCookies)) {
    deleteCookieClient(name);
  }
}

// =============================================================================
// SERVER-SIDE COOKIE OPERATIONS (using NextResponse)
// =============================================================================

/**
 * Clear all authentication cookies on a NextResponse (server-side).
 * Use this in API routes like /api/auth/logout.
 */
export function clearAuthCookiesServer(response: NextResponse): void {
  const expiredCookieOptions = {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };

  ALL_AUTH_COOKIES.forEach((name) => {
    response.cookies.set(name, '', expiredCookieOptions);
  });
}

/**
 * Set auth tokens on a NextResponse (server-side).
 * Use this in API routes like /api/auth/callback.
 */
export function setAuthTokensServer(
  response: NextResponse,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    sessionId?: string;
  },
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token - httpOnly: false so client JS can read it
  response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, {
    path: '/',
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: tokens.expiresIn || 3600,
  });

  // Expiration timestamp for auto-refresh scheduling
  if (tokens.expiresIn) {
    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    response.cookies.set(AUTH_COOKIES.TOKEN_EXPIRES_AT, String(expiresAt), {
      path: '/',
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
    });
  }

  // Refresh token - httpOnly: true for security
  if (tokens.refreshToken) {
    response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  // Session ID
  if (tokens.sessionId) {
    response.cookies.set(AUTH_COOKIES.SESSION_ID, tokens.sessionId, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
}
