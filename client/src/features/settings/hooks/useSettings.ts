import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth.store";
import { clearAccessToken } from "@/services/axios";
import { getApiError } from "@/utils/api-error";
import {
  changePasswordApi,
  updatePreferencesApi,
  updateProfileApi,
  type ChangePasswordPayload,
} from "../services/settings.api";
import type { User } from "@/features/auth/types/auth.types";
import type { ProfileFormValues } from "../types/settings.types";

/**
 * Mutation hook for updating user profile settings.
 * Updates Zustand store auth user on success.
 */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (data: ProfileFormValues) => updateProfileApi(data),
    onSuccess: (updatedUser: User) => {
      if (user) {
        setUser({
          ...user,
          name: updatedUser.name,
          username: updatedUser.username,
          bio: updatedUser.bio,
        });
      }
      toast.success("Profile updated successfully.");
    },
    onError: (error) => {
      const { message } = getApiError(error);
      toast.error(message || "Failed to update profile.");
    },
  });
}

/**
 * Mutation hook for updating user preferences.
 * Updates Zustand store preferences.
 */
export function useUpdatePreferences() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (data: Partial<User["preferences"]>) => updatePreferencesApi(data),
    onSuccess: (updatedUser: User) => {
      if (user) {
        setUser({
          ...user,
          preferences: updatedUser.preferences,
        });
      }
      toast.success("Preferences updated successfully.", { duration: 1800 });
    },
    onError: (error) => {
      const { message } = getApiError(error);
      toast.error(message || "Failed to update preferences.");
    },
  });
}

/**
 * Mutation hook for changing user password.
 * Invalidates refresh token on server and forces local logout + re-authentication.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => changePasswordApi(data),
    onSuccess: () => {
      toast.success("Password changed successfully. Please log in again.");
      
      // Perform local logout and clear cache
      clearAccessToken();
      clearUser();
      queryClient.clear();
      
      navigate("/auth/login", { replace: true });
    },
    onError: (error) => {
      const { message } = getApiError(error);
      toast.error(message || "Failed to change password.");
    },
  });
}
