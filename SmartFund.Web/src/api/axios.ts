import axios from 'axios';
import { getAuthToken, clearAuthToken } from '../auth/authStorage';

export const api = axios.create({
  // Dev default calls the ASP.NET API directly to avoid relying on dev-server proxy.
  // Override with `VITE_API_BASE_URL` when needed (e.g., staging/prod).
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? 'http://localhost:5123/api' : '/api'),
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      clearAuthToken();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);
