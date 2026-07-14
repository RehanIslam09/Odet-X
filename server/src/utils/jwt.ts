import jwt from "jsonwebtoken";

import { env } from "@/config/env.js";
import { UnauthorizedError } from "@/utils/app-error.js";

import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "@/constants/auth.js";

export interface JwtPayload {
  sub: string;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    // Surface a single, generic Unauthorized error regardless of whether the
    // token was malformed, expired, or tampered with. Callers should not need
    // to distinguish between JWT failure modes.
    throw new UnauthorizedError("Authentication required.");
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Authentication required.");
  }
}