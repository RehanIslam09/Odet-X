import { Skeleton } from "@/components/ui/skeleton.js";

export function TaskDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-64 md:w-96" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 shrink-0" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
        </div>
        <div className="w-full md:w-64 lg:w-80 shrink-0">
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
