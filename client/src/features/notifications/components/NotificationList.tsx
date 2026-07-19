import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "../types/notification.types";
import { NotificationItem } from "./NotificationItem";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { NotificationErrorState } from "./NotificationErrorState";

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  skeletonCount?: number;
  emptyStateFilter?: "all" | "unread" | "read";
  onSelect?: () => void;
}

export function NotificationList({
  notifications,
  isLoading,
  isError,
  onRetry,
  skeletonCount = 5,
  emptyStateFilter = "all",
  onSelect,
}: NotificationListProps) {
  if (isError) {
    return <NotificationErrorState onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b p-4 last:border-b-0">
            <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return <NotificationEmptyState statusFilter={emptyStateFilter} />;
  }

  return (
    <div className="flex flex-col">
      {notifications.map((notification, idx) => (
        <div
          key={notification.id}
          className={
            idx !== notifications.length - 1 ? "border-b border-border" : ""
          }
        >
          <NotificationItem notification={notification} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
