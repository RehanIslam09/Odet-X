import { apiClient } from "@/services/axios";
import type { User } from "@/features/auth/types/auth.types";
import type { ProfileFormValues } from "../types/settings.types";

interface SettingsUpdateResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

export async function updateProfileApi(data: ProfileFormValues): Promise<User> {
  const response = await apiClient.patch<SettingsUpdateResponse>("/users/me", data);
  return response.data.data.user;
}

export async function updatePreferencesApi(
  data: Partial<User["preferences"]>
): Promise<User> {
  const response = await apiClient.patch<SettingsUpdateResponse>("/users/preferences", {
    preferences: data,
  });
  return response.data.data.user;
}

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export async function changePasswordApi(data: ChangePasswordPayload): Promise<void> {
  await apiClient.patch("/users/password", data);
}
