import { Request, Response } from "express";

import {
  changeUserPassword,
  updateUserPreferences,
  updateUserProfile,
} from "@/services/user.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { clearRefreshTokenCookie } from "@/utils/cookies.js";

// ---------------------------------------------------------------------------
// PATCH /users/me
// ---------------------------------------------------------------------------
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user!._id as { toString(): string }).toString();

  const user = await updateUserProfile(userId, req.body);

  sendSuccessResponse(res, {
    message: "Profile updated successfully.",
    data: { user },
  });
});

// ---------------------------------------------------------------------------
// PATCH /users/preferences
// ---------------------------------------------------------------------------
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user!._id as { toString(): string }).toString();

  const user = await updateUserPreferences(userId, req.body);

  sendSuccessResponse(res, {
    message: "Preferences updated successfully.",
    data: { user },
  });
});

// ---------------------------------------------------------------------------
// PATCH /users/password
// ---------------------------------------------------------------------------
export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user!._id as { toString(): string }).toString();

  await changeUserPassword(userId, req.body);

  // Clear cookie immediately on the server side so client is logged out
  clearRefreshTokenCookie(res);

  sendSuccessResponse(res, {
    message: "Password changed successfully. Please log in again.",
  });
});
