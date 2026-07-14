import { Request, Response } from "express";

import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "@/services/auth.service.js";

import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import {
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
} from "@/utils/cookies.js";
import { UnauthorizedError } from "@/utils/app-error.js";

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Account created successfully.",
    data: { user },
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, rawRefreshToken } = await loginUser(req.body);

  // The refresh token is ONLY transmitted via an HTTP-only cookie.
  // It is never included in the JSON response body.
  setRefreshTokenCookie(res, rawRefreshToken);

  sendSuccessResponse(res, {
    message: "Login successful.",
    data: { user, accessToken },
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] as
    | string
    | undefined;

  if (!rawRefreshToken) {
    throw new UnauthorizedError("Authentication required.");
  }

  const { accessToken, rawRefreshToken: newRawRefreshToken } =
    await refreshAccessToken(rawRefreshToken);

  // Rotate the cookie — set the new token, clearing the old one.
  setRefreshTokenCookie(res, newRawRefreshToken);

  sendSuccessResponse(res, {
    message: "Token refreshed.",
    data: { accessToken },
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // req.user is guaranteed non-null here — authenticate middleware runs first.
  const userId = (req.user!._id as { toString(): string }).toString();

  await logoutUser(userId);

  clearRefreshTokenCookie(res);

  sendSuccessResponse(res, {
    message: "Logged out successfully.",
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, {
    message: "User retrieved successfully.",
    data: { user: req.user },
  });
});