import { Activity } from "lucide-react";
import { useActivities } from "../hooks/useActivities";
import { ActivityList } from "./ActivityList";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "react-error-boundary";
import { ActivityErrorState } from "./ActivityErrorState";

interface EntityActivityTimelineProps {
  projectId?: string;
  taskId?: string;
}

function EntityActivityTimelineContent({ projectId, taskId }: EntityActivityTimelineProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivities({ projectId, taskId, limit: 5 });

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mt-8 flex flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Project Activity
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

export function EntityActivityTimeline(props: EntityActivityTimelineProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <div className="mt-8 flex flex-col rounded-xl border bg-card p-4 shadow-sm">
          <ActivityErrorState
            message="Failed to load project activity."
            onRetry={() => resetErrorBoundary()}
          />
        </div>
      )}
    >
      <EntityActivityTimelineContent {...props} />
    </ErrorBoundary>
  );
}
