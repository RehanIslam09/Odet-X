import { Activity } from "lucide-react";
import { useActivities } from "../hooks/useActivities";
import { ActivityList } from "./ActivityList";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "react-error-boundary";
import { ActivityErrorState } from "./ActivityErrorState";

interface TaskActivityTimelineProps {
  taskId: string;
}

function TaskActivityTimelineContent({ taskId }: TaskActivityTimelineProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivities({ taskId, limit: 5 });

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mt-8 flex flex-col pt-4 border-t border-border/40">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Task History
        </h2>
      </div>

      <ActivityList
        activities={activities}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        skeletonCount={3}
      />

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full sm:w-auto"
          >
            {isFetchingNextPage ? "Loading..." : "Show more"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TaskActivityTimeline(props: TaskActivityTimelineProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <div className="mt-8 flex flex-col pt-4 border-t border-border/40">
          <ActivityErrorState
            message="Failed to load task history."
            onRetry={() => resetErrorBoundary()}
          />
        </div>
      )}
    >
      <TaskActivityTimelineContent {...props} />
    </ErrorBoundary>
  );
}
