import axios from 'axios';
import { addAuthInterceptors } from '@/lib/auth';

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
 * Now includes 401 handling with automatic token refresh.
 */
const http = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add auth interceptors (request header + 401 response handling)
addAuthInterceptors(http);

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
