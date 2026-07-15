import axios from "axios";
import { QueryClient } from "@tanstack/react-query";

/**
 * Global React Query client configuration.
 *
 * Design decisions:
 *
 * - `retry`: Disabled globally for auth errors. The `shouldRetry` function
 *   prevents retrying 401 and 403 responses — these are not transient errors
 *   and retrying them wastes a network round-trip and delays the user.
 *   In practice, the Axios response interceptor handles 401s transparently
 *   (refresh → retry) so React Query rarely sees auth errors directly.
 *   One retry is kept for genuine transient failures (5xx, network errors).
 *
 * - `staleTime: 0`: Default — queries are considered stale immediately.
 *   Individual queries override this (e.g. `useCurrentUser` uses Infinity).
 *
 * - `refetchOnWindowFocus: false`: Prevents aggressive refetching when the
 *   user switches tabs. The Axios interceptor handles token refresh, so
 *   queries remain fresh without window-focus polling.
 *
 * - `gcTime: 5 minutes`: Cached data is kept for 5 minutes after a query
 *   is unmounted. This is the React Query default — a good balance between
 *   memory usage and perceived performance on navigation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry authentication or authorization errors.
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          return false;
        }
        // Retry once for transient failures (network, 5xx).
        return failureCount < 1;
      },
      staleTime: 0,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});