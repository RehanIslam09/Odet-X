import type { NotificationQueryDto } from "../types/notification.types";

export const notificationKeys = {
  all: ["notifications"] as const,

  lists: () => [...notificationKeys.all, "list"] as const,

  list: (params?: NotificationQueryDto) =>
    [...notificationKeys.lists(), params] as const,

  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};
