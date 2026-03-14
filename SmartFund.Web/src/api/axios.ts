import axios from 'axios';
import { getAuthToken, clearAuthToken } from '../auth/authStorage';

export const api = axios.create({
  // Default to relative `/api` so Vite can proxy in dev and the app can be hosted
  // behind the same origin in production. Override with `VITE_API_BASE_URL` when needed.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
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
