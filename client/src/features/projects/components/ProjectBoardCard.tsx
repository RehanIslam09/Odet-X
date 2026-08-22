import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { ProjectIcon } from "@/components/common/ProjectIcon.js";
import type { Project } from "@/features/projects/types/projects.types.js";

interface ProjectBoardCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export const ProjectBoardCard = memo(function ProjectBoardCard({
  project,
  onEdit,
  onArchive,
  onDelete,
}: ProjectBoardCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(project.updatedAt), {
    addSuffix: true,
  });

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs transition-all duration-200 hover:border-border hover:shadow-xs hover:-translate-y-0.5"
      style={{ borderLeftColor: project.color, borderLeftWidth: 3 }}
    >
      {/* Card link overlay */}
      <Link
        to={`/projects/${project.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`View project ${project.name}`}
      />

      <div className="mb-2.5 flex items-center justify-between z-10">
        <ProjectIcon icon={project.emoji} color={project.color} size="sm" />

        <div className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-100 md:opacity-0 transition-opacity duration-150 md:group-hover:opacity-100 focus:opacity-100"
                aria-label={`Options for ${project.name}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                id={`board-edit-project-${project.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
              >
                <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem
                id={`board-archive-project-${project.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(project);
                }}
              >
                <Archive className="mr-2 h-4 w-4 text-muted-foreground" />
                {project.archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                id={`board-delete-project-${project.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-w-0 flex-1 z-10 pointer-events-none mb-3">
        <h3 className="truncate text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        {project.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-muted-foreground/60">No description provided</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground z-10 pointer-events-none">
        <span className="flex items-center gap-1 text-[10px]">
          <Clock className="h-3 w-3 shrink-0" />
          {updatedAgo}
        </span>
      </div>
    </div>
  );
});
