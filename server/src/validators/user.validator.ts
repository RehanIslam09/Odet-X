import { z } from "zod";

import {
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/constants/auth.js";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
    .max(MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters`)
    .trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores")
    .trim(),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio cannot exceed ${MAX_BIO_LENGTH} characters`)
    .trim()
    .default(""),
});

export const updatePreferencesSchema = z.object({
  preferences: z.object({
    appearance: z
      .object({
        theme: z.enum(["light", "dark", "system"]),
        density: z.enum(["comfortable", "compact"]),
      })
      .partial()
      .optional(),
    locale: z
      .object({
        timezone: z.string().min(1, "Timezone is required").trim(),
        language: z.string().min(1, "Language is required").trim(),
        dateFormat: z.string().min(1, "Date format is required").trim(),
      })
      .partial()
      .optional(),
    notifications: z
      .object({
        emailNotifications: z.boolean(),
        desktopNotifications: z.boolean(),
        weeklyAiSummary: z.boolean(),
        projectActivity: z.boolean(),
        taskReminders: z.boolean(),
      })
      .partial()
      .optional(),
  }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Current password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, `Current password cannot exceed ${MAX_PASSWORD_LENGTH} characters`),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, `New password cannot exceed ${MAX_PASSWORD_LENGTH} characters`),
    confirmPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Confirm password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, `Confirm password cannot exceed ${MAX_PASSWORD_LENGTH} characters`),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Inferred TypeScript DTOs
// ---------------------------------------------------------------------------

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
