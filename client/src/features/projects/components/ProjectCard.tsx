import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Archive, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge.js";
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

interface ProjectCardProps {
  project: Project;
  index: number;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * A single project card in the Projects Grid.
 * Emphasizes visual hierarchy: Identity -> Title -> Description -> Metadata.
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  index,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(project.updatedAt), {
    addSuffix: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.03, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
    >
      <div
        className="relative flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all duration-200 hover:border-border hover:shadow-xs hover:-translate-y-0.5"
        style={{ borderLeftColor: project.color, borderLeftWidth: 3 }}
      >
        {/* Full-card link overlay */}
        <Link
          to={`/projects/${project.id}`}
          className="absolute inset-0 z-0 rounded-xl"
          aria-label={`View project ${project.name}`}
        />

        {/* 1. Header: Project Identity Icon + Dropdown Actions */}
        <div className="mb-3 flex items-center justify-between z-10">
          <ProjectIcon
            icon={project.emoji}
            color={project.color}
            size="md"
          />

          <div className="relative z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-100 md:opacity-0 transition-opacity duration-150 md:group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Options for ${project.name}`}
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  id={`edit-project-${project.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                  Edit
                </DropdownMenuItem>

                <DropdownMenuItem
                  id={`archive-project-${project.id}`}
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
                  id={`delete-project-${project.id}`}
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

        {/* 2. Title */}
        <h3 className="mb-1 line-clamp-1 text-sm font-semibold tracking-tight text-foreground z-10 pointer-events-none group-hover:text-primary transition-colors">
          {project.name}
        </h3>

        {/* 3. Description */}
        <p className="mb-3.5 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground/90 z-10 pointer-events-none">
          {project.description || (
            <span className="italic opacity-60">No description</span>
          )}
        </p>

        {/* 4. Footer Metadata */}
        <div className="flex items-center justify-between gap-2 z-10 pointer-events-none pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            {project.archived && (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] font-medium"
              >
                Archived
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3 text-muted-foreground/70" />
            <span>{updatedAgo}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default ProjectCard;
