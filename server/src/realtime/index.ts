export { createRealtimeServer, type RealtimeServerOptions, type RealtimeServerInstance } from "./socket-server.js";
export { userSessionRegistry, UserSessionRegistry } from "./session-registry.js";
export { socketRateLimiter, SocketRateLimiter } from "./socket-rate-limiter.js";
export { socketAuthMiddleware } from "./socket-auth.middleware.js";
export { getWorkspaceRoom } from "./room-utils.js";
export { REALTIME_EVENTS, type RealtimeEventName } from "./constants.js";
export { notifyWorkspaceMemberRemoved } from "./revocation.js";
export { registerWorkspaceRoomHandlers } from "./handlers/workspace-room.handler.js";

// Event Bus & Schemas
export { domainEventBus, LocalDomainEventBus } from "./event-bus/local-domain-event-bus.js";
export { RealtimeEventRelay, attachRealtimeEventRelay } from "./event-bus/realtime-event-relay.js";
export { createDomainEvent, domainEventEnvelopeSchema, type CreateDomainEventParams } from "./schemas/domain-event.schema.js";
export type { IDomainEventBus, IDomainEventPublisher, IDomainEventSubscriber, DomainEventHandler } from "./event-bus/domain-event-bus.interface.js";
export type { DomainEventType, ResourceType, EventResourceRef, RealtimeEventEnvelope } from "./event-bus/domain-event.types.js";

export { presenceRegistry, PresenceRegistry } from "./presence/presence-registry.js";
export {
  workspacePresenceSnapshotSchema,
  resourceViewingSchema,
  type ResourceViewing,
  type PresenceUser,
  type WorkspacePresenceSnapshot,
  type ViewingResourceType,
} from "./presence/presence-types.js";

export type { AuthenticatedSocket, AuthenticatedUserData, SocketData } from "./socket-types.js";
export type { WorkspaceSubscribePayload, WorkspaceUnsubscribePayload } from "./schemas/workspace-room.schema.js";
