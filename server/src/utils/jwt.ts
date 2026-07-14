import jwt from "jsonwebtoken";

import { env } from "@/config/env.js";

import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "@/constants/auth.js";

export interface JwtPayload {
  sub: string;
}

export function generateAccessToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

export function generateRefreshToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    },
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
  ) as JwtPayload;
}