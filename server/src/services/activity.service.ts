import { Types } from "mongoose";
import Activity, { IActivityDocument } from "@/models/activity.model.js";
import { ActivityType } from "@/constants/activity.js";

export interface BaseActivityPayload {
  owner: string;
  actorId: string;
  type: ActivityType;
  entityType: "project" | "task";
  entityId: string;
  projectId?: string | null;
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
    await Activity.create({
      owner: new Types.ObjectId(payload.owner),
      actorId: new Types.ObjectId(payload.actorId),
      type: payload.type,
      entityType: payload.entityType,
      entityId: new Types.ObjectId(payload.entityId),
      projectId: payload.projectId ? new Types.ObjectId(payload.projectId) : null,
      taskId: payload.taskId ? new Types.ObjectId(payload.taskId) : null,
      metadata: payload.metadata,
    });
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
      type: p.type,
      entityType: p.entityType,
      entityId: new Types.ObjectId(p.entityId),
      projectId: p.projectId ? new Types.ObjectId(p.projectId) : null,
      taskId: p.taskId ? new Types.ObjectId(p.taskId) : null,
      metadata: p.metadata,
    }));
    await Activity.insertMany(docs, { ordered: false });
  } catch (error) {
    console.error("[Activity Service] Failed to record activities batch:", error);
  }
}

/**
 * Retrieves a paginated list of activities, securely scoped to the tenant (owner).
 */
export async function listActivities(
  userId: string,
  query: { cursor?: string | undefined; limit: number; projectId?: string | undefined; taskId?: string | undefined }
): Promise<CursorPaginatedResult<IActivityDocument>> {
  const { cursor, limit, projectId, taskId } = query;

  const filter: Record<string, any> = {
    owner: new Types.ObjectId(userId),
  };

  if (projectId) filter.projectId = new Types.ObjectId(projectId);
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
