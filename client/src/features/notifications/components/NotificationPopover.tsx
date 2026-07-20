import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import { useNotifications } from "../hooks/useNotifications";
import { useMarkAllNotificationsRead } from "../hooks/useMarkAllNotificationsRead";
import { NotificationList } from "./NotificationList";
import { NotificationErrorState } from "./NotificationErrorState";

interface NotificationPopoverProps {
  children: React.ReactNode;
}

export function NotificationPopover({ children }: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Lazy fetch: only enabled when the popover is open
  const { data, isPending, isError, error, refetch } = useNotifications(
    { limit: 5 },
    { enabled: isOpen },
  );
  
  const markAllRead = useMarkAllNotificationsRead();

  const rawNotifications = data?.pages.flatMap((page) => page.items) ?? [];
  const notifications = Array.from(
    new Map(rawNotifications.map((n) => [n.id, n])).values(),
  );
  const hasUnread = notifications.some((n) => n.readAt === null);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96" sideOffset={8}>
        <ErrorBoundary
          fallback={<NotificationErrorState onRetry={() => refetch()} />}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <h4 className="font-semibold">Notifications</h4>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-primary hover:text-primary"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
          <Separator />
          <div className="overflow-y-auto max-h-[min(400px,60vh)]">
            <NotificationList
              notifications={notifications}
              isLoading={isPending}
              isError={isError}
              error={error}
              onRetry={refetch}
              skeletonCount={3}
              emptyStateFilter="all"
              onSelect={() => setIsOpen(false)}
            />
          </div>
          <Separator />
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-center text-sm font-medium text-primary hover:bg-muted"
          >
            View all notifications
          </Link>
        </ErrorBoundary>
      </PopoverContent>
    </Popover>
  );
}
