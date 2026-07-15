import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { authApi } from "@/features/auth/services/auth.api";
import { getApiError } from "@/utils/api-error";

/**
 * Registration mutation hook.
 *
 * On success, navigates to `/auth/login` with a success message.
 * Registration does NOT automatically log the user in — this is a deliberate
 * UX decision that matches the backend's design (no tokens issued on register).
 *
 * On error, returns the parsed API error.
 * The caller is responsible for applying field-level errors via `applyServerErrors`.
 *
 * @returns The TanStack Query mutation result.
 */
export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,

    onSuccess: () => {
      toast.success("Account created!", {
        description: "Please sign in to continue.",
      });
      navigate("/auth/login");
    },

    onError: (error) => {
      const { message } = getApiError(error);
      // Only show toast for non-validation errors.
      // Field-level validation errors are handled by the form component
      // using applyServerErrors — showing both would be redundant.
      toast.error(message);
    },
  });
}
