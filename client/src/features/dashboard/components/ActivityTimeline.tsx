import { Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useActivities } from "@/features/activity/hooks/useActivities";
import { ActivityList } from "@/features/activity/components/ActivityList";
import { ErrorBoundary } from "react-error-boundary";
import { ActivityErrorState } from "@/features/activity/components/ActivityErrorState";

function ActivityTimelineContent() {
  // Query 5 items for the dashboard, no cursor needed.
  const { data, isLoading, isError, error, refetch } = useActivities({ limit: 5 });

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Recent Activity
          </h2>
        </div>
        <Link
          to="/activities"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-hidden">
        <ActivityList
          activities={activities}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeletonCount={3}
        />
      </div>
    </div>
  );
}

export function ActivityTimeline() {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <div className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm">
          <ActivityErrorState
            message="Failed to load activity feed."
            onRetry={() => resetErrorBoundary()}
          />
        </div>
      )}
    >
      <ActivityTimelineContent />
    </ErrorBoundary>
  );
}