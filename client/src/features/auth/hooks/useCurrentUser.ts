import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/features/auth/services/auth.api";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/features/auth/types/auth.types";
import { getAccessToken, setAccessToken } from "@/services/axios";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
// Centralizing query keys prevents typos and makes invalidation explicit.
// All auth hooks use keys from this factory.

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Bootstrap and session persistence hook.
 *
 * This is the single call responsible for restoring the user's session on
 * every page load. It first checks for an in-memory access token. If none
 * exists, it proactively attempts to refresh the session before calling
 * `GET /auth/me`. This eliminates unnecessary 401s on the `/auth/me` endpoint.
 *
 * Configuration:
 * - `staleTime: Infinity` — the session never goes stale on its own.
 *   It is only invalidated explicitly on login or logout.
 * - `gcTime: Infinity` — the cached user object is never garbage-collected.
 * - `retry: false` — authentication failures should never be auto-retried.
 *
 * Usage:
 * - `AuthBootstrap` calls this hook to determine the
 *   session state on initialization. React Query handles the caching.
 * - `UserMenu` and route guards read `user` from Zustand (already populated by this hook)
 *   for synchronous access without re-triggering the query.
 *
 * @returns The TanStack Query result for the current user.
 */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery<User | null>({
    queryKey: authKeys.me(),
    queryFn: async () => {
      let token = getAccessToken();

      // If we don't have an access token (e.g. initial load or refresh),
      // proactively attempt to get one using the HTTP-only refresh cookie.
      if (!token) {
        try {
          const res = await authApi.refresh();
          if (res.accessToken) {
            setAccessToken(res.accessToken);
            token = res.accessToken;
          }
        } catch {
          // A 401 here is completely expected for logged-out users.
          // Swallow the error, clear any stale state, and return null.
          useAuthStore.getState().clearUser();
          return null;
        }
      }

      // If we STILL don't have a token, the user is logged out.
      if (!token) {
        useAuthStore.getState().clearUser();
        return null;
      }

      // We have a token, so fetch the user profile.
      try {
        const { user } = await authApi.me();
        // Sync the user into Zustand so components can read it synchronously
        // without re-triggering this query.
        setUser(user);
        return user;
      } catch {
        // If /auth/me fails (e.g. token immediately expired and refresh failed),
        // clear the state and throw the error so React Query handles it.
        useAuthStore.getState().clearUser();
        throw new Error("Failed to fetch user");
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
