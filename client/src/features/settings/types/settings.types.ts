import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  bio: z.string().max(160, "Bio must be at most 160 characters"),
});

export const accountSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  dateFormat: z.string().min(1, "Date format is required"),
});

export const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  density: z.enum(["comfortable", "compact"]),
});

export const notificationsSchema = z.object({
  emailNotifications: z.boolean(),
  desktopNotifications: z.boolean(),
  weeklyAiSummary: z.boolean(),
  projectActivity: z.boolean(),
  taskReminders: z.boolean(),
});

// ---------------------------------------------------------------------------
// TypeScript Types
// ---------------------------------------------------------------------------

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type AccountFormValues = z.infer<typeof accountSchema>;
export type AppearanceFormValues = z.infer<typeof appearanceSchema>;
export type NotificationsFormValues = z.infer<typeof notificationsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password must be at least 8 characters"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
