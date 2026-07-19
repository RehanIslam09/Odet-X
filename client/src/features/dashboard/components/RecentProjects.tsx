import { Link } from "react-router-dom";
import { ArrowRight, FolderKanban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DashboardRecentProject } from "@/features/dashboard/types/dashboard.types";

interface RecentProjectsProps {
  recentProjects: DashboardRecentProject[];
}

/**
 * Recent projects.
 *
 * Compact dashboard widget showing the user's most recently updated projects.
 * The data comes directly from the Dashboard overview endpoint.
 */
export function RecentProjects({ recentProjects }: RecentProjectsProps) {
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
        {recentProjects.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              No projects yet — create one to see it here.
            </p>
          </div>
        )}

        {recentProjects.map(({ project, progress }) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
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

              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(new Date(project.updatedAt), {
                    addSuffix: true,
                  })}
                </p>
                <span className="text-[10px] text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1.5" aria-label={`${progress.completionPercentage}% complete`}>
                  <Progress value={progress.completionPercentage} className="h-1.5 w-12" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {progress.completionPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}