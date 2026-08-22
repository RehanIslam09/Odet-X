import { Types } from "mongoose";
import Notification from "@/models/notification.model.js";
import WorkspaceInvitation from "@/models/workspace-invitation.model.js";
import Workspace from "@/models/workspace.model.js";
import Task from "@/models/task.model.js";
import Project from "@/models/project.model.js";
import { NotificationType } from "@/constants/notification.js";
import { NotificationQueryDto } from "@/validators/notification.validator.js";
import { NotFoundError } from "@/utils/app-error.js";

export interface CreateNotificationPayload {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: "project" | "task" | "workspaceMember" | "system" | null;
  entityId?: string | null;
  workspaceId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
}

/**
 * Best-effort internal helper to create a notification.
 * Swallows errors and logs them to ensure primary domain mutations don't fail.
 */
export const createNotification = async (payload: CreateNotificationPayload): Promise<void> => {
  try {
    const docData: any = {
      ...payload,
      recipientId: new Types.ObjectId(String(payload.recipientId)),
      actorId: payload.actorId ? new Types.ObjectId(String(payload.actorId)) : null,
      workspaceId: payload.workspaceId ? new Types.ObjectId(String(payload.workspaceId)) : null,
      entityId: payload.entityId ? new Types.ObjectId(String(payload.entityId)) : null,
      metadata: payload.metadata || {},
    };
    if (docData.dedupeKey === null) delete docData.dedupeKey;
    const notification = new Notification(docData);
    await notification.save();
  } catch (error) {
    console.error("Failed to create notification (best-effort):", error);
  }
};

/**
 * Strict internal helper for background workers.
 */
export const createNotificationStrict = async (payload: CreateNotificationPayload): Promise<boolean> => {
  try {
    const docData: any = {
      ...payload,
      recipientId: new Types.ObjectId(String(payload.recipientId)),
      actorId: payload.actorId ? new Types.ObjectId(String(payload.actorId)) : null,
      workspaceId: payload.workspaceId ? new Types.ObjectId(String(payload.workspaceId)) : null,
      entityId: payload.entityId ? new Types.ObjectId(String(payload.entityId)) : null,
      metadata: payload.metadata || {},
    };
    if (docData.dedupeKey === null) delete docData.dedupeKey;
    const notification = new Notification(docData);
    await notification.save();
    return true;
  } catch (error: any) {
    if (error?.code === 11000) {
      return false;
    }
    throw error;
  }
};

/**
 * Retrieves a cursor-paginated list of notifications for the specified user.
 */
