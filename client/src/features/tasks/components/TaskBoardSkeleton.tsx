import { Skeleton } from "@/components/ui/skeleton";

export function TaskBoardSkeleton() {
  return (
    <div className="flex h-full w-full overflow-x-auto gap-4 pb-4">
      {Array.from({ length: 5 }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex h-full w-[300px] shrink-0 flex-col rounded-xl border border-border/40 bg-muted/20 p-3"
        >
          {/* Header Skeleton */}
          <div className="mb-3 flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>

          {/* Cards Skeleton */}
          <div className="space-y-2.5">
            {Array.from({ length: colIdx % 2 === 0 ? 3 : 2 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="flex flex-col gap-2 rounded-lg border border-border/40 bg-card p-3.5"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
