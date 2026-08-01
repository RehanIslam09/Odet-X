import { EventEmitter } from "events";

import { domainEventEnvelopeSchema } from "../schemas/domain-event.schema.js";
import {
  DomainEventHandler,
  IDomainEventBus,
} from "./domain-event-bus.interface.js";
import { RealtimeEventEnvelope } from "./domain-event.types.js";

/**
 * In-process, EventEmitter-backed implementation of IDomainEventBus.
 * Provides fault-isolated event publishing and subscription for the single-API-process architecture.
 */
export class LocalDomainEventBus implements IDomainEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Increase max listeners ceiling to accommodate test suites and multiple subscribers cleanly
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publishes a canonical DomainEvent envelope to registered subscribers.
   * Isolates errors so subscriber failures NEVER throw back to publisher or roll back DB mutations.
   */
  public async publish<T>(event: RealtimeEventEnvelope<T>): Promise<void> {
    const parseResult = domainEventEnvelopeSchema.safeParse(event);
    if (!parseResult.success) {
      console.error("[DomainEventBus] Invalid domain event envelope rejected:", parseResult.error.format());
      return;
    }

    const listeners = [
      ...this.emitter.listeners(event.type),
      ...this.emitter.listeners("*"),
    ];

    for (const listener of listeners) {
      try {
        const result = (listener as DomainEventHandler<T>)(event);
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch((err) => {
            console.error("[DomainEventBus] Async subscriber error contained:", err);
          });
        }
      } catch (error) {
        console.error("[DomainEventBus] Sync subscriber error contained:", error);
      }
    }
  }

  /**
   * Subscribes a handler to a specific DomainEventType or wildcard ("*").
   * Returns an unsubscribe cleanup function.
   */
  public subscribe<T>(
    eventType: string | "*",
    handler: DomainEventHandler<T>,
  ): () => void {
    this.emitter.on(eventType, handler);
    return () => {
      this.emitter.off(eventType, handler);
    };
  }

  /**
   * Removes all registered event listeners (primarily for test cleanup).
   */
  public clear(): void {
    this.emitter.removeAllListeners();
  }
}

export const domainEventBus = new LocalDomainEventBus();
