import { AuthenticatedSocket } from "./socket-types.js";

/**
 * Ephemeral, process-local registry tracking active Socket.IO connections per user.
 * Supports multiple concurrent tabs/devices per user and provides targeted
 * disconnect capabilities for session/revocation management.
 */
export class UserSessionRegistry {
  private sessions = new Map<string, Map<string, AuthenticatedSocket>>();

  /**
   * Registers an authenticated socket for a specific user ID.
   */
  public register(userId: string, socket: AuthenticatedSocket): void {
    if (!userId || !socket) return;

    let userSockets = this.sessions.get(userId);
    if (!userSockets) {
      userSockets = new Map<string, AuthenticatedSocket>();
      this.sessions.set(userId, userSockets);
    }

    userSockets.set(socket.id, socket);
  }

  /**
   * Unregisters a single socket by user ID and socket ID.
   * Removes user key if no active sockets remain.
   */
  public unregister(userId: string, socketId: string): void {
    if (!userId || !socketId) return;

    const userSockets = this.sessions.get(userId);
    if (!userSockets) return;

    userSockets.delete(socketId);

    if (userSockets.size === 0) {
      this.sessions.delete(userId);
    }
  }

  /**
   * Returns an array of active sockets for the specified user ID.
   */
  public getSocketsForUser(userId: string): AuthenticatedSocket[] {
    const userSockets = this.sessions.get(userId);
    if (!userSockets) return [];
    return Array.from(userSockets.values());
  }

  /**
   * Forces immediate disconnection of all active sockets belonging to the specified user ID.
   */
  public disconnectUserSockets(userId: string): void {
    const sockets = this.getSocketsForUser(userId);
    for (const socket of sockets) {
      socket.disconnect(true);
    }
    this.sessions.delete(userId);
  }

  /**
   * Returns the count of distinct users currently connected.
   */
  public getConnectedUserCount(): number {
    return this.sessions.size;
  }

  /**
   * Returns the total count of active sockets across all connected users.
   */
  public getActiveSocketCount(): number {
    let total = 0;
    for (const userSockets of this.sessions.values()) {
      total += userSockets.size;
    }
    return total;
  }

  /**
   * Clears all session references (primarily for unit test isolation).
   */
  public clear(): void {
    this.sessions.clear();
  }
}

export const userSessionRegistry = new UserSessionRegistry();
