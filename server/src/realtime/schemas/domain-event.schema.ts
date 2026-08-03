import { Types } from "mongoose";
import { z } from "zod";

import {
  DomainEventType,
  RealtimeEventEnvelope,
  ResourceType,
} from "../event-bus/domain-event.types.js";

const DOMAIN_EVENT_TYPES = [
  "task.created",
  "task.updated",
  "task.archived",
  "task.deleted",
  "project.created",
  "project.updated",
  "project.archived",
  "project.deleted",
  "activity.created",
  "member.invited",
  "member.added",
  "member.updated",
  "member.removed",
  "workspace.ownerTransferred",
  "plan.created",
  "plan.committed",
] as const;

const RESOURCE_TYPES = [
  "task",
  "project",
  "activity",
  "workspaceMember",
  "plan",
] as const;

export const domainEventEnvelopeSchema = z.object({
  id: z.string().min(1),
  protocolVersion: z.literal(1),
  type: z.enum(DOMAIN_EVENT_TYPES),
  workspaceId: z.string().refine((val) => Types.ObjectId.isValid(val.trim()), {
    message: "Invalid workspaceId ObjectId format.",
  }),
  actorId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val.trim()), {
      message: "Invalid actorId ObjectId format.",
    })
    .optional(),
  occurredAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid ISO 8601 occurredAt date string.",
  }),
  resource: z.object({
    type: z.enum(RESOURCE_TYPES),
    id: z.string().min(1),
    version: z.number().int().nonnegative().optional(),
  }),
  payload: z.unknown(),
});

export interface CreateDomainEventParams<T> {
  type: DomainEventType;
  workspaceId: string;
  actorId?: string;
  resource: {
    type: ResourceType;
    id: string;
    version?: number;
  };
  payload: T;
}

/**
 * Server-controlled factory creating a canonical DomainEvent envelope.
 * Automatically assigns server-generated UUID v4, protocolVersion 1, and UTC ISO timestamp.
 * Runtime-validates created envelope against Zod schema.
 */
export function createDomainEvent<T>(
  params: CreateDomainEventParams<T>,
): RealtimeEventEnvelope<T> {
  const event: RealtimeEventEnvelope<T> = {
    id: crypto.randomUUID(),
    protocolVersion: 1,
    type: params.type,
    workspaceId: params.workspaceId.trim(),
    ...(params.actorId ? { actorId: params.actorId.trim() } : {}),
    occurredAt: new Date().toISOString(),
    resource: {
      type: params.resource.type,
      id: params.resource.id.trim(),
      ...(typeof params.resource.version === "number"
        ? { version: params.resource.version }
        : {}),
    },
    payload: params.payload,
  };

  // Runtime validation
  domainEventEnvelopeSchema.parse(event);

  return event;
}
