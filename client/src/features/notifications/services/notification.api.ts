import { apiClient } from "@/services/axios";
import type {
  CursorPaginatedNotifications,
  NotificationQueryDto,
} from "../types/notification.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const notificationApi = {
  getNotifications: async (
    params?: NotificationQueryDto,
  ): Promise<CursorPaginatedNotifications> => {
    const response = await apiClient.get<
      ApiResponse<CursorPaginatedNotifications>
    >("/notifications", { params });
    const data = response.data.data;
    // Normalize _id from lean() to id to prevent missing key warnings
    data.items = data.items.map((item: import("../types/notification.types").Notification & { _id?: string }) => ({
      ...item,
      id: item._id || item.id,
    }));
    return data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
      "/notifications/unread-count",
    );
    return response.data.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    // API responds with { success: true, message: string } (no data payload)
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    const response = await apiClient.patch<
      ApiResponse<{ modifiedCount: number }>
    >("/notifications/read-all");
    return response.data.data;
  },
};
