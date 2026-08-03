import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/services/axios";
import {
  REALTIME_EVENTS,
  realtimeEventEnvelopeSchema,
  workspaceEvictedSchema,
  workspacePresenceSnapshotSchema,
} from "./realtime-types";
import type {
  RealtimeEventEnvelope,
  WorkspaceEvictedPayload,
  WorkspaceSubscribeAck,
  WorkspacePresenceSnapshot,
  ResourceViewing,
} from "./realtime-types";
import type { RealtimeStatus } from "./RealtimeContext";

type DomainEventHandler = (event: RealtimeEventEnvelope) => void;
type EvictedHandler = (payload: WorkspaceEvictedPayload) => void;
type ConnectionStateListener = (isConnected: boolean) => void;
type StatusListener = (status: RealtimeStatus) => void;
type PresenceHandler = (snapshot: WorkspacePresenceSnapshot) => void;

class RealtimeClient {
  private socket: Socket | null = null;
  private activeWorkspaceId: string | null = null;
  private subscribedWorkspaceId: string | null = null;
  private currentPresence: WorkspacePresenceSnapshot | null = null;
  private status: RealtimeStatus = "disconnected";

  private domainEventHandlers = new Set<DomainEventHandler>();
  private evictedHandlers = new Set<EvictedHandler>();
  private connectionStateListeners = new Set<ConnectionStateListener>();
  private statusListeners = new Set<StatusListener>();
  private presenceHandlers = new Set<PresenceHandler>();

  // Bounded LRU-like recent event ID cache (max 500 IDs)
  private processedEventIds = new Set<string>();
  private maxDeduplicationSize = 500;

