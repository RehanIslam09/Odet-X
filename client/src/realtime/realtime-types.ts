import { z } from "zod";

export const REALTIME_EVENTS = {
  DOMAIN_EVENT: "domain:event",
  WORKSPACE_SUBSCRIBE: "workspace:subscribe",
  WORKSPACE_UNSUBSCRIBE: "workspace:unsubscribe",
  WORKSPACE_EVICTED: "workspace:evicted",
  PRESENCE_SNAPSHOT: "presence:snapshot",
  PRESENCE_UPDATED: "presence:updated",
  PRESENCE_VIEWING: "presence:viewing",
} as const;

export type DomainEventType =
  | "task.created"
  | "task.updated"
  | "task.archived"
  | "task.deleted"
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.deleted"
  | "activity.created"
  | "member.invited"
  | "member.added"
  | "member.updated"
  | "member.removed"
  | "workspace.ownerTransferred"
  | "plan.committed";

export type ResourceType =
  | "task"
  | "project"
  | "workspace"
  | "workspaceMember"
  | "activity"
  | "plan";

export interface RealtimeEventEnvelope<T = Record<string, unknown>> {
  id: string;
  protocolVersion: 1;
  type: DomainEventType;
  workspaceId: string;
  actorId?: string;
  occurredAt: string;
  resource: {
    type: ResourceType;
    id: string;
    version?: number;
  };
  payload: T;
}

export const realtimeEventEnvelopeSchema = z.object({
  id: z.string(),
  protocolVersion: z.literal(1),
  type: z.enum([
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
    "plan.committed",
  ]),
  workspaceId: z.string(),
  actorId: z.string().optional(),
  occurredAt: z.string(),
  resource: z.object({
    type: z.enum(["task", "project", "workspace", "workspaceMember", "activity", "plan"]),
    id: z.string(),
    version: z.number().optional(),
  }),
  payload: z.record(z.string(), z.unknown()),
});

export interface WorkspaceEvictedPayload {
  workspaceId: string;
  targetUserId?: string;
  reason?: string;
}

export const workspaceEvictedSchema = z.object({
  workspaceId: z.string(),
  targetUserId: z.string().optional(),
  reason: z.string().optional(),
});

export interface WorkspaceSubscribeAck {
  status: "ok" | "error";
  workspaceId?: string;
  message?: string;
}

export type ViewingResourceType = "project" | "task";

export interface ResourceViewing {
  resourceType: ViewingResourceType;
  resourceId: string;
}

export const resourceViewingSchema = z
  .object({
    resourceType: z.enum(["project", "task"]),
    resourceId: z.string().min(1),
  })
  .nullable();

export interface PresenceUser {
  userId: string;
  name: string;
  username: string;
  viewing: ResourceViewing | null;
}

export interface WorkspacePresenceSnapshot {
  workspaceId: string;
  users: PresenceUser[];
}

export const workspacePresenceSnapshotSchema = z.object({
  workspaceId: z.string(),
  users: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      username: z.string(),
      viewing: resourceViewingSchema,
    }),
  ),
});
