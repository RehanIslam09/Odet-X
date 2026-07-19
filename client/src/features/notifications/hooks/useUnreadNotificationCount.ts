import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../services/notification.api";
import { notificationKeys } from "./notification.keys";

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
