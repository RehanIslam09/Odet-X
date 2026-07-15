/**
 * Shared type definitions for the authentication feature.
 *
 * These types mirror the backend API response shapes exactly.
 * They are the single source of truth for all auth-related data structures
 * on the frontend. Future modules (projects, tasks, ai) should follow the
 * same pattern — define types in `features/<name>/types/<name>.types.ts`.
 */

// ---------------------------------------------------------------------------
// Domain Model
// ---------------------------------------------------------------------------

/**
 * The authenticated user object returned by the API.
 * Sensitive fields (password, refreshTokenHash) are always stripped
 * by the backend's Mongoose toJSON transform before transmission.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API Response Envelope
// ---------------------------------------------------------------------------

/**
 * The standard success response envelope used by every API endpoint.
 * @template T - The shape of the `data` payload. Omit for responses with no data.
 */
export interface ApiSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data: T extends undefined ? never : T;
}

/**
 * The standard error response envelope.
 * `errors` is only present on 400 validation failures.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Response Data Payloads
// ---------------------------------------------------------------------------

export interface LoginResponseData {
  user: User;
  accessToken: string;
}

export interface RegisterResponseData {
  user: User;
}

export interface MeResponseData {
  user: User;
}

export interface RefreshResponseData {
  accessToken: string;
}
