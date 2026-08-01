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
  | "member.added"
  | "member.updated"
  | "member.removed"
  | "plan.created"
  | "plan.committed";

export type ResourceType =
  | "task"
  | "project"
  | "activity"
  | "workspaceMember"
  | "plan";

export interface EventResourceRef {
  type: ResourceType;
  id: string;
  version?: number;
}

export interface RealtimeEventEnvelope<T = unknown> {
  id: string;
  protocolVersion: 1;
  type: DomainEventType;
  workspaceId: string;
  actorId?: string;
  occurredAt: string;
  resource: EventResourceRef;
  payload: T;
}
