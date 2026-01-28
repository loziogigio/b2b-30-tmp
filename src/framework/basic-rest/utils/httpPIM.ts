import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { getToken } from './get-token';

/**
 * Get base URL for API proxy
 * - Client-side: use relative URL
 * - Server-side: use full URL with localhost
 */
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: relative URL works
    return '/api/proxy/pim/';
  }
  // Server-side: need full URL
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}/api/proxy/pim/`;
};

/**
 * HTTP client for PIM API calls.
 * Routes through /api/proxy/pim which injects API credentials server-side.
 * This keeps API_KEY_ID and API_SECRET off the client bundle.
 */
const http = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add Authorization header from SSO token
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 errors with automatic token refresh
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only handle 401 errors on client-side
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== 'undefined'
    ) {
      if (isRefreshing) {
        // Wait for the refresh to complete
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

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refresh_token');

      // Helper to handle auth failure - dispatch event for app to handle
      const handleAuthFailure = () => {
        // Clear all auth cookies
        Cookies.remove('auth_token');
        Cookies.remove('refresh_token');
        Cookies.remove('auth_token_expires_at');
        // Dispatch custom event for the app to handle (e.g., show login modal or redirect)
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: { reason: 'token_refresh_failed' },
          }),
        );
      };

      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        // No refresh token - redirect to login
        handleAuthFailure();
        return Promise.reject(error);
      }

      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
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
          // Update expiration timestamp for auto-refresh
          if (data.expires_in) {
            const expiresAt = Date.now() + data.expires_in * 1000;
            Cookies.set('auth_token_expires_at', String(expiresAt));
          }

          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${data.token}`;

          processQueue(null, data.token);
          return http(originalRequest);
        } else {
          throw new Error('Invalid refresh response');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens and redirect to login on refresh failure
        handleAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const get = async <T = any>(
  url: string,
  params?: Record<string, any>,
  config?: { signal?: AbortSignal },
): Promise<T> => {
  const response = await http.get<T>(url, { params, ...config });
  return response.data;
};

export const post = async <T = any>(
  url: string,
  data?: Record<string, any>,
  config?: Record<string, any>,
): Promise<T> => {
  const response = await http.post<T>(url, data, config);
  return response.data;
};

export const put = async <T = any>(
  url: string,
  data?: Record<string, any>,
  config?: Record<string, any>,
): Promise<T> => {
  const response = await http.put<T>(url, data, config);
  return response.data;
};

export const patch = async <T = any>(
  url: string,
  data?: Record<string, any>,
  config?: Record<string, any>,
): Promise<T> => {
  const response = await http.patch<T>(url, data, config);
  return response.data;
};

export const del = async <T = any>(
  url: string,
  config?: Record<string, any>,
): Promise<T> => {
  const response = await http.delete<T>(url, config);
  return response.data;
};

export { http as httpPIM };
export default http;
