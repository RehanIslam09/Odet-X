import { Response } from "express";

import { env } from "@/config/env.js";
import { REFRESH_TOKEN_MAX_AGE_MS } from "@/constants/auth.js";

export const REFRESH_COOKIE_NAME = "refreshToken";

/**
 * Cookie options for the refresh token.
 *
 * - `httpOnly`: Prevents JavaScript from reading the cookie, mitigating XSS.
 * - `secure`: Sent only over HTTPS in production.
 * - `sameSite`: "lax" allows the cookie on top-level navigations (e.g. OAuth
 *   redirects) while blocking cross-site POST requests. Use "strict" if you
 *   never rely on top-level nav, or "none" only if you need cross-origin
 *   requests (requires `secure: true`).
 * - `path`: Scoped to the auth route — the browser will not send this cookie
 *   on unrelated API requests, reducing the attack surface.
 * - `maxAge`: Derived from the same constant used for JWT expiry to ensure the
 *   cookie and token lifetime stay in sync.
 */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

export function clearRefreshTokenCookie(res: Response): void {
  // Pass the same options as set (especially `path`) so the browser actually
  // removes the cookie. A mismatch causes clearCookie to silently fail.
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
}