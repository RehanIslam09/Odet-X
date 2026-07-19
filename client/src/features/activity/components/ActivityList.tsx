import type { Activity } from "../types/activity.types";
import { ActivityItem } from "./ActivityItem";
import { ActivityEmptyState } from "./ActivityEmptyState";
import { ActivityErrorState } from "./ActivityErrorState";
import { ActivityListSkeleton } from "./ActivityListSkeleton";

interface ActivityListProps {
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry?: () => void;
  skeletonCount?: number;
}

export function ActivityList({
  activities,
  isLoading,
  isError,
  error,
  onRetry,
  skeletonCount = 5,
}: ActivityListProps) {
  if (isLoading && activities.length === 0) {
    return <ActivityListSkeleton count={skeletonCount} />;
  }

  if (isError && activities.length === 0) {
    return (
      <ActivityErrorState
        onRetry={onRetry}
        message={error?.message}
      />
    );
  }

  if (activities.length === 0) {
    return <ActivityEmptyState />;
  }

  return (
    <div className="flex flex-col space-y-6">
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}
