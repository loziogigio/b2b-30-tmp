'use client';

import { useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';

// Refresh token 2 minutes before expiration
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
// Minimum interval between refresh attempts
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

/**
 * Hook to automatically refresh the auth token before it expires.
 * This prevents 401 errors by proactively refreshing the token.
 */
export function useAutoRefreshToken() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshAttemptRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const refreshToken = useCallback(async () => {
    // Prevent rapid refresh attempts
    const now = Date.now();
    if (now - lastRefreshAttemptRef.current < MIN_REFRESH_INTERVAL_MS) {
      return;
    }
    lastRefreshAttemptRef.current = now;

    const refreshTokenCookie = Cookies.get('refresh_token');
    if (!refreshTokenCookie) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AutoRefresh] No refresh token available');
      }
      return;
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AutoRefresh] Proactively refreshing token...');
      }
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenCookie }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();

      if (data.success && data.token) {
        // Update cookies with new tokens
        Cookies.set('auth_token', data.token);
        if (data.refresh_token) {
          Cookies.set('refresh_token', data.refresh_token);
        }
        // Update expiration timestamp
        if (data.expires_in) {
          const expiresAt = Date.now() + data.expires_in * 1000;
          Cookies.set('auth_token_expires_at', String(expiresAt));
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoRefresh] Token refreshed successfully');
        }
      }
    } catch (error) {
      console.error('[AutoRefresh] Failed to refresh token:', error);
      // Don't dispatch session-expired here - let the 401 interceptor handle it
    }
  }, []);

  const scheduleNextRefresh = useCallback(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    const expiresAtStr = Cookies.get('auth_token_expires_at');
    if (!expiresAtStr) {
      return;
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt)) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const timeUntilRefresh = timeUntilExpiry - REFRESH_BUFFER_MS;

    if (timeUntilRefresh <= 0) {
      // Token is about to expire or already expired - refresh immediately
      refreshToken().then(() => {
        if (isMountedRef.current) scheduleNextRefresh();
      });
    } else {
      // Schedule refresh for later
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[AutoRefresh] Scheduling refresh in ${Math.round(timeUntilRefresh / 1000)}s`,
        );
      }
      refreshTimeoutRef.current = setTimeout(() => {
        refreshToken().then(() => {
          if (isMountedRef.current) scheduleNextRefresh();
        });
      }, timeUntilRefresh);
    }
  }, [refreshToken]);

  useEffect(() => {
    // Check if we have a token
    const authToken = Cookies.get('auth_token');
    if (!authToken) {
      return;
    }

    // Schedule the first refresh
    scheduleNextRefresh();

    // Also reschedule when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleNextRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scheduleNextRefresh]);
}
