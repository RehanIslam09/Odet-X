import { Link } from "react-router-dom";
import { ArrowRight, FolderKanban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/features/projects/hooks";

const RECENT_PROJECTS_LIMIT = 4;

/**
 * Recent projects.
 *
 * Compact dashboard widget showing the user's most recently updated projects.
 * The data comes from the same React Query cache as the Projects page.
 */
export function RecentProjects() {
  const { data, isLoading } = useProjects();

  const projects = data?.items ?? [];

  const recent = projects
    .filter((project) => !project.archived)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime(),
    )
    .slice(0, RECENT_PROJECTS_LIMIT);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Recent projects
        </h2>

        <Button
          id="recent-projects-view-all"
          variant="ghost"
          size="sm"
          asChild
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Link to="/projects">
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {isLoading &&
          Array.from({ length: RECENT_PROJECTS_LIMIT }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2"
            >
              <Skeleton className="h-8 w-8 rounded-lg" />

              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}

        {!isLoading && recent.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <FolderKanban className="h-6 w-6 text-muted-foreground/50" />

            <p className="text-xs text-muted-foreground">
              No projects yet — create one to see it here.
            </p>
          </div>
        )}

        {!isLoading &&
          recent.map((project) => (
            <Link
              key={project.id}
              to="/projects"
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                style={{
                  backgroundColor: `${project.color}18`,
                }}
              >
                {project.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {project.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(
                    new Date(project.updatedAt),
                    {
                      addSuffix: true,
                    },
                  )}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}