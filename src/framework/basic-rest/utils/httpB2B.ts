import axios from 'axios';
import { getToken } from './get-token';

const http = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT ||
    'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

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
