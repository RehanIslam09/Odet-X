import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../services/notification.api";
import { notificationKeys } from "./notification.keys";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationApi.markAsRead(notificationId),
    onMutate: async () => {
      // Cancel pending refetches of unread count to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: notificationKeys.unreadCount(),
      });

      const prevCount = queryClient.getQueryData<{ count: number }>(
        notificationKeys.unreadCount(),
      );

      // Optimistically decrement the unread count, but never below zero
      if (prevCount && prevCount.count > 0) {
        queryClient.setQueryData(notificationKeys.unreadCount(), {
          count: prevCount.count - 1,
        });
      }

      return { prevCount };
    },
    onError: (_err, _newVal, context) => {
      // Rollback optimistic count if mutation fails
      if (context?.prevCount) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.prevCount,
        );
      }
    },
    onSettled: () => {
      // Authoritatively invalidate lists so Unread/All feeds stay in sync correctly.
      // We do not try to manually crawl the infinite queries to modify `readAt`
      // or remove items from the unread list because it is fragile.
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
