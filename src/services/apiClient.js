import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

// docs/07-frontend-foundation.md §6: the single axios instance imported everywhere — no ad-hoc
// fetch() calls anywhere else in the app. Resource-specific files (tasks.api.js, users.api.js,
// ...) are added during the API Integration sub-phase, not this one.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Request interceptor: attach Authorization from authStore if a token exists.
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalized shape calling code / React Query's onError can show directly in a toast — components
// never need to know the raw axios error shape (docs/07-frontend-foundation.md §6).
export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

// Response interceptor: 401 -> clear the store and redirect to /login (session expired, matches
// the "sign in with Google again" flow — Architecture document §5.2); any other error -> unwrap
// the backend's { success:false, message, code } shape into an ApiError.
//
// window.location.href is used for the redirect (rather than react-router's navigate) because
// this interceptor runs outside the React tree, with no router context available to it — a plain
// full navigation is the standard, correct way to redirect from here. The store-clearing side
// effect is what the Phase 10.1 tests verify directly, per its own suggested approach, since a
// real browser navigation isn't practical to assert in a unit test.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(new ApiError('Session expired. Please sign in again.', 'UNAUTHORIZED'));
    }

    const data = error.response?.data;
    const message = data?.message || error.message || 'Something went wrong.';
    const code = data?.code || 'SERVER_ERROR';
    return Promise.reject(new ApiError(message, code));
  }
);

export default apiClient;
