import { useActivities } from "../hooks/useActivities";
import { ActivityList } from "../components/ActivityList";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";

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
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader 
        title="Activity" 
        description="A timeline of everything happening in your workspace." 
        className="mb-8"
      />

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
  );
}
