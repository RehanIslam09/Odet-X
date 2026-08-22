import { useMemo } from "react";
import { FolderKanban, PlayCircle, PauseCircle, CheckCircle2, Archive } from "lucide-react";

import { Badge } from "@/components/ui/badge.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { ProjectBoardCard } from "./ProjectBoardCard.js";
import { ProjectEmptyState } from "./ProjectEmptyState.js";
import type { Project } from "@/features/projects/types/projects.types.js";

export type ProjectBoardColumnStatus = "planning" | "active" | "on_hold" | "completed" | "archived";

interface ColumnDef {
  id: ProjectBoardColumnStatus;
  title: string;
  icon: typeof FolderKanban;
  colorClass: string;
  badgeClass: string;
}

const BOARD_COLUMNS: ColumnDef[] = [
  {
    id: "planning",
    title: "Planning",
    icon: FolderKanban,
    colorClass: "text-sky-500",
    badgeClass: "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400",
  },
  {
    id: "active",
    title: "Active",
    icon: PlayCircle,
    colorClass: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  {
    id: "on_hold",
    title: "On Hold",
    icon: PauseCircle,
    colorClass: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle2,
    colorClass: "text-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400",
  },
  {
    id: "archived",
    title: "Archived",
    icon: Archive,
    colorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
];

interface ProjectBoardViewProps {
  projects: Project[];
  isLoading?: boolean;
  onCreateProject: () => void;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectBoardView({
  projects,
  isLoading = false,
  onCreateProject,
  onEdit,
  onArchive,
  onDelete,
}: ProjectBoardViewProps) {
  // Group projects into board columns dynamically
  const groupedProjects = useMemo(() => {
    const map: Record<ProjectBoardColumnStatus, Project[]> = {
      planning: [],
      active: [],
      on_hold: [],
      completed: [],
      archived: [],
    };

    projects.forEach((proj) => {
      if (proj.archived) {
        map.archived.push(proj);
      } else {
        const rawStatus = (proj as Project & { status?: ProjectBoardColumnStatus }).status;
        if (rawStatus && map[rawStatus]) {
          map[rawStatus].push(proj);
        } else {
          map.active.push(proj);
        }
      }
    });

    return map;
  }, [projects]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((col) => (
          <div key={col} className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/40 p-3">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return <ProjectEmptyState onCreateProject={onCreateProject} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-start">
      {BOARD_COLUMNS.map((col) => {
        const Icon = col.icon;
        const columnProjects = groupedProjects[col.id] || [];

        return (
          <div
            key={col.id}
            className="flex flex-col rounded-xl border border-border/60 bg-muted/20 p-3 min-h-[360px]"
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`h-4 w-4 shrink-0 ${col.colorClass}`} />
                <h3 className="text-xs font-semibold tracking-tight text-foreground uppercase truncate">
                  {col.title}
                </h3>
              </div>

              <Badge variant="outline" className={`h-5 px-1.5 text-[10px] font-mono ${col.badgeClass}`}>
                {columnProjects.length}
              </Badge>
            </div>

            {/* Column Cards */}
            <div className="flex flex-col gap-3.5 flex-1">
              {columnProjects.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/40 p-4 text-center">
                  <p className="text-[11px] text-muted-foreground/60 italic">No projects</p>
                </div>
              ) : (
                columnProjects.map((project) => (
                  <ProjectBoardCard
                    key={project.id}
                    project={project}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
