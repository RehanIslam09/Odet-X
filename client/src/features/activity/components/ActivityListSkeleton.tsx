interface ActivityListSkeletonProps {
  count?: number;
}

export function ActivityListSkeleton({ count = 5 }: ActivityListSkeletonProps) {
  return (
    <div className="flex flex-col space-y-6 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="relative flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
              <div className="h-4 w-4 rounded-full bg-muted" />
            </div>
            {i !== count - 1 && (
              <div className="absolute top-8 bottom-0 w-px -mb-6 bg-border" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-1.5 pb-2">
            <div className="h-4 w-3/4 rounded-md bg-muted" />
            <div className="h-3 w-24 rounded-md bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
