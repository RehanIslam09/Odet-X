import { Bell } from "lucide-react";
import type { NotificationReadStatus } from "../types/notification.types";

interface NotificationEmptyStateProps {
  statusFilter?: NotificationReadStatus;
}

export function NotificationEmptyState({
  statusFilter = "all",
}: NotificationEmptyStateProps) {
  let title = "No notifications yet";
  let message = "Important updates and alerts will appear here.";

  if (statusFilter === "unread") {
    title = "You're all caught up";
    message = "You have no unread notifications right now.";
  } else if (statusFilter === "read") {
    title = "No read notifications yet";
    message = "Read notifications will be archived here for reference.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
