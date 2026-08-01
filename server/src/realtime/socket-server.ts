import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { env } from "@/config/env.js";
import { userSessionRegistry } from "./session-registry.js";
import { socketAuthMiddleware } from "./socket-auth.middleware.js";
import { AuthenticatedSocket, SocketData } from "./socket-types.js";

import { domainEventBus } from "./event-bus/local-domain-event-bus.js";
import { attachRealtimeEventRelay } from "./event-bus/realtime-event-relay.js";
import { registerWorkspaceRoomHandlers } from "./handlers/workspace-room.handler.js";
import { presenceRegistry } from "./presence/presence-registry.js";
import { getWorkspaceRoom } from "./room-utils.js";
import { REALTIME_EVENTS } from "./constants.js";
import { socketRateLimiter } from "./socket-rate-limiter.js";
import { RealtimeEventRelay } from "./event-bus/realtime-event-relay.js";

export interface RealtimeServerOptions {
  corsOrigin?: string | string[];
}

export interface RealtimeServerInstance {
  io: SocketIOServer<any, any, any, SocketData>;
  relay: RealtimeEventRelay;
  close: () => Promise<void>;
}

/**
 * Creates and initializes the production-grade Socket.IO Real-Time Transport Server.
 * Attaches handshake authentication middleware, manages session registry lifecycle,
 * connects the Domain Event Relay, configures CORS origin policy, and provides a deterministic close() lifecycle method.
 */
export function createRealtimeServer(
  httpServer: HttpServer,
  options?: RealtimeServerOptions,
): RealtimeServerInstance {
  const allowedOrigins = options?.corsOrigin || env.CLIENT_URL;

  const io = new SocketIOServer<any, any, any, SocketData>(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1 MB payload ceiling
    transports: ["websocket", "polling"],
  });

  // Attach handshake authentication middleware
  io.use(socketAuthMiddleware);

  // Attach Real-Time Domain Event Relay
  const relay = attachRealtimeEventRelay(io, domainEventBus);

  // Register connection lifecycle handlers
  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;

    if (userId) {
      userSessionRegistry.register(userId, socket);
      registerWorkspaceRoomHandlers(socket);
    }

    socket.on("disconnecting", () => {
      if (userId) {
        for (const room of socket.rooms) {
          if (room.startsWith("workspace:")) {
            const wsId = room.replace("workspace:", "");
            presenceRegistry.removeSocketPresence(
              wsId,
              socket.id,
              false, // 3-second grace period for transport drops
              (targetWsId, snapshot) => {
                io.to(getWorkspaceRoom(targetWsId)).emit(REALTIME_EVENTS.PRESENCE_UPDATED, snapshot);
              },
            );
          }
        }
      }
    });

    socket.on("disconnect", () => {
      socketRateLimiter.removeSocket(socket.id);
      if (userId) {
        userSessionRegistry.unregister(userId, socket.id);
      }
    });
  });

  let isClosed = false;
  const close = async (): Promise<void> => {
    if (isClosed) return;
    isClosed = true;

    try {
      // 1. Detach Real-Time Event Relay from Domain Event Bus
      relay.detach();

      // 2. Clear presence registry and cancellable grace timers
      presenceRegistry.clear();

      // 3. Clear rate limiters
      socketRateLimiter.clear();

      // 4. Disconnect active sockets and clear session registry
      const activeSockets = Array.from(io.sockets.sockets.values());
      for (const socket of activeSockets) {
        socket.disconnect(true);
      }
      userSessionRegistry.clear();

      // 5. Close Socket.IO server
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
    } catch (err) {
      console.error("[RealtimeServer] Error during close:", err);
    }
  };

  return { io, relay, close };
}
