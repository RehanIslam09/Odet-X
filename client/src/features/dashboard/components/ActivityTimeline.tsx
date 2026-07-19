import { Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useActivities } from "@/features/activity/hooks/useActivities";
import { ActivityList } from "@/features/activity/components/ActivityList";

export function ActivityTimeline() {
  const { data, isLoading, isError, error, refetch } = useActivities({ limit: 10 });

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Recent Activity
          </h2>
        </div>
        {activities.length > 0 && (
          <Link
            to="/activities"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ActivityList
          activities={activities}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeletonCount={5}
        />
      </div>
    </div>
  );
}