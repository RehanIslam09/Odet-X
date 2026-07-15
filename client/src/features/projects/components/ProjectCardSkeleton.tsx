import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder for a ProjectCard.
 *
 * Matches the visual structure of the real card to avoid layout shift
 * when content loads. Displayed during the initial data fetch.
 */
export function ProjectCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* Title */}
      <Skeleton className="mb-1.5 h-4 w-3/4 rounded" />

      {/* Description lines */}
      <Skeleton className="mb-1 h-3 w-full rounded" />
      <Skeleton className="mb-4 h-3 w-2/3 rounded" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
  );
}
