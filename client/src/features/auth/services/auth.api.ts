import { apiClient } from "@/services/axios";

import type {
  LoginDto,
  LoginResponseData,
  MeResponseData,
  RefreshResponseData,
  RegisterDto,
  RegisterResponseData,
} from "@/features/auth/types/auth.types";

// ---------------------------------------------------------------------------
// Response envelope wrapper
// ---------------------------------------------------------------------------

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Auth API Module
// ---------------------------------------------------------------------------
// All functions use the centralized apiClient — never raw axios.
// No component or hook should import axios directly.
//
// Future API modules (projects.ts, tasks.ts, ai.ts) must follow this exact
// pattern: a const object grouping all functions for the resource.

/**
 * All authentication endpoints.
 *
 * Responsibilities:
 * - Construct the HTTP request
 * - Return the typed response payload
 * - Throw on error (Axios does this by default; caught by hooks)
 *
 * Responsibilities NOT here:
 * - Caching (React Query)
 * - State updates (Zustand, via hooks)
 * - Toast notifications (hooks/components)
 */
export const authApi = {
  /**
   * Create a new user account.
   * Does NOT automatically log the user in — they must login separately.
   */
  register: async (data: RegisterDto): Promise<RegisterResponseData> => {
    const response = await apiClient.post<ApiResponse<RegisterResponseData>>(
      "/auth/register",
      data,
    );
    return response.data.data;
  },

  /**
   * Authenticate with email and password.
   * Returns the user object and a short-lived access token.
   * The refresh token is set as an HTTP-only cookie by the server — it is
   * never present in this response.
   */
  login: async (data: LoginDto): Promise<LoginResponseData> => {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>(
      "/auth/login",
      data,
    );
    return response.data.data;
  },

  /**
   * Invalidate the current session.
   * The server clears the HTTP-only refresh token cookie.
   * The caller is responsible for clearing the in-memory access token.
   */
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  /**
   * Exchange the HTTP-only refresh token cookie for a new access token.
   * The server also rotates the refresh token cookie.
   * Called automatically by the Axios response interceptor — components
   * should never call this directly.
   */
  refresh: async (): Promise<RefreshResponseData> => {
    const response = await apiClient.post<ApiResponse<RefreshResponseData>>(
      "/auth/refresh",
    );
    return response.data.data;
  },

  /**
   * Fetch the currently authenticated user.
   * Used as the bootstrap call on every page load and as the React Query
   * source of truth for the current user.
   */
  me: async (): Promise<MeResponseData> => {
    const response = await apiClient.get<ApiResponse<MeResponseData>>(
      "/auth/me",
    );
    return response.data.data;
  },
};
