import { AuthenticatedSocket } from "../socket-types.js";
import { PresenceUser, ResourceViewing, WorkspacePresenceSnapshot } from "./presence-types.js";

export interface SocketPresenceState {
  socketId: string;
  userId: string;
  name: string;
  username: string;
  workspaceId: string;
  viewing: ResourceViewing | null;
  updatedAt: number;
}

export type PresenceChangeCallback = (
  workspaceId: string,
  snapshot: WorkspacePresenceSnapshot,
) => void;

/**
 * Ephemeral in-memory registry tracking real-time workspace presence and resource viewing awareness.
 *
 * Invariants:
 * - 100% ephemeral in API process memory. Zero MongoDB persistence.
 * - Multi-tab aware: tracks per-socket state, collapses into a single PresenceUser per user ID.
 * - Supports a 3-second disconnect grace period for accidental transport dropouts.
 * - Supports immediate 0-second eviction for security revocation and explicit unsubscriptions.
 */
export class PresenceRegistry {
  private workspaceSockets = new Map<string, Map<string, SocketPresenceState>>();
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  private disconnectGraceMs = 3000;

  /**
   * Registers a socket's presence in a workspace upon authorized subscription.
   */
  public addSocketPresence(
    workspaceId: string,
    socket: AuthenticatedSocket,
  ): WorkspacePresenceSnapshot {
    if (!workspaceId || !socket || !socket.data?.user) {
      return { workspaceId, users: [] };
    }

    const { userId, name, username } = socket.data.user;
    const timerKey = `${workspaceId}:${socket.id}`;

    // Cancel any pending disconnect grace timer for this socket
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
      this.disconnectTimers.delete(timerKey);
    }

    let socketMap = this.workspaceSockets.get(workspaceId);
    if (!socketMap) {
      socketMap = new Map<string, SocketPresenceState>();
      this.workspaceSockets.set(workspaceId, socketMap);
    }

    const existingState = socketMap.get(socket.id);

    socketMap.set(socket.id, {
      socketId: socket.id,
      userId,
      name,
      username,
      workspaceId,
      viewing: existingState ? existingState.viewing : null,
      updatedAt: Date.now(),
    });

    return this.getSnapshot(workspaceId);
  }

  /**
   * Removes a socket's presence from a workspace.
   * If immediate is true (e.g. explicit unsubscribe or member revocation), removes immediately (0-sec delay).
   * If immediate is false (e.g. transport drop), waits for disconnect grace period before broadcast.
   */
  public removeSocketPresence(
    workspaceId: string,
    socketId: string,
    immediate: boolean,
    onPresenceChanged: PresenceChangeCallback,
  ): void {
    if (!workspaceId || !socketId) return;

    const timerKey = `${workspaceId}:${socketId}`;
    if (this.disconnectTimers.has(timerKey)) {
      clearTimeout(this.disconnectTimers.get(timerKey)!);
      this.disconnectTimers.delete(timerKey);
    }

    const executeRemoval = () => {
      const socketMap = this.workspaceSockets.get(workspaceId);
      if (socketMap) {
        socketMap.delete(socketId);
        if (socketMap.size === 0) {
          this.workspaceSockets.delete(workspaceId);
        }
      }
      onPresenceChanged(workspaceId, this.getSnapshot(workspaceId));
    };

    if (immediate) {
      executeRemoval();
    } else {
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(timerKey);
        executeRemoval();
      }, this.disconnectGraceMs);
      this.disconnectTimers.set(timerKey, timer);
    }
  }

  /**
   * Immediately evicts all presence records for a target user ID from a workspace (0-second grace period).
   * Used for authoritative security revocation when a member is removed from a workspace.
   */
  public evictUserPresence(
    workspaceId: string,
    userId: string,
    onPresenceChanged: PresenceChangeCallback,
  ): void {
    if (!workspaceId || !userId) return;

    const socketMap = this.workspaceSockets.get(workspaceId);
    if (!socketMap) return;

    const socketsToRemove: string[] = [];
    for (const [socketId, state] of socketMap.entries()) {
      if (state.userId === userId) {
        socketsToRemove.push(socketId);
      }
    }

    for (const socketId of socketsToRemove) {
      const timerKey = `${workspaceId}:${socketId}`;
      if (this.disconnectTimers.has(timerKey)) {
        clearTimeout(this.disconnectTimers.get(timerKey)!);
        this.disconnectTimers.delete(timerKey);
      }
      socketMap.delete(socketId);
    }

    if (socketMap.size === 0) {
      this.workspaceSockets.delete(workspaceId);
    }

    onPresenceChanged(workspaceId, this.getSnapshot(workspaceId));
  }

  /**
   * Updates a socket's resource viewing state within a workspace.
   */
  public updateViewing(
    workspaceId: string,
    socketId: string,
    viewing: ResourceViewing | null,
  ): WorkspacePresenceSnapshot | null {
    const socketMap = this.workspaceSockets.get(workspaceId);
    if (!socketMap) return null;

    const state = socketMap.get(socketId);
    if (!state) return null;

    state.viewing = viewing;
    state.updatedAt = Date.now();

    return this.getSnapshot(workspaceId);
  }

  /**
   * Returns a clean, deterministic presence snapshot for a workspace.
   * Multi-tab users with multiple sockets are collapsed into a single PresenceUser,
   * preferring active (non-null) viewing state or most recent update.
   */
  public getSnapshot(workspaceId: string): WorkspacePresenceSnapshot {
    const socketMap = this.workspaceSockets.get(workspaceId);
    if (!socketMap || socketMap.size === 0) {
      return { workspaceId, users: [] };
    }

    const userMap = new Map<string, PresenceUser & { lastUpdated: number }>();

    for (const state of socketMap.values()) {
      const existing = userMap.get(state.userId);
      if (!existing) {
        userMap.set(state.userId, {
          userId: state.userId,
          name: state.name,
          username: state.username,
          viewing: state.viewing,
          lastUpdated: state.updatedAt,
        });
      } else {
        // If existing viewing is null and this socket has a non-null viewing, prefer non-null viewing
        if (!existing.viewing && state.viewing) {
          existing.viewing = state.viewing;
        } else if (state.updatedAt > existing.lastUpdated && state.viewing) {
          existing.viewing = state.viewing;
        }
      }
    }

    // Sort users deterministically by userId for stable client snapshots and test assertions
    const users: PresenceUser[] = Array.from(userMap.values())
      .map(({ userId, name, username, viewing }) => ({
        userId,
        name,
        username,
        viewing,
      }))
      .sort((a, b) => a.userId.localeCompare(b.userId));

    return { workspaceId, users };
  }

  /**
   * Clears all in-memory presence state and active timers (for test isolation).
   */
  public clear(): void {
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.workspaceSockets.clear();
  }
}

export const presenceRegistry = new PresenceRegistry();
