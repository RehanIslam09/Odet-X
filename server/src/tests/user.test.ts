import dotenv from "dotenv";
import mongoose from "mongoose";

// Load configuration
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

import {
  changePasswordSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "../validators/user.validator.js";

import {
  changeUserPassword,
  updateUserPreferences,
  updateUserProfile,
} from "../services/user.service.js";

import { registerUser, loginUser } from "../services/auth.service.js";
import User from "../models/user.model.js";

// Helper for assertion logging
function expect(value: boolean, message: string) {
  if (!value) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runTests() {
  await setupTestDatabase();

  try {
    console.log("\n--- Starting Phase 11.2 Settings/User Backend Tests ---\n");

    // =========================================================================
    // 1. Zod Validation Tests
    // =========================================================================
    console.log(">> Running Zod Validation tests...");

    // Profile updates validation
    const profileValid = updateProfileSchema.safeParse({
      name: "New Name",
      username: "new_username",
      bio: "New Bio writing standard.",
    });
    expect(profileValid.success === true, "Accepts valid profile inputs");

    const profileInvalidName = updateProfileSchema.safeParse({
      name: "A", // too short
      username: "valid_username",
      bio: "bio",
    });
    expect(profileInvalidName.success === false, "Rejects name shorter than 2 chars");

    const profileInvalidUsername = updateProfileSchema.safeParse({
      name: "Valid Name",
      username: "Invalid Username!", // space and exclamation mark
      bio: "bio",
    });
    expect(profileInvalidUsername.success === false, "Rejects username containing spaces or special characters");

    const profileUppercaseUsername = updateProfileSchema.safeParse({
      name: "Valid Name",
      username: "USERname", // contains uppercase
      bio: "bio",
    });
    expect(profileUppercaseUsername.success === false, "Rejects username containing uppercase letters");

    // Password change validation
    const passwordValid = changePasswordSchema.safeParse({
      currentPassword: "password123!",
      newPassword: "NewPassword123!",
      confirmPassword: "NewPassword123!",
    });
    expect(passwordValid.success === true, "Accepts matching password values");

    const passwordMismatch = changePasswordSchema.safeParse({
      currentPassword: "password123!",
      newPassword: "NewPassword123!",
      confirmPassword: "NewPasswordDifferent!",
    });
    expect(passwordMismatch.success === false, "Rejects newPassword mismatch with confirmPassword");

    const passwordTooShort = changePasswordSchema.safeParse({
      currentPassword: "password123!",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(passwordTooShort.success === false, "Rejects new password shorter than 8 characters");

    // Preferences validation
    const preferencesValid = updatePreferencesSchema.safeParse({
      preferences: {
        appearance: { theme: "dark" },
      },
    });
    expect(preferencesValid.success === true, "Accepts partial preferences appearance payload");

    const preferencesInvalidTheme = updatePreferencesSchema.safeParse({
      preferences: {
        appearance: { theme: "blue-color-theme" },
      },
    });
    expect(preferencesInvalidTheme.success === false, "Rejects un-whitelisted theme values");

    // =========================================================================
    // 2. Service Layer: Auto-username Generation & Collision Tests
    // =========================================================================
    console.log("\n>> Running Username Auto-generation & Collision tests...");

    // Create user 1
    const userA = await registerUser({
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123!",
    });
    expect(userA.username === "johndoe", "Auto-generates clean username 'johndoe' from email prefix");

    // Create user 2 (collides with john.doe)
    const userB = await registerUser({
      name: "John Doe Two",
      email: "john.doe@another.com",
      password: "password123!",
    });
    expect(userB.username === "johndoe_2", "Appends sequence suffix '_2' for first username collision");

    // Create user 3 (collides with john.doe)
    const userC = await registerUser({
      name: "John Doe Three",
      email: "john.doe@yac.com",
      password: "password123!",
    });
    expect(userC.username === "johndoe_3", "Appends sequence suffix '_3' for subsequent username collisions");

    // =========================================================================
    // 3. Service Layer: Profile Update & Uniqueness Tests
    // =========================================================================
    console.log("\n>> Running Profile Updates & Unique checks...");

    // Perform a valid profile change
    const updatedA = await updateUserProfile((userA as any).id as string, {
      name: "Johnathan Doe",
      username: "john_doe_new",
      bio: "Full stack developer.",
    });
    expect(updatedA.name === "Johnathan Doe", "Updates user's full name");
    expect(updatedA.username === "john_doe_new", "Updates user's username to new unique value");
    expect(updatedA.bio === "Full stack developer.", "Updates user's bio");

    // Try to update userB to username "john_doe_new" (should fail due to uniqueness)
    let updateConflictBlocked = false;
    try {
      await updateUserProfile((userB as any).id as string, {
        name: userB.name as string,
        username: "john_doe_new",
        bio: (userB.bio as string) || "",
      });
    } catch (err: any) {
      updateConflictBlocked = true;
      expect(err.name === "ConflictError", "Throws ConflictError when trying to take an occupied username");
    }
    expect(updateConflictBlocked, "Blocks non-unique username updates");

    // Update with same username (should succeed, since user owns it)
    const updatedASelf = await updateUserProfile((userA as any).id as string, {
      name: "Johnathan Doe",
      username: "john_doe_new",
      bio: "Self update.",
    });
    expect(updatedASelf.username === "john_doe_new", "Allows self-profile updates with the same username");

    // =========================================================================
    // 4. Service Layer: Preferences Partial Merging Tests
    // =========================================================================
    console.log("\n>> Running Preferences merge & persistence tests...");

    // Initial check: default timezone should be Asia/Kolkata
    expect(userA.preferences.locale.timezone === "Asia/Kolkata", "Default locale timezone initialized");

    // Patch theme preference only
    const updatedPrefTheme = await updateUserPreferences((userA as any).id as string, {
      preferences: {
        appearance: { theme: "dark" },
      },
    });
    expect(updatedPrefTheme.preferences.appearance.theme === "dark", "Updates theme preference");
    expect(updatedPrefTheme.preferences.locale.timezone === "Asia/Kolkata", "Preserves timezone locale preference during theme update");

    // Patch timezone preference only
    const updatedPrefTimezone = await updateUserPreferences((userA as any).id as string, {
      preferences: {
        locale: { timezone: "America/New_York", language: "en", dateFormat: "YYYY-MM-DD" },
      },
    });
    expect(updatedPrefTimezone.preferences.locale.timezone === "America/New_York", "Updates timezone preference");
    expect(updatedPrefTimezone.preferences.appearance.theme === "dark", "Preserves theme preference during timezone update");

    // Patch notifications only
    const updatedPrefNotif = await updateUserPreferences((userA as any).id as string, {
      preferences: {
        notifications: { emailNotifications: false, desktopNotifications: true, weeklyAiSummary: false, projectActivity: true, taskReminders: false },
      },
    });
    expect(updatedPrefNotif.preferences.notifications.emailNotifications === false, "Updates emailNotifications toggle to false");
    expect(updatedPrefNotif.preferences.notifications.desktopNotifications === true, "Updates desktopNotifications toggle to true");
    expect(updatedPrefNotif.preferences.locale.timezone === "America/New_York", "Preserves locale preferences during notifications update");

    // =========================================================================
    // 5. Service Layer: Password Update & Token Invalidation Tests
    // =========================================================================
    console.log("\n>> Running Password Updates & Session invalidations...");

    // Try to update password with incorrect current password (should fail)
    let passwordCheckBlocked = false;
    try {
      await changeUserPassword((userA as any).id as string, {
        currentPassword: "wrong_current_password",
        newPassword: "NewSuperPassword123!",
        confirmPassword: "NewSuperPassword123!",
      });
    } catch (err: any) {
      passwordCheckBlocked = true;
      expect(err.name === "UnauthorizedError", "Throws UnauthorizedError for incorrect current password verification");
    }
    expect(passwordCheckBlocked, "Blocks password updates with invalid current password credentials");

    // Simulate login for userA to populate refresh token hash
    const loginRes = await loginUser({
      email: "john.doe@example.com",
      password: "password123!",
    });
    expect(loginRes.accessToken !== undefined, "Successful login outputs active access token");
    
    // Check that refresh token hash is active in database
    const userInDbBefore = await User.findById((userA as any).id as string).select("+refreshTokenHash");
    expect(userInDbBefore?.refreshTokenHash !== null, "User has active refresh token hash in DB");

    // Perform successful password update
    const passwordUpdateRes = await changeUserPassword((userA as any).id as string, {
      currentPassword: "password123!",
      newPassword: "NewSuperPassword123!",
      confirmPassword: "NewSuperPassword123!",
    });
    expect(passwordUpdateRes.success === true, "Successfully updates password");

    // Check that refresh token hash has been invalidated (set to null)
    const userInDbAfter = await User.findById((userA as any).id as string).select("+refreshTokenHash");
    expect(userInDbAfter?.refreshTokenHash === null, "Password update clears the stored refresh token hash in DB");

    // Verify user can login with new password
    const newLoginRes = await loginUser({
      email: "john.doe@example.com",
      password: "NewSuperPassword123!",
    });
    expect(newLoginRes.accessToken !== undefined, "Successful login using new password credentials");

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
    await teardownTestDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
