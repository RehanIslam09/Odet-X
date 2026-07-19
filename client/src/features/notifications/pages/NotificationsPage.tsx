import { useState } from "react";
import { Check } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useNotifications } from "../hooks/useNotifications";
import { useMarkAllNotificationsRead } from "../hooks/useMarkAllNotificationsRead";
import { NotificationList } from "../components/NotificationList";
import type { NotificationReadStatus } from "../types/notification.types";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationReadStatus>("all");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNotifications({ readStatus: filter });

  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];
  // Has unread in current view
  const hasUnread = notifications.some((n) => n.readAt === null);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Notifications
              </h1>
              <p className="mt-2 text-muted-foreground">
                Stay up to date with what needs your attention.
              </p>
            </div>
            {hasUnread && filter !== "read" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b p-4">
              <Tabs
                value={filter}
                onValueChange={(val) => setFilter(val as NotificationReadStatus)}
                className="w-full sm:w-[400px]"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ErrorBoundary fallback={<div className="p-4 text-destructive">Failed to render notifications.</div>}>
              <NotificationList
                notifications={notifications}
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetch}
                skeletonCount={8}
                emptyStateFilter={filter}
              />
            </ErrorBoundary>
          </div>

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading more..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
