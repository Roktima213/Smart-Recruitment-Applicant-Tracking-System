import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { auth } from '../config/firebaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Pre-configured Axios instance with automatic Firebase ID Token injection
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

/**
 * Request interceptor: injects fresh Firebase ID Token into Authorization header
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        if (idToken) {
          config.headers.Authorization = `Bearer ${idToken}`;
        }
      }
    } catch (error) {
      console.warn('[ApiClient] Failed to acquire Firebase ID token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: handles global errors and 401 unauthenticated signals
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[ApiClient] Unauthorized request. Token may be expired.');
    }
    return Promise.reject(error);
  }
);

/**
 * Synchronizes Firebase authenticated user with backend PostgreSQL database
 */
export async function syncUserWithBackend(userData?: {
  fullName?: string;
  role?: string;
  avatarUrl?: string;
  companyId?: string | null;
}) {
  const response = await apiClient.post('/auth/sync', userData || {});
  return response.data;
}

/**
 * Fetches database profile for current user
 */
export async function fetchCurrentUserProfile() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}
