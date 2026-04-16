'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  getAuthToken,
  getTokenExpiresAt,
  refreshAccessToken,
  clearAuthCookiesClient,
  dispatchSessionExpired,
  REFRESH_BUFFER_MS,
  MIN_REFRESH_INTERVAL_MS,
} from '@/lib/auth';

/**
 * Hook to automatically refresh the auth token before it expires.
 * This prevents 401 errors by proactively refreshing the token.
 */
export function useAutoRefreshToken() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshAttemptRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const doRefresh = useCallback(async (): Promise<boolean> => {
    // Prevent rapid refresh attempts
    const now = Date.now();
    if (now - lastRefreshAttemptRef.current < MIN_REFRESH_INTERVAL_MS) {
      return true; // Skip but allow rescheduling
    }
    lastRefreshAttemptRef.current = now;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AutoRefresh] Proactively refreshing token...');
      }
      const result = await refreshAccessToken();

      if (result.success) {
        consecutiveFailuresRef.current = 0;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoRefresh] Token refreshed successfully');
        }
        return true;
      }

      // Refresh token is expired/invalid — session is over.
      // Clear cookies and dispatch immediately instead of waiting
      // for API calls to fail with 401 one by one.
      if (result.status === 401) {
        console.log(
          '[AutoRefresh] Refresh token expired (401), ending session',
        );
        clearAuthCookiesClient();
        dispatchSessionExpired('refresh_token_expired');
        return false; // Stop rescheduling
      }

      consecutiveFailuresRef.current += 1;
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[AutoRefresh] Token refresh failed (attempt ${consecutiveFailuresRef.current}):`,
          result.error,
        );
      }
      return true; // Non-401 failure — allow retry later with backoff
    } catch (error) {
      consecutiveFailuresRef.current += 1;
      console.error(
        `[AutoRefresh] Failed to refresh token (attempt ${consecutiveFailuresRef.current}):`,
        error,
      );
      return true; // Network error — allow retry later with backoff
    }
  }, []);

  const scheduleNextRefresh = useCallback(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    const expiresAt = getTokenExpiresAt();
    if (!expiresAt) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const timeUntilRefresh = timeUntilExpiry - REFRESH_BUFFER_MS;

    // Exponential backoff on consecutive failures: 30s, 60s, 120s, max 5min
    const failures = consecutiveFailuresRef.current;
    const backoffMs =
      failures > 0
        ? Math.min(
            MIN_REFRESH_INTERVAL_MS * Math.pow(2, failures - 1),
            5 * 60 * 1000,
          )
        : 0;

    if (timeUntilRefresh <= 0) {
      // Token is about to expire or already expired
      const delay = Math.max(backoffMs, 0);
      if (delay > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[AutoRefresh] Backing off ${Math.round(delay / 1000)}s after ${failures} failures`,
          );
        }
        refreshTimeoutRef.current = setTimeout(() => {
          doRefresh().then((shouldContinue) => {
            if (shouldContinue && isMountedRef.current) scheduleNextRefresh();
          });
        }, delay);
      } else {
        doRefresh().then((shouldContinue) => {
          if (shouldContinue && isMountedRef.current) scheduleNextRefresh();
        });
      }
    } else {
      // Schedule refresh for later
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[AutoRefresh] Scheduling refresh in ${Math.round(timeUntilRefresh / 1000)}s`,
        );
      }
      refreshTimeoutRef.current = setTimeout(() => {
        doRefresh().then((shouldContinue) => {
          if (shouldContinue && isMountedRef.current) scheduleNextRefresh();
        });
      }, timeUntilRefresh);
    }
  }, [doRefresh]);

  useEffect(() => {
    // Check if we have a token
    const authToken = getAuthToken();
    if (!authToken) {
      return;
    }

    // Schedule the first refresh
    scheduleNextRefresh();

    // Reschedule when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleNextRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // When coming back online after network loss, retry immediately
    const handleOnline = () => {
      if (isMountedRef.current) {
        consecutiveFailuresRef.current = 0;
        scheduleNextRefresh();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [scheduleNextRefresh]);
}
