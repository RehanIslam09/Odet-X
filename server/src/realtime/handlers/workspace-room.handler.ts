import { Types } from "mongoose";

import WorkspaceMember from "@/models/workspace-member.model.js";
import Project from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import { REALTIME_EVENTS } from "../constants.js";
import { getWorkspaceRoom } from "../room-utils.js";
import { workspaceSubscribeSchema, workspaceUnsubscribeSchema } from "../schemas/workspace-room.schema.js";
import { AuthenticatedSocket } from "../socket-types.js";
import { presenceRegistry } from "../presence/presence-registry.js";
import { resourceViewingSchema } from "../presence/presence-types.js";
import { z } from "zod";
import { socketRateLimiter } from "../socket-rate-limiter.js";

export type WorkspaceRoomAck = (
  result: { status: "ok"; workspaceId: string } | { status: "error"; message: string },
) => void;

/**
 * Registers workspace subscription, unsubscription, and ephemeral presence handlers for an authenticated socket.
 * Enforces authoritative database membership checks, runtime Zod validation, and anti-enumeration invariants.
 */
export function registerWorkspaceRoomHandlers(socket: AuthenticatedSocket): void {
  // ---------------------------------------------------------------------------
  // 1. Workspace Subscription Handler
  // ---------------------------------------------------------------------------
  socket.on(REALTIME_EVENTS.WORKSPACE_SUBSCRIBE, async (rawPayload: unknown, ack?: WorkspaceRoomAck) => {
    try {
      if (!socketRateLimiter.checkLimit(socket.id, "subscribe", 15, 5000)) {
        if (typeof ack === "function") {
          ack({ status: "error", message: "Rate limit exceeded." });
        }
        return;
      }

      const parseResult = workspaceSubscribeSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (typeof ack === "function") {
          ack({ status: "error", message: "Workspace not found." });
        }
        return;
      }

      const { workspaceId } = parseResult.data;
      const trustedUserId = socket.data.userId;

      // Authoritative DB membership check using verified socket user identity
      const member = await WorkspaceMember.findOne({
        workspaceId: new Types.ObjectId(workspaceId.trim()),
        userId: new Types.ObjectId(trustedUserId),
      });

      // Anti-enumeration invariant: Return generic 404 error if non-member or missing
      if (!member) {
        if (typeof ack === "function") {
          ack({ status: "error", message: "Workspace not found." });
        }
        return;
      }

      // Authorization satisfied: Derive room name and join Socket.IO room
      const room = getWorkspaceRoom(workspaceId);
      socket.join(room);

      // Register Ephemeral Workspace Presence
      const snapshot = presenceRegistry.addSocketPresence(workspaceId.trim(), socket);
      socket.emit(REALTIME_EVENTS.PRESENCE_SNAPSHOT, snapshot);
      socket.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATED, snapshot);

      if (typeof ack === "function") {
        ack({ status: "ok", workspaceId: workspaceId.trim() });
      }
    } catch {
      if (typeof ack === "function") {
        ack({ status: "error", message: "Workspace not found." });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Workspace Unsubscription Handler
  // ---------------------------------------------------------------------------
  socket.on(REALTIME_EVENTS.WORKSPACE_UNSUBSCRIBE, (rawPayload: unknown, ack?: WorkspaceRoomAck) => {
    try {
      if (!socketRateLimiter.checkLimit(socket.id, "unsubscribe", 15, 5000)) {
        if (typeof ack === "function") {
          ack({ status: "error", message: "Rate limit exceeded." });
        }
        return;
      }

      const parseResult = workspaceUnsubscribeSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        if (typeof ack === "function") {
          ack({ status: "error", message: "Invalid payload." });
        }
        return;
      }

      const { workspaceId } = parseResult.data;
      const room = getWorkspaceRoom(workspaceId);

      socket.leave(room);

      // Remove socket presence immediately (0-sec grace period for explicit unsubscribe)
      presenceRegistry.removeSocketPresence(
        workspaceId.trim(),
        socket.id,
        true,
        (wsId, snapshot) => {
          socket.to(getWorkspaceRoom(wsId)).emit(REALTIME_EVENTS.PRESENCE_UPDATED, snapshot);
        },
      );

      if (typeof ack === "function") {
        ack({ status: "ok", workspaceId: workspaceId.trim() });
      }
    } catch {
      if (typeof ack === "function") {
        ack({ status: "error", message: "Invalid payload." });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Ephemeral Resource Viewing Handler
  // ---------------------------------------------------------------------------
  socket.on(REALTIME_EVENTS.PRESENCE_VIEWING, async (rawPayload: unknown) => {
    try {
      if (!socketRateLimiter.checkLimit(socket.id, "viewing", 25, 5000)) {
        return;
      }

      const payloadSchema = z.object({
        workspaceId: z.string(),
        viewing: resourceViewingSchema,
      });

      const parseResult = payloadSchema.safeParse(rawPayload);
      if (!parseResult.success) return;

      const { workspaceId, viewing } = parseResult.data;
      const room = getWorkspaceRoom(workspaceId);

      // Authorization Check: Socket MUST be currently in the workspace room
      if (!socket.rooms.has(room)) return;

      // Resource Authorization Check
      if (viewing) {
        const { resourceType, resourceId } = viewing;
        if (!Types.ObjectId.isValid(resourceId)) return;

        if (resourceType === "project") {
          const projectExists = await Project.exists({
            _id: new Types.ObjectId(resourceId),
            workspaceId: new Types.ObjectId(workspaceId),
            isDeleted: false,
          });
          if (!projectExists) return;
        } else if (resourceType === "task") {
          const taskExists = await Task.exists({
            _id: new Types.ObjectId(resourceId),
            workspaceId: new Types.ObjectId(workspaceId),
            isDeleted: false,
          });
          if (!taskExists) return;
        }
      }

      // Update viewing state in PresenceRegistry
      const snapshot = presenceRegistry.updateViewing(workspaceId.trim(), socket.id, viewing);
      if (snapshot) {
        socket.nsp.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATED, snapshot);
      }
    } catch (err) {
      console.error("[PresenceHandler] Error processing presence:viewing:", err);
    }
  });
}
