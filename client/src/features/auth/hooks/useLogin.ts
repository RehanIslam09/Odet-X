import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authApi } from "@/features/auth/services/auth.api";
import { authKeys } from "@/features/auth/hooks/useCurrentUser";
import { useAuthStore } from "@/store/auth.store";
import { setAccessToken } from "@/services/axios";

/**
 * Login mutation hook.
 *
 * On success:
 * 1. Stores the access token in module memory (via `setAccessToken`)
 * 2. Populates Zustand with the authenticated user
 * 3. Updates the React Query cache for `useCurrentUser` — no re-fetch needed
 *
 * Navigation after login is the caller's responsibility. This allows the
 * form to navigate to the `from` destination it reads from location state.
 * The hook stays generic and reusable — it does not own navigation logic.
 *
 * @returns The TanStack Query mutation result.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: authApi.login,

    onSuccess: (data) => {
      // 1. Token into memory — never localStorage
      setAccessToken(data.accessToken);

      // 2. User into Zustand for synchronous access across components
      setUser(data.user);

      // 3. Populate the query cache so useCurrentUser returns immediately
      //    without an extra network round-trip.
      queryClient.setQueryData(authKeys.me(), data.user);

      toast.success("Welcome back!", {
        description: `Signed in as ${data.user.name}`,
      });
    },

    onError: () => {
      // Individual error messages are handled by the form via getApiError.
      // The toast here is intentionally omitted — the form shows inline errors.
      // If you want a toast fallback, uncomment:
      // toast.error(getApiError(error).message);
    },
  });
}
