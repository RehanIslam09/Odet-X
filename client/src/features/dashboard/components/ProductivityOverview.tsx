import { useMemo } from "react";
import { Archive, FolderKanban, ListChecks } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/features/projects/hooks";

/**
 * Productivity overview.
 *
 * Displays a small set of real metrics derived from the authenticated
 * user's projects. Task metrics remain placeholders until the Task
 * feature is implemented.
 */
export function ProductivityOverview() {
  const { data, isLoading } = useProjects();

  const projects = data?.items ?? [];

  const { active, archived } = useMemo(() => {
    return {
      active: projects.filter((project) => !project.archived).length,
      archived: projects.filter((project) => project.archived).length,
    };
  }, [projects]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-tight">
        Overview
      </h2>

      <div className="grid flex-1 grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />

          {isLoading ? (
            <Skeleton className="h-6 w-8" />
          ) : (
            <span className="text-xl font-semibold tracking-tight">
              {active}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            Active projects
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
          <Archive className="h-4 w-4 text-muted-foreground" />

          {isLoading ? (
            <Skeleton className="h-6 w-8" />
          ) : (
            <span className="text-xl font-semibold tracking-tight">
              {archived}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            Archived
          </span>
        </div>

        <div className="col-span-2 flex flex-col gap-1.5 rounded-lg border border-dashed p-3">
          <ListChecks className="h-4 w-4 text-muted-foreground/60" />

          <span className="text-xl font-semibold tracking-tight text-muted-foreground/60">
            —
          </span>

          <span className="text-xs text-muted-foreground">
            Tasks completed this week — tracked once tasks ship.
          </span>
        </div>
      </div>
    </div>
  );
}