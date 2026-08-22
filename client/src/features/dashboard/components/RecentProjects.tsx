import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FolderKanban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { ProjectIcon } from "@/components/common/ProjectIcon.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import type { DashboardRecentProject } from "@/features/dashboard/types/dashboard.types.js";

interface RecentProjectsProps {
  recentProjects: DashboardRecentProject[];
}

export const RecentProjects = memo(function RecentProjects({
  recentProjects,
}: RecentProjectsProps) {
  const { currentWorkspace } = useActiveWorkspace();
  const projectsLink = currentWorkspace ? `/w/${currentWorkspace.slug}/projects` : "/projects";

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500 shrink-0">
            <FolderKanban className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold tracking-tight text-foreground uppercase truncate">
              Recent Projects
            </h2>
          </div>
        </div>

        <Button
          id="recent-projects-view-all"
          variant="ghost"
          size="sm"
          asChild
          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground cursor-pointer"
        >
          <Link to={projectsLink}>
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        {recentProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <FolderKanban className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No projects active yet — create one to start tracking.
            </p>
          </div>
        ) : (
          recentProjects.slice(0, 4).map(({ project, progress }) => {
            const projectLink = currentWorkspace
              ? `/w/${currentWorkspace.slug}/projects/${project.id}`
              : `/projects/${project.id}`;

            return (
              <Link
                key={project.id}
                to={projectLink}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
              >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <ProjectIcon
                  icon={project.emoji}
                  color={project.color}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })} • {progress.completed}/{progress.total} tasks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end gap-0.5" aria-label={`${progress.completionPercentage}% complete`}>
                  <Badge variant="outline" className="h-4 text-[9px] font-semibold border-primary/30 text-primary bg-primary/5 px-1 py-0">
                    {progress.completionPercentage}%
                  </Badge>
                </div>
              </div>
            </Link>
          );
        })
        )}
      </div>
    </div>
  );
});
