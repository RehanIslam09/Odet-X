import { useActivities } from "../hooks/useActivities";
import { ActivityList } from "../components/ActivityList";
import { Button } from "@/components/ui/button";

export default function ActivityPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivities();

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Activity
            </h1>
            <p className="mt-2 text-muted-foreground">
              A timeline of everything happening in your workspace.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <ActivityList
              activities={activities}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={refetch}
              skeletonCount={10}
            />

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
    </div>
  );
}
