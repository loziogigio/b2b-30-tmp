/**
 * Token Refresh Utilities
 *
 * Centralizes token refresh logic used by:
 * - useAutoRefreshToken hook (proactive refresh)
 * - HTTP interceptors (reactive 401 handling)
 *
 * This ensures consistent behavior and eliminates code duplication.
 */

import { setAuthTokensClient } from './cookies';

// =============================================================================
// TYPES
// =============================================================================

export interface RefreshResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  /** HTTP status code from refresh endpoint (if failed) */
  status?: number;
}

// =============================================================================
// CORE REFRESH FUNCTION
// =============================================================================

/**
 * Refresh the access token using the refresh token.
 *
 * This is the single source of truth for token refresh logic.
 * Used by both proactive refresh (useAutoRefreshToken) and
 * reactive refresh (HTTP 401 interceptor).
 *
 * The server reads the refresh token from the httpOnly cookie,
 * so we don't need to send it from the client.
 *
 * @returns RefreshResult with new tokens on success, or error on failure.
 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  try {
    // Server will read refresh_token from httpOnly cookie
    // We send credentials: 'include' to ensure cookies are sent
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Refresh request failed with status ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();

    if (!data.success || !data.token) {
      return {
        success: false,
        error: data.message || 'Invalid refresh response',
      };
    }

    // Update cookies with new tokens
    setAuthTokensClient({
      accessToken: data.token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });

    return {
      success: true,
      token: data.token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// SESSION EXPIRED EVENT
// =============================================================================

/**
 * Custom event name for session expiration.
 * Components can listen for this to handle logout/redirect.
 */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

/**
 * Dispatch session expired event for app-level handling.
 * Components like AuthGuard listen for this to show login UI.
 *
 * @param reason - Reason for session expiration (for debugging/logging)
 */
export function dispatchSessionExpired(
  reason: string = 'token_refresh_failed',
): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { reason },
    }),
  );
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Refresh token 2 minutes before expiration */
export const REFRESH_BUFFER_MS = 2 * 60 * 1000;

/** Minimum interval between refresh attempts (prevent rapid retries) */
export const MIN_REFRESH_INTERVAL_MS = 30 * 1000;
