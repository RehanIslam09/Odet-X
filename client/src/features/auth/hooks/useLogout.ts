import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { authApi } from "@/features/auth/services/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { clearAccessToken } from "@/services/axios";
import { realtimeClient } from "@/realtime/realtime-client";

/**
 * Logout mutation hook.
 *
 * On success (and on error, as a failsafe):
 * 1. Clears the in-memory access token
 * 2. Clears the Zustand user state
 * 3. Clears the entire React Query cache (prevents stale data for next session)
 * 4. Navigates to `/auth/login`
 *
 * The server invalidates the refresh token and clears the HTTP-only cookie.
 * If the server call fails for any reason, the client still performs local
 * cleanup — the user is logged out locally regardless.
 *
 * @returns The TanStack Query mutation result.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();

  const performLocalLogout = () => {
    realtimeClient.disconnect();
    clearAccessToken();
    clearUser();
    queryClient.clear();
    navigate("/auth/login", { replace: true });
  };

  return useMutation({
    mutationFn: authApi.logout,

    onSuccess: () => {
      toast.success("Signed out successfully.");
      performLocalLogout();
    },

    onError: () => {
      // Even if the server request fails, perform local logout.
      // The refresh token on the server may have already expired.
      performLocalLogout();
    },
  });
}
