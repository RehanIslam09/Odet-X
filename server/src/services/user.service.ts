import User from "@/models/user.model.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/utils/app-error.js";
import type {
  ChangePasswordDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from "@/validators/user.validator.js";

/**
 * Update user's profile details (Name, Username, Bio).
 *
 * If the username is changed, it validates that the new username is unique.
 * Throws ConflictError if the username is already taken by another user.
 */
export async function updateUserProfile(userId: string, data: UpdateProfileDto) {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // If username is changing, ensure it is unique
  if (data.username !== user.username) {
    const existingUser = await User.findOne({ username: data.username });
    if (existingUser) {
      throw new ConflictError("Username is already taken.");
    }
  }

  user.name = data.name;
  user.username = data.username;
  user.bio = data.bio;

  await user.save();

  return user.toJSON();
}

/**
 * Update user's configuration preferences (appearance theme, density, locale language/timezone, notifications).
 */
export async function updateUserPreferences(userId: string, data: UpdatePreferencesDto) {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // Set the nested preferences structure cleanly by merging partial updates
  if (data.preferences.appearance) {
    user.preferences.appearance = {
      theme: data.preferences.appearance.theme ?? user.preferences.appearance.theme,
      density: data.preferences.appearance.density ?? user.preferences.appearance.density,
    };
  }
  if (data.preferences.locale) {
    user.preferences.locale = {
      timezone: data.preferences.locale.timezone ?? user.preferences.locale.timezone,
      language: data.preferences.locale.language ?? user.preferences.locale.language,
      dateFormat: data.preferences.locale.dateFormat ?? user.preferences.locale.dateFormat,
    };
  }
  if (data.preferences.notifications) {
    user.preferences.notifications = {
      emailNotifications: data.preferences.notifications.emailNotifications ?? user.preferences.notifications.emailNotifications,
      desktopNotifications: data.preferences.notifications.desktopNotifications ?? user.preferences.notifications.desktopNotifications,
      weeklyAiSummary: data.preferences.notifications.weeklyAiSummary ?? user.preferences.notifications.weeklyAiSummary,
      projectActivity: data.preferences.notifications.projectActivity ?? user.preferences.notifications.projectActivity,
      taskReminders: data.preferences.notifications.taskReminders ?? user.preferences.notifications.taskReminders,
    };
  }

  await user.save();

  return user.toJSON();
}

/**
 * Change user's password.
 *
 * Verifies the current password, hashes the new password, and invalidates all
 * existing refresh tokens for security.
 */
export async function changeUserPassword(userId: string, data: ChangePasswordDto) {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const isPasswordValid = await user.comparePassword(data.currentPassword);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Incorrect current password.");
  }

  user.password = data.newPassword;
  // Invalidate refresh tokens - logs out user from all other devices/sessions
  user.refreshTokenHash = null;

  await user.save();

  return { success: true };
}
