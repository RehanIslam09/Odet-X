import { Skeleton } from "@/components/ui/skeleton";

interface TaskSkeletonProps {
  count?: number;
}

export function TaskSkeleton({ count = 5 }: TaskSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-lg border border-border/60 bg-card/40"
        >
          {/* Left section: status + title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-4 w-3/4 max-w-[360px] rounded-sm" />
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-3 w-16 rounded-sm md:hidden" />
                <Skeleton className="h-3.5 w-12 rounded-sm" />
                <Skeleton className="h-3.5 w-12 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Right section: metadata details */}
          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20 rounded-sm hidden md:block" />
              <Skeleton className="h-4.5 w-16 rounded-sm" />
              <Skeleton className="h-4 w-12 rounded-sm" />
              <Skeleton className="h-4 w-8 rounded-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4.5 w-14 rounded-full" />
              <Skeleton className="h-4.5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
