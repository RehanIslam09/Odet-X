import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/store/auth.store";
import type { ApiErrorResponse, RefreshResponseData } from "@/features/auth/types/auth.types";

// ---------------------------------------------------------------------------
// Token Manager
// ---------------------------------------------------------------------------
// Access tokens live here — in module memory — and nowhere else.
// This is intentional:
//   - Not in Zustand: tokens are infrastructure, not UI state
//   - Not in localStorage: XSS-vulnerable storage is off-limits
//   - Not in sessionStorage: same risk profile as localStorage
//
// The token is lost on page refresh. That is correct — the bootstrap flow
// (GET /auth/me via POST /auth/refresh) restores it automatically on every
// page load, using the HTTP-only refresh token cookie.

let accessToken: string | null = null;

/**
 * Store a new access token in memory.
 * Called by the login hook and the refresh interceptor.
 */
export function setAccessToken(token: string): void {
  accessToken = token;
}

/**
 * Remove the access token from memory.
 * Called on logout or when a refresh fails.
 */
export function clearAccessToken(): void {
  accessToken = null;
}

// ---------------------------------------------------------------------------
// Refresh Lock
// ---------------------------------------------------------------------------
// Prevents multiple simultaneous 401 responses from each triggering an
// independent refresh call. All concurrent failures share a single in-flight
// promise — the first one starts the refresh, the rest await its result.

let refreshPromise: Promise<string> | null = null;

// ---------------------------------------------------------------------------
// Axios Instance
// ---------------------------------------------------------------------------

if (!import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL is not defined. Check your .env file.");
}

/**
 * The centralized Axios client for all API communication.
 *
 * Features:
 * - Base URL from environment variable (never hardcoded)
 * - `withCredentials: true` required for the HTTP-only refresh token cookie
 * - Request interceptor: automatically attaches `Authorization: Bearer <token>`
 * - Response interceptor: transparently refreshes the access token on 401
 *   and retries the original request — components never see the failure
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request Interceptor
// ---------------------------------------------------------------------------
// Attaches the current access token to every outgoing request.
// Components never construct the Authorization header manually.

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response Interceptor
// ---------------------------------------------------------------------------
// On a 401 response:
//   1. Skip if this request was itself a refresh or login call (avoid loops)
//   2. Acquire the refresh lock — only one refresh in-flight at a time
//   3. Call POST /auth/refresh (browser sends the HTTP-only cookie automatically)
//   4. On success: store the new token and retry the original request
//   5. On failure: clear auth state and redirect to login

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  // Successful responses pass through unchanged
  (response) => response,

  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    const is401 = error.response?.status === 401;
    const hasNotBeenRetried = !originalRequest?._retry;
    const isRefreshEndpoint = originalRequest?.url?.includes("/auth/refresh");
    const isLoginEndpoint = originalRequest?.url?.includes("/auth/login");

    // Only intercept 401s on non-auth endpoints that haven't been retried yet.
    // This prevents the interceptor from triggering infinite refresh loops.
    if (is401 && hasNotBeenRetried && !isRefreshEndpoint && !isLoginEndpoint && originalRequest) {
      originalRequest._retry = true;

      try {
        // Acquire the refresh lock. If a refresh is already in-flight from a
        // concurrent request, await that same promise instead of making a new call.
        if (!refreshPromise) {
          refreshPromise = apiClient
            .post<{ data: RefreshResponseData }>("/auth/refresh")
            .then((res) => {
              const newToken = res.data.data.accessToken;
              setAccessToken(newToken);
              return newToken;
            })
            .finally(() => {
              // Release the lock regardless of success or failure.
              refreshPromise = null;
            });
        }

        // Wait for the refresh to complete (the originating or shared promise).
        await refreshPromise;

        // Retry the original request — the request interceptor will attach
        // the new access token automatically.
        return apiClient(originalRequest);
      } catch {
        // Refresh failed. The session is dead.
        // Clear in-memory token and Zustand user state.
        clearAccessToken();
        useAuthStore.getState().clearUser();

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
