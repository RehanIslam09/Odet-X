import { NextFunction, Request, Response } from "express";

import User from "@/models/user.model.js";
import { UnauthorizedError } from "@/utils/app-error.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { verifyAccessToken } from "@/utils/jwt.js";

/**
 * Verifies the Bearer access token from the Authorization header, then fetches
 * the user and confirms the account is still active.
 *
 * Attaches the user document to `req.user` for use by downstream handlers.
 *
 * JWT errors are now caught inside `verifyAccessToken` and thrown as
 * `UnauthorizedError`, so this middleware never needs to handle raw JWT
 * exceptions directly.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedError("Authentication required.");
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError("Authentication required.");
    }

    // verifyAccessToken throws UnauthorizedError on any JWT failure
    // (expired, malformed, wrong secret) — no need to catch here.
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Authentication required.");
    }

    req.user = user;

    next();
  },
);