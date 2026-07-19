import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

import type { Notification } from "../types/notification.types";
import { getNotificationUrl } from "../utils/notification.utils";
import { useMarkNotificationRead } from "../hooks/useMarkNotificationRead";

interface NotificationItemProps {
  notification: Notification;
  onSelect?: () => void; // Optional callback for popover auto-close
}

export function NotificationItem({
  notification,
  onSelect,
}: NotificationItemProps) {
  const markRead = useMarkNotificationRead();
  const isUnread = notification.readAt === null;

  const url = getNotificationUrl(notification);

  const handleClick = () => {
    if (isUnread) {
      markRead.mutate(notification.id);
    }
    if (onSelect) {
      onSelect();
    }
  };

  const content = (
    <div className="flex w-full gap-3 p-4 transition-colors hover:bg-muted/50">
      <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
        {isUnread && <Circle className="h-2 w-2 fill-primary text-primary" />}
      </div>
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-sm",
            isUnread
              ? "font-medium text-foreground"
              : "font-normal text-muted-foreground",
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            "text-sm line-clamp-2",
            isUnread ? "text-muted-foreground" : "text-muted-foreground/80",
          )}
        >
          {notification.message}
        </p>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </div>
  );

  if (url) {
    return (
      <Link to={url} onClick={handleClick} className="block w-full">
        {content}
      </Link>
    );
  }

  // System notifications without actionable links
  return (
    <div
      role="button"
      tabIndex={0}
      className="block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {content}
    </div>
  );
}
