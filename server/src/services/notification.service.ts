import { Types } from "mongoose";
import Notification from "@/models/notification.model.js";
import { NotificationType } from "@/constants/notification.js";
import { NotificationQueryDto } from "@/validators/notification.validator.js";
import { NotFoundError } from "@/utils/app-error.js";

export interface CreateNotificationPayload {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: "project" | "task" | "system" | null;
  entityId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort internal helper to create a notification.
 * Swallows errors and logs them to ensure primary domain mutations don't fail.
 */
export const createNotification = async (payload: CreateNotificationPayload): Promise<void> => {
  try {
    const notification = new Notification({
      ...payload,
      recipientId: new Types.ObjectId(payload.recipientId),
      actorId: payload.actorId ? new Types.ObjectId(payload.actorId) : null,
      entityId: payload.entityId ? new Types.ObjectId(payload.entityId) : null,
      metadata: payload.metadata || {},
    });
    await notification.save();
  } catch (error) {
    console.error("Failed to create notification (best-effort):", error);
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

  // Base filter enforces strict BOLA/tenant isolation
  const filter: Record<string, any> = { recipientId: userObjectId };

  if (readStatus === "unread") {
    filter.readAt = null;
  } else if (readStatus === "read") {
    filter.readAt = { $ne: null };
  }

  if (cursor) {
    filter._id = { $lt: new Types.ObjectId(cursor) };
  }

  // Fetch limit + 1 to determine if there is a next page
  const items = await Notification.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = items.length > limit;
  
  if (hasMore) {
    items.pop(); // Remove the extra item
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
 * Idempotent: safe to call on an already-read notification.
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
 * Returns the number of updated documents.
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
