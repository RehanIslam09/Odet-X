import { RealtimeEventEnvelope } from "./domain-event.types.js";

export type DomainEventHandler<T = any> = (
  event: RealtimeEventEnvelope<T>,
) => void | Promise<void>;

export interface IDomainEventPublisher {
  publish<T>(event: RealtimeEventEnvelope<T>): Promise<void>;
}

export interface IDomainEventSubscriber {
  subscribe<T>(
    eventType: string | "*",
    handler: DomainEventHandler<T>,
  ): () => void;
}

export interface IDomainEventBus
  extends IDomainEventPublisher,
    IDomainEventSubscriber {
  clear(): void;
}
