import { Types } from "mongoose";
import Activity, { IActivityDocument } from "@/models/activity.model.js";
import { ActivityType } from "@/constants/activity.js";

import { createDomainEvent, domainEventBus } from "@/realtime/index.js";

export interface BaseActivityPayload {
  owner: string;
  actorId: string;
  workspaceId?: string; // Phase 32: tenant boundary - passed from service layer context
  type: ActivityType;
  entityType: "project" | "task";
  entityId: string;
  projectId?: string | null;
  contextProjectIds?: string[];
  taskId?: string | null;
  metadata: Record<string, any>; // constructed safely server-side
}

export interface CursorPaginatedResult<T> {
  items: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

/**
 * Persists an activity record.
 * Uses a true best-effort failure strategy. Does not throw errors to the caller,
 * preventing a successful domain mutation from appearing as a 500 error.
 */
export async function recordActivity(payload: BaseActivityPayload): Promise<void> {
  try {
    const activity = await Activity.create({
      owner: new Types.ObjectId(String(payload.owner)),
      actorId: new Types.ObjectId(String(payload.actorId)),
      ...(payload.workspaceId && { workspaceId: new Types.ObjectId(String(payload.workspaceId)) }),
      type: payload.type,
      entityType: payload.entityType,
      entityId: new Types.ObjectId(String(payload.entityId)),
      projectId: payload.projectId ? new Types.ObjectId(String(payload.projectId)) : null,
      contextProjectIds: payload.contextProjectIds?.map(id => new Types.ObjectId(String(id))) || [],
      taskId: payload.taskId ? new Types.ObjectId(String(payload.taskId)) : null,
      metadata: payload.metadata,
    });

    if (payload.workspaceId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: "activity.created",
          workspaceId: payload.workspaceId,
          actorId: payload.actorId,
          resource: {
            type: "activity",
            id: activity._id.toString(),
          },
          payload: {
            type: payload.type,
            entityType: payload.entityType,
            entityId: payload.entityId,
          },
        }),
      );
    }
  } catch (error) {
    console.error("[Activity Service] Failed to record activity:", error);
  }
}

/**
 * Persists multiple activity records efficiently in a single round trip.
 * Uses best-effort failure strategy.
 */
export async function recordActivities(payloads: BaseActivityPayload[]): Promise<void> {
  if (payloads.length === 0) return;

  try {
    const docs = payloads.map(p => ({
      owner: new Types.ObjectId(p.owner),
      actorId: new Types.ObjectId(p.actorId),
      ...(p.workspaceId && { workspaceId: new Types.ObjectId(p.workspaceId) }),
      type: p.type,
      entityType: p.entityType,
      entityId: new Types.ObjectId(p.entityId),
      projectId: p.projectId ? new Types.ObjectId(p.projectId) : null,
      contextProjectIds: p.contextProjectIds?.map(id => new Types.ObjectId(id)) || [],
      taskId: p.taskId ? new Types.ObjectId(p.taskId) : null,
      metadata: p.metadata,
    }));
    await Activity.insertMany(docs, { ordered: false });
  } catch (error) {
    console.error("[Activity Service] Failed to record activities batch:", error);
  }
}

/**
 * Retrieves a paginated list of activities, securely scoped to the active workspace.
 *
 * Tenant isolation:
 * - When workspaceId is provided (Phase 32 path): filter strictly by workspaceId.
 * - Fallback (legacy path without workspaceId): filter by owner userId for backward compat.
 */
export async function listActivities(
  userId: string,
  query: { cursor?: string | undefined; limit: number; projectId?: string | undefined; taskId?: string | undefined },
  explicitWorkspaceId?: string,
): Promise<CursorPaginatedResult<IActivityDocument>> {
  const { cursor, limit, projectId, taskId } = query;

  const filter: Record<string, any> = {};

  if (explicitWorkspaceId) {
    // Phase 32: Tenant-scoped filter - primary security boundary
    filter.workspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    // Legacy fallback: owner-scoped (used when no workspace context available)
    filter.owner = new Types.ObjectId(userId);
  }

  if (projectId) {
    // Backward compatibility: match either the new context array or the legacy projectId field.
    const projectObjId = new Types.ObjectId(projectId);
    filter.$or = [
      { contextProjectIds: projectObjId },
      { projectId: projectObjId },
    ];
  }
  if (taskId) filter.taskId = new Types.ObjectId(taskId);
  if (cursor) filter._id = { $lt: new Types.ObjectId(cursor) };

  const items = await Activity.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .exec();

  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop(); // Remove the extra item
  }

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!._id.toString() : null;

  return {
    items,
    pagination: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}
