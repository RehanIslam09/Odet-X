import { Bell } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount";
import { NotificationPopover } from "./NotificationPopover";

export function NotificationBell() {
  const { data, isError } = useUnreadNotificationCount();
  const unreadCount = data?.count ?? 0;

  // Render a clean fallback button if the unread count entirely fails to fetch
  if (isError) {
    return (
      <Button variant="ghost" size="icon" className="relative h-10 w-10">
        <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
      </Button>
    );
  }

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <ErrorBoundary fallback={<div />}>
      <NotificationPopover>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label="Notifications"
        >
          <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {displayCount}
            </Badge>
          )}
        </Button>
      </NotificationPopover>
    </ErrorBoundary>
  );
}
