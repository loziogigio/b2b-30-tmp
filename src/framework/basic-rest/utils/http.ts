import axios from 'axios';
import { addAuthInterceptors } from '@/lib/auth';

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REST_API_ENDPOINT,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add auth interceptors (request header + 401 response handling)
addAuthInterceptors(http);

export default http;
