import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/store/auth.store";
import type { ApiErrorResponse, RefreshResponseData } from "@/features/auth/types/auth.types";

// ---------------------------------------------------------------------------
// Token & Workspace Identity Manager
// ---------------------------------------------------------------------------

let accessToken: string | null = null;
let activeWorkspaceSlug: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function getActiveWorkspaceSlug(): string | null {
  return activeWorkspaceSlug;
}

export function setActiveWorkspaceSlug(slug: string | null): void {
  activeWorkspaceSlug = slug;
}

export function clearActiveWorkspaceSlug(): void {
  activeWorkspaceSlug = null;
}

// ---------------------------------------------------------------------------
// Refresh Lock
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string> | null = null;

// ---------------------------------------------------------------------------
// Axios Instance
// ---------------------------------------------------------------------------

if (!import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL is not defined. Check your .env file.");
}

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

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (activeWorkspaceSlug) {
    config.headers["X-Workspace-Slug"] = activeWorkspaceSlug;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response Interceptor
// ---------------------------------------------------------------------------

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    const is401 = error.response?.status === 401;
    const hasNotBeenRetried = !originalRequest?._retry;
    const isRefreshEndpoint = originalRequest?.url?.includes("/auth/refresh");
    const isLoginEndpoint = originalRequest?.url?.includes("/auth/login");

    if (is401 && hasNotBeenRetried && !isRefreshEndpoint && !isLoginEndpoint && originalRequest) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = apiClient
            .post<{ data: RefreshResponseData }>("/auth/refresh")
            .then((res) => {
              const newToken = res.data.data.accessToken;
              setAccessToken(newToken);
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        await refreshPromise;
        return apiClient(originalRequest);
      } catch {
        clearAccessToken();
        clearActiveWorkspaceSlug();
        useAuthStore.getState().clearUser();
        try {
          // Import dynamically to avoid static circular dependency
          import("@/realtime/realtime-client").then(({ realtimeClient }) => {
            realtimeClient.disconnect();
          });
        } catch {
          // Ignore if module unresolvable
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
