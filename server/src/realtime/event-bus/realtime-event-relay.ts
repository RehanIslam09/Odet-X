import { Server as SocketIOServer } from "socket.io";

import { REALTIME_EVENTS } from "../constants.js";
import { getWorkspaceRoom } from "../room-utils.js";
import { domainEventEnvelopeSchema } from "../schemas/domain-event.schema.js";
import { SocketData } from "../socket-types.js";
import { IDomainEventSubscriber } from "./domain-event-bus.interface.js";
import { RealtimeEventEnvelope } from "./domain-event.types.js";

/**
 * Transport bridge relaying internal Domain Collaboration Events from IDomainEventBus
 * to authorized Socket.IO workspace rooms.
 */
export class RealtimeEventRelay {
  private unsubscribe?: (() => void) | undefined;

  constructor(
    private io: SocketIOServer<any, any, any, SocketData>,
    private bus: IDomainEventSubscriber,
  ) {}

  /**
   * Attaches the event relay to the domain event bus.
   */
  public attach(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.unsubscribe = this.bus.subscribe("*", (event: RealtimeEventEnvelope) => {
      this.relayEvent(event);
    });
  }

  /**
   * Detaches the event relay from the domain event bus.
   */
  public detach(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Validates and relays a DomainEvent envelope to its target workspace room over Socket.IO.
   */
  private relayEvent(event: RealtimeEventEnvelope): void {
    try {
      const parseResult = domainEventEnvelopeSchema.safeParse(event);
      if (!parseResult.success) {
        console.error("[RealtimeEventRelay] Rejected invalid domain event envelope:", parseResult.error.format());
        return;
      }

      const room = getWorkspaceRoom(event.workspaceId);

      // Server-side workspace room fanout
      this.io.to(room).emit(REALTIME_EVENTS.DOMAIN_EVENT, event);
    } catch (error) {
      console.error("[RealtimeEventRelay] Error relaying event to workspace room:", error);
    }
  }
}

export function attachRealtimeEventRelay(
  io: SocketIOServer<any, any, any, SocketData>,
  bus: IDomainEventSubscriber,
): RealtimeEventRelay {
  const relay = new RealtimeEventRelay(io, bus);
  relay.attach();
  return relay;
}
