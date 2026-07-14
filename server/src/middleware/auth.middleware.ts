import {
  NextFunction,
  Request,
  Response,
} from "express";

import User from "@/models/user.model.js";

import { UnauthorizedError } from "@/utils/app-error.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { verifyAccessToken } from "@/utils/jwt.js";

export const authenticate = asyncHandler(
  async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedError(
        "Authentication required.",
      );
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError(
        "Authentication required.",
      );
    }

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedError(
        "User not found.",
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        "Account has been deactivated.",
      );
    }

    req.user = user;

    next();
  },
);