import { useInfiniteQuery } from "@tanstack/react-query";
import { notificationApi } from "../services/notification.api";
import { notificationKeys } from "./notification.keys";
import type { NotificationQueryDto } from "../types/notification.types";

interface UseNotificationsOptions {
  enabled?: boolean;
}

export function useNotifications(
  params?: Omit<NotificationQueryDto, "cursor">,
  options?: UseNotificationsOptions,
) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ pageParam }) =>
      notificationApi.getNotifications({
        ...params,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Defensive parsing to avoid Phase 15 API envelope bug repeats
      if (!lastPage?.pagination?.hasMore) return undefined;
      return lastPage.pagination.nextCursor ?? undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled,
  });
}