export const getNotifications = async (
  userId: string,
  query: NotificationQueryDto,
) => {
  const { cursor, limit, readStatus } = query;
  const userObjectId = new Types.ObjectId(userId);

  const filter: Record<string, any> = { recipientId: userObjectId };

  if (readStatus === "unread") {
    filter.readAt = null;
  } else if (readStatus === "read") {
    filter.readAt = { $ne: null };
  }

  if (cursor) {
    filter._id = { $lt: new Types.ObjectId(cursor) };
  }

  const items = await Notification.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = items.length > limit;

  if (hasMore) {
    items.pop();
  }

  // Collect invitation tokens & workspace ObjectIds to resolve workspace slugs dynamically
  const tokensToFetch = items
    .map((it: any) => it.metadata?.token)
    .filter((tok: any): tok is string => typeof tok === "string" && tok.length > 0);

  const wsIdsToFetchSet = new Set<string>();
  const taskIdsToResolve: Types.ObjectId[] = [];
  const projectIdsToResolve: Types.ObjectId[] = [];

  items.forEach((it: any) => {
    const directWsId = it.workspaceId || it.metadata?.workspaceId;
    if (directWsId) {
      wsIdsToFetchSet.add(directWsId.toString());
    } else if (it.entityId && Types.ObjectId.isValid(String(it.entityId))) {
      if (it.entityType === "task") {
        taskIdsToResolve.push(new Types.ObjectId(String(it.entityId)));
      } else if (it.entityType === "project") {
        projectIdsToResolve.push(new Types.ObjectId(String(it.entityId)));
      }
    }
  });

  const taskWsMap = new Map<string, string>();
  const projectWsMap = new Map<string, string>();

  if (taskIdsToResolve.length > 0) {
    const tasks = await Task.find({ _id: { $in: taskIdsToResolve } }).select("workspaceId").lean();
    tasks.forEach((t: any) => {
      if (t.workspaceId) {
        const wsIdStr = t.workspaceId.toString();
        taskWsMap.set(t._id.toString(), wsIdStr);
        wsIdsToFetchSet.add(wsIdStr);
      }
    });
  }

  if (projectIdsToResolve.length > 0) {
    const projects = await Project.find({ _id: { $in: projectIdsToResolve } }).select("workspaceId").lean();
    projects.forEach((p: any) => {
      if (p.workspaceId) {
        const wsIdStr = p.workspaceId.toString();
        projectWsMap.set(p._id.toString(), wsIdStr);
        wsIdsToFetchSet.add(wsIdStr);
      }
    });
  }

  const invMap = new Map<string, any>();
  if (tokensToFetch.length > 0) {
    const invitations = await WorkspaceInvitation.find({ token: { $in: tokensToFetch } }).lean();
    for (const inv of invitations) {
      invMap.set(inv.token, inv);
      if (inv.workspaceId) wsIdsToFetchSet.add(inv.workspaceId.toString());
    }
  }

  const wsObjIds = Array.from(wsIdsToFetchSet)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const workspaces = wsObjIds.length > 0 ? await Workspace.find({ _id: { $in: wsObjIds } }).lean() : [];
  const wsMap = new Map<string, { id: string; slug: string; name: string }>();
  workspaces.forEach((w: any) => {
    wsMap.set(w._id.toString(), { id: w._id.toString(), slug: w.slug, name: w.name });
  });

  for (const item of items as any[]) {
    const rawWsId =
      item.workspaceId?.toString() ||
      item.metadata?.workspaceId ||
      (item.entityType === "task" && item.entityId ? taskWsMap.get(item.entityId.toString()) : undefined) ||
      (item.entityType === "project" && item.entityId ? projectWsMap.get(item.entityId.toString()) : undefined);

    let wsData = rawWsId ? wsMap.get(String(rawWsId)) : undefined;

    const tok = item.metadata?.token;
    if (tok) {
      const inv = invMap.get(tok);
      if (!inv) {
        item.metadata = { ...(item.metadata || {}), status: "EXPIRED", workspaceUnavailable: true };
      } else {
        let currentStatus: string = inv.status;
        if (inv.status === "PENDING" && inv.expiresAt < new Date()) {
          currentStatus = "EXPIRED";
        }
        const invWsData = inv.workspaceId ? wsMap.get(inv.workspaceId.toString()) : undefined;
        if (invWsData && !wsData) wsData = invWsData;

        item.metadata = {
          ...(item.metadata || {}),
          status: currentStatus,
          workspaceUnavailable: !invWsData,
        };
      }
    }

    if (wsData) {
      item.workspaceId = wsData.id;
      item.workspaceSlug = wsData.slug;
      item.metadata = {
        ...(item.metadata || {}),
        workspaceId: wsData.id,
        workspaceSlug: wsData.slug,
        workspaceName: item.metadata?.workspaceName || wsData.name,
      };
    }
  }

  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1]!._id.toString() : null;

  return {
    items,
    pagination: {
      nextCursor,
      hasMore,
      limit,
    },
  };
};

/**
 * Retrieves the count of unread notifications for a user.
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({
    recipientId: new Types.ObjectId(userId),
    readAt: null,
  });
};

/**
 * Marks a specific notification as read.
 */
export const markNotificationAsRead = async (
  userId: string,
  notificationId: string,
): Promise<void> => {
  const result = await Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(userId),
    },
    { $set: { readAt: new Date() } },
    { new: true },
  );

  if (!result) {
    throw new NotFoundError("Notification not found");
  }
};

/**
 * Marks all unread notifications for a user as read.
 */
export const markAllNotificationsAsRead = async (
  userId: string,
): Promise<number> => {
  const result = await Notification.updateMany(
    {
      recipientId: new Types.ObjectId(userId),
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );

  return result.modifiedCount;
};
