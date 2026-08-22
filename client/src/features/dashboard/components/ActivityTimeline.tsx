import { Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useActivities } from "@/features/activity/hooks/useActivities.js";
import { ActivityList } from "@/features/activity/components/ActivityList.js";
import { ErrorBoundary } from "react-error-boundary";
import { ActivityErrorState } from "@/features/activity/components/ActivityErrorState.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

function ActivityTimelineContent() {
  const { data, isLoading, isError, error, refetch } = useActivities({ limit: 5 });
  const { currentWorkspace } = useActiveWorkspace();

  const activities = data?.pages.flatMap((page) => page.items) ?? [];
  const activitiesLink = currentWorkspace ? `/w/${currentWorkspace.slug}/activities` : "/activities";

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-xs font-semibold tracking-tight text-foreground uppercase truncate">
            Recent Activity
          </h2>
        </div>
        <Link
          to={activitiesLink}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="min-h-[120px]">
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
        <div className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
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
