import { Request, Response } from "express";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notification.service.js";
import {
  notificationQuerySchema,
  notificationIdParamSchema,
} from "@/validators/notification.validator.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";

/**
 * GET /api/v1/notifications
 * Retrieves a cursor-paginated list of notifications for the authenticated user.
 */
export const getNotificationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const query = notificationQuerySchema.parse(req.query);

    const result = await getNotifications(userId, query);

    sendSuccessResponse(res, {
      message: "Notifications retrieved successfully",
      data: result,
    });
  },
);

/**
 * GET /api/v1/notifications/unread-count
 * Retrieves the count of unread notifications for the authenticated user.
 */
export const getUnreadCountHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();

    const count = await getUnreadCount(userId);

    sendSuccessResponse(res, {
      message: "Unread count retrieved successfully",
      data: { count },
    });
  },
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a specific notification as read.
 */
export const markAsReadHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const { id } = notificationIdParamSchema.parse(req.params);

    await markNotificationAsRead(userId, id);

    sendSuccessResponse(res, {
      message: "Notification marked as read successfully",
    });
  },
);

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
export const markAllAsReadHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();

    const modifiedCount = await markAllNotificationsAsRead(userId);

    sendSuccessResponse(res, {
      message: "All unread notifications marked as read",
      data: { modifiedCount },
    });
  },
);
