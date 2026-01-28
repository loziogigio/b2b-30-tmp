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
    return '/api/proxy/b2b';
  }
  // Server-side: need full URL
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}/api/proxy/b2b`;
};

/**
 * HTTP client for B2B API calls.
 * Routes through /api/proxy/b2b to keep external API URLs server-side.
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

const get = async <T = any>(url: string, params?: Record<string, any>) => {
  const response = await http.get<T>(url, { params });
  return response.data;
};

const post = async <T = any>(
  url: string,
  data?: Record<string, any>,
  config?: Record<string, any>,
) => {
  const response = await http.post<T>(url, data, config);
  return response.data;
};

const del = async <T = any>(
  url: string,
  data?: Record<string, any>,
  config?: Record<string, any>,
) => {
  const response = await http.delete<T>(url, config);
  return response.data;
};

export { get, post, del };
export default http;
