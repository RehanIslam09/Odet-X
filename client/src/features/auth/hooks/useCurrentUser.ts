import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/features/auth/services/auth.api";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/features/auth/types/auth.types";

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
 * every page load. It calls `GET /auth/me` once per session.
 *
 * The Axios interceptor transparently handles the case where the access
 * token is expired: it calls `POST /auth/refresh` (using the HTTP-only
 * cookie) and retries the original request automatically.
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

  return useQuery<User>({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const { user } = await authApi.me();
      // Sync the user into Zustand so components can read it synchronously
      // without re-triggering this query.
      setUser(user);
      return user;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
