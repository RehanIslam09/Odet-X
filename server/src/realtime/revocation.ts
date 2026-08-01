import { REALTIME_EVENTS } from "./constants.js";
import { getWorkspaceRoom } from "./room-utils.js";
import { userSessionRegistry } from "./session-registry.js";
import { presenceRegistry } from "./presence/presence-registry.js";

/**
 * Revokes workspace room authorization for all active sockets belonging to a target user.
 * Invoked when an authoritative membership removal or workspace deletion occurs.
 */
export function notifyWorkspaceMemberRemoved(workspaceId: string, userId: string): void {
  try {
    if (!workspaceId || !userId) return;

    const room = getWorkspaceRoom(workspaceId);
    const sockets = userSessionRegistry.getSocketsForUser(userId);

    for (const socket of sockets) {
      if (socket.rooms.has(room)) {
        socket.leave(room);
        socket.emit(REALTIME_EVENTS.WORKSPACE_EVICTED, { workspaceId });
      }
    }

    // Immediately evict presence (0-second grace period for security revocation)
    presenceRegistry.evictUserPresence(workspaceId, userId, (wsId, snapshot) => {
      const firstSocket = sockets[0];
      if (firstSocket?.nsp) {
        firstSocket.nsp.to(getWorkspaceRoom(wsId)).emit(REALTIME_EVENTS.PRESENCE_UPDATED, snapshot);
      }
    });
  } catch (error) {
    console.error("[Realtime Revocation] Failed to evict sockets for removed member:", error);
  }
}
