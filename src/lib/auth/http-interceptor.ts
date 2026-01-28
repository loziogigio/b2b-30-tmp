/**
 * HTTP Auth Interceptors
 *
 * Provides reusable Axios interceptors for:
 * - Adding Authorization header to requests
 * - Handling 401 errors with automatic token refresh
 * - Queue management for concurrent requests during refresh
 *
 * Use addAuthInterceptors() to add these to any Axios instance.
 */

import { AxiosError, InternalAxiosRequestConfig, AxiosInstance } from 'axios';
import {
  getAuthToken,
  clearAuthCookiesClient,
  getRefreshToken,
} from './cookies';
import { refreshAccessToken, dispatchSessionExpired } from './token-refresh';

// =============================================================================
// REFRESH STATE (shared across all HTTP clients)
// =============================================================================

/**
 * Track if we're currently refreshing to avoid multiple refresh calls.
 * Shared across all HTTP clients using these interceptors.
 */
let isRefreshing = false;

/**
 * Queue of requests waiting for token refresh to complete.
 */
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Process all queued requests after refresh completes.
 */
function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// =============================================================================
// AUTH FAILURE HANDLER
// =============================================================================

/**
 * Handle authentication failure - clear cookies and dispatch event.
 */
function handleAuthFailure(): void {
  clearAuthCookiesClient();
  dispatchSessionExpired('token_refresh_failed');
}

// =============================================================================
// MAIN INTERCEPTOR FUNCTION
// =============================================================================

/**
 * Add authentication interceptors to an Axios instance.
 *
 * Includes:
 * - Request interceptor: adds Authorization header from cookie
 * - Response interceptor: handles 401 with automatic token refresh
 *
 * @param http - The Axios instance to add interceptors to
 *
 * @example
 * ```typescript
 * import axios from 'axios';
 * import { addAuthInterceptors } from '@/lib/auth';
 *
 * const http = axios.create({ baseURL: '/api' });
 * addAuthInterceptors(http);
 * ```
 */
export function addAuthInterceptors(http: AxiosInstance): void {
  // Request interceptor - add Authorization header
  http.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor - handle 401 with token refresh
  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Only handle 401 errors on client-side
      if (
        error.response?.status !== 401 ||
        originalRequest._retry ||
        typeof window === 'undefined'
      ) {
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Start refreshing
      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        handleAuthFailure();
        return Promise.reject(error);
      }

      try {
        const result = await refreshAccessToken(refreshToken);

        if (result.success && result.token) {
          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${result.token}`;
          processQueue(null, result.token);
          return http(originalRequest);
        } else {
          throw new Error(result.error || 'Refresh failed');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}

/**
 * Add only the request interceptor (for auth header injection).
 * Use when you don't need 401 handling (e.g., server-side calls).
 */
export function addAuthRequestInterceptor(http: AxiosInstance): void {
  http.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );
}
