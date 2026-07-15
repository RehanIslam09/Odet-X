import axios from "axios";

import type { ApiErrorResponse } from "@/features/auth/types/auth.types";

// ---------------------------------------------------------------------------
// API Error Extraction
// ---------------------------------------------------------------------------

/**
 * Extracts a user-facing error message and optional field-level errors from
 * an unknown error value thrown by an Axios request.
 *
 * This is the single utility for converting raw Axios errors into a shape
 * that the UI can render. Every mutation's `onError` handler should use this
 * instead of inspecting the error directly.
 *
 * @example
 * const { message, errors } = getApiError(error);
 * toast.error(message);
 * if (errors) applyServerErrors(setError, errors);
 */
export function getApiError(error: unknown): {
  message: string;
  errors?: Record<string, string>;
} {
  if (axios.isAxiosError<ApiErrorResponse>(error) && error.response?.data) {
    return {
      message: error.response.data.message,
      errors: error.response.data.errors,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Something went wrong. Please try again." };
}

/**
 * Returns true if the error is an Axios error with the given HTTP status code.
 *
 * @example
 * if (isApiError(error, 409)) {
 *   // Handle conflict
 * }
 */
export function isApiError(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status;
}
