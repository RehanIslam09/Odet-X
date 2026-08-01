import { Socket } from "socket.io";

import User from "@/models/user.model.js";
import { UnauthorizedError } from "@/utils/app-error.js";
import { verifyAccessToken } from "@/utils/jwt.js";
import { SocketData } from "./socket-types.js";

/**
 * Socket.IO Handshake Authentication Middleware.
 * Validates short-lived JWT access tokens passed in `handshake.auth.token`,
 * verifies user account activity in MongoDB, and attaches trusted server-side identity
 * to `socket.data`.
 */
export async function socketAuthMiddleware(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return next(new UnauthorizedError("Authentication required."));
    }

    // verifyAccessToken throws UnauthorizedError on expired/invalid/malformed JWT
    const payload = verifyAccessToken(token.trim());

    let user = await User.findById(payload.sub);
    let retries = 0;
    while (!user && retries < 5) {
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      user = await User.findById(payload.sub);
    }

    if (!user || !user.isActive) {
      return next(new UnauthorizedError("Authentication required."));
    }

    // Populate trusted server-side identity into socket metadata
    socket.data.user = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      name: user.name,
    };
    socket.data.userId = user._id.toString();

    next();
  } catch (error) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(new UnauthorizedError("Authentication required."));
    }
  }
}