  // Track subscription request in flight to resolve races
  private pendingSubscriptionWorkspaceId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        if (this.socket && !this.socket.connected) {
          this.setStatus("reconnecting");
          this.socket.connect();
        } else if (!this.socket && this.activeWorkspaceId) {
          this.setStatus("connecting");
          this.connect();
        }
      });
      window.addEventListener("offline", () => {
        if (this.status !== "disconnected") {
          this.setStatus("offline");
        }
      });
    }
  }

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(newStatus: RealtimeStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      try {
        listener(newStatus);
      } catch (err) {
        console.error("[RealtimeClient] Error in status listener:", err);
      }
    }
  }

  /**
   * Initializes or updates the socket connection using the current access token.
   */
  public connect(customServerUrl?: string): void {
    const token = getAccessToken();
    if (!token) {
      this.disconnect();
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline");
      return;
    }

    if (this.socket) {
      if (this.socket.connected) {
        this.setStatus("connected");
        return;
      }
      this.setStatus("connecting");
      this.socket.connect();
      return;
    }

    this.setStatus("connecting");

    let serverUrl = customServerUrl || import.meta.env.VITE_WS_URL;

    if (!serverUrl) {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        try {
          // Extract origin (e.g. "http://localhost:5000") to prevent Socket.IO from treating path (e.g. "/api/v1") as a namespace
          serverUrl = new URL(apiUrl).origin;
        } catch {
          serverUrl = apiUrl;
        }
      } else if (typeof window !== "undefined") {
        serverUrl = window.location.origin;
      } else {
        serverUrl = "";
      }
    }

    this.socket = io(serverUrl, {
      auth: (cb) => {
        cb({ token: getAccessToken() });
      },
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupSocketListeners(this.socket);
  }

  /**
   * Safely disconnects the socket and resets subscription state.
   */
  public disconnect(): void {
    if (this.socket) {
      if (this.subscribedWorkspaceId) {
        try {
          this.socket.emit(REALTIME_EVENTS.WORKSPACE_UNSUBSCRIBE, {
            workspaceId: this.subscribedWorkspaceId,
          });
        } catch {
          // Ignore error if socket is already closed
        }
      }
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeWorkspaceId = null;
    this.subscribedWorkspaceId = null;
    this.pendingSubscriptionWorkspaceId = null;
    this.currentPresence = null;
    this.notifyConnectionState(false);
    this.setStatus("disconnected");
  }

  /**
   * Sets the active workspace ID and subscribes to server room updates.
   */
  public subscribeWorkspace(workspaceId: string): void {
    if (!workspaceId) return;

    this.activeWorkspaceId = workspaceId;

    // Prevent duplicate subscription calls if already subscribed or currently subscribing
    if (
      this.subscribedWorkspaceId === workspaceId ||
      this.pendingSubscriptionWorkspaceId === workspaceId
    ) {
      return;
    }

    if (!this.socket || !this.socket.connected) {
      this.connect();
      return;
    }

    // Unsubscribe from previous workspace if changing
    if (
      this.subscribedWorkspaceId &&
      this.subscribedWorkspaceId !== workspaceId
    ) {
      this.socket.emit(REALTIME_EVENTS.WORKSPACE_UNSUBSCRIBE, {
        workspaceId: this.subscribedWorkspaceId,
      });
      this.subscribedWorkspaceId = null;
    }

    this.pendingSubscriptionWorkspaceId = workspaceId;

    this.socket.emit(
      REALTIME_EVENTS.WORKSPACE_SUBSCRIBE,
      { workspaceId },
      (ack: WorkspaceSubscribeAck) => {
        // Race check: only process ACK if workspace request is still active
        if (this.pendingSubscriptionWorkspaceId !== workspaceId) {
          return;
        }
        if (ack && ack.status === "ok") {
          this.subscribedWorkspaceId = workspaceId;
          this.pendingSubscriptionWorkspaceId = null;
        } else {
          console.warn(
            `[RealtimeClient] Workspace subscription rejected: ${ack?.message}`,
          );
          this.subscribedWorkspaceId = null;
          this.pendingSubscriptionWorkspaceId = null;
        }
      },
    );
  }

  /**
   * Registers a domain event handler. Returns unsubscribe function.
   */
  public onDomainEvent(handler: DomainEventHandler): () => void {
    this.domainEventHandlers.add(handler);
    return () => {
      this.domainEventHandlers.delete(handler);
    };
  }

  /**
   * Registers a workspace evicted handler. Returns unsubscribe function.
   */
  public onEvicted(handler: EvictedHandler): () => void {
    this.evictedHandlers.add(handler);
    return () => {
      this.evictedHandlers.delete(handler);
    };
  }

  /**
   * Registers a connection state listener. Returns unsubscribe function.
   */
  public onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    // Immediately emit current state
    listener(this.socket ? this.socket.connected : false);
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Gets current socket connection status.
   */
  public isConnected(): boolean {
    return this.socket ? this.socket.connected : false;
  }

  /**
   * Gets currently subscribed workspace ID.
   */
  public getSubscribedWorkspaceId(): string | null {
    return this.subscribedWorkspaceId;
  }

  /**
   * Registers a presence snapshot/update listener. Returns unsubscribe function.
   */
  public onPresenceChange(handler: PresenceHandler): () => void {
    this.presenceHandlers.add(handler);
    if (this.currentPresence) {
      handler(this.currentPresence);
    }
    return () => {
      this.presenceHandlers.delete(handler);
    };
  }

  /**
   * Returns current active workspace presence snapshot.
   */
  public getCurrentPresence(): WorkspacePresenceSnapshot | null {
    return this.currentPresence;
  }

  /**
   * Emits controlled resource viewing awareness to server for current subscribed workspace.
   */
  public setViewingResource(viewing: ResourceViewing | null): void {
    if (!this.socket || !this.socket.connected || !this.activeWorkspaceId) {
      return;
    }

    this.socket.emit(REALTIME_EVENTS.PRESENCE_VIEWING, {
      workspaceId: this.activeWorkspaceId,
      viewing,
    });
  }

  /**
   * Internal socket setup and event routing
   */
  private setupSocketListeners(socket: Socket): void {
    socket.on("connect", () => {
      this.setStatus("connected");
      this.notifyConnectionState(true);
      // Re-authorize active workspace on connect / reconnect
      if (this.activeWorkspaceId) {
        const wsToSubscribe = this.activeWorkspaceId;
        this.subscribedWorkspaceId = null;
        this.subscribeWorkspace(wsToSubscribe);
      }
    });

    socket.on("disconnect", (reason) => {
      this.subscribedWorkspaceId = null;
      this.pendingSubscriptionWorkspaceId = null;
      this.currentPresence = null;
      this.notifyConnectionState(false);

      if (reason === "io client disconnect") {
        this.setStatus("disconnected");
      } else {
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        this.setStatus(isOffline ? "offline" : "reconnecting");
      }
    });

    socket.on("connect_error", (err) => {
      console.warn("[RealtimeClient] Connection error:", err.message);
      this.notifyConnectionState(false);
      if (this.status !== "disconnected") {
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        this.setStatus(isOffline ? "offline" : "reconnecting");
      }
    });

    socket.on(REALTIME_EVENTS.DOMAIN_EVENT, (data: unknown) => {
      this.handleIncomingDomainEvent(data);
    });

    socket.on(REALTIME_EVENTS.WORKSPACE_EVICTED, (data: unknown) => {
      this.handleIncomingEvicted(data);
    });

    socket.on(REALTIME_EVENTS.PRESENCE_SNAPSHOT, (data: unknown) => {
      this.handleIncomingPresence(data);
    });

    socket.on(REALTIME_EVENTS.PRESENCE_UPDATED, (data: unknown) => {
      this.handleIncomingPresence(data);
    });
  }

  /**
   * Runtime validation, deduplication, and workspace eligibility check for incoming domain events.
   */
  private handleIncomingDomainEvent(data: unknown): void {
    const parseResult = realtimeEventEnvelopeSchema.safeParse(data);
    if (!parseResult.success) {
      console.warn(
        "[RealtimeClient] Malformed domain:event envelope ignored:",
        parseResult.error.format(),
      );
      return;
    }

    const event = parseResult.data as RealtimeEventEnvelope;

    // 1. Deduplication check
    if (this.processedEventIds.has(event.id)) {
      return;
    }
    this.recordProcessedEventId(event.id);

    // 2. Defense in Depth: Active Workspace Eligibility check
    if (this.activeWorkspaceId && event.workspaceId !== this.activeWorkspaceId) {
      return;
    }

    // 3. Dispatch to subscribers
    for (const handler of this.domainEventHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error("[RealtimeClient] Error in domain event handler:", err);
      }
    }
  }

  /**
   * Runtime validation and dispatch for workspace eviction notifications.
   */
  private handleIncomingEvicted(data: unknown): void {
    const parseResult = workspaceEvictedSchema.safeParse(data);
    if (!parseResult.success) {
      console.warn(
        "[RealtimeClient] Malformed workspace:evicted payload ignored:",
        parseResult.error.format(),
      );
      return;
    }

    const payload = parseResult.data;

    for (const handler of this.evictedHandlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error("[RealtimeClient] Error in evicted handler:", err);
      }
    }
  }

  /**
   * Runtime validation and dispatch for presence snapshot/update notifications.
   */
  private handleIncomingPresence(data: unknown): void {
    const parseResult = workspacePresenceSnapshotSchema.safeParse(data);
    if (!parseResult.success) {
      console.warn(
        "[RealtimeClient] Malformed presence snapshot/update ignored:",
        parseResult.error.format(),
      );
      return;
    }

    const snapshot = parseResult.data;

    // Defense in Depth: Active Workspace Eligibility check
    if (this.activeWorkspaceId && snapshot.workspaceId !== this.activeWorkspaceId) {
      return;
    }

    this.currentPresence = snapshot;

    for (const handler of this.presenceHandlers) {
      try {
        handler(snapshot);
      } catch (err) {
        console.error("[RealtimeClient] Error in presence handler:", err);
      }
    }
  }

  private recordProcessedEventId(id: string): void {
    if (this.processedEventIds.size >= this.maxDeduplicationSize) {
      const oldestId = this.processedEventIds.values().next().value;
      if (oldestId) {
        this.processedEventIds.delete(oldestId);
      }
    }
    this.processedEventIds.add(id);
  }

  private notifyConnectionState(isConnected: boolean): void {
    for (const listener of this.connectionStateListeners) {
      try {
        listener(isConnected);
      } catch (err) {
        console.error("[RealtimeClient] Error in connection listener:", err);
      }
    }
  }
}

export const realtimeClient = new RealtimeClient();
