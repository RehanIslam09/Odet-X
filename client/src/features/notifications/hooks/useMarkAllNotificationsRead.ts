import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../services/notification.api";
import { notificationKeys } from "./notification.keys";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.unreadCount(),
      });

      const prevCount = queryClient.getQueryData<{ count: number }>(
        notificationKeys.unreadCount(),
      );

      // Optimistically set to 0
      queryClient.setQueryData(notificationKeys.unreadCount(), { count: 0 });

      return { prevCount };
    },
    onError: (_err, _variables, context) => {
      if (context?.prevCount) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.prevCount,
        );
      }
    },
    onSettled: () => {
      // Synchronize all feeds authoritatively
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
