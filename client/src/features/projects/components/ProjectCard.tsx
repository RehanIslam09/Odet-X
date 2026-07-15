import { motion } from "framer-motion";
import { Archive, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Project } from "@/features/projects/types/projects.types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: Project;
  index: number;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A single project card in the dashboard grid.
 *
 * Design decisions:
 * - The emoji acts as the project's visual avatar — no generic icon fallback.
 * - The color accent is applied as a subtle left border, not a distracting
 *   full background — the card should feel informational, not decorative.
 * - Framer Motion enter animation is staggered by index for a premium feel.
 * - The MoreHorizontal menu appears on hover to keep the resting state clean.
 * - Archive badge is always visible when archived — the user should never
 *   accidentally forget they're looking at archived projects.
 */
export function ProjectCard({
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
    >
      <div
        className="relative flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        style={{ borderLeftColor: project.color, borderLeftWidth: 3 }}
      >
        {/* Header: Emoji + Menu */}
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl shadow-sm"
            style={{ backgroundColor: `${project.color}18` }}
          >
            {project.emoji}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                aria-label={`Options for ${project.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                id={`edit-project-${project.id}`}
                onClick={() => onEdit(project)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem
                id={`archive-project-${project.id}`}
                onClick={() => onArchive(project)}
              >
                <Archive className="mr-2 h-4 w-4" />
                {project.archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                id={`delete-project-${project.id}`}
                onClick={() => onDelete(project)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Project name */}
        <h3 className="mb-1 line-clamp-1 text-sm font-semibold tracking-tight text-foreground">
          {project.name}
        </h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {project.description || (
            <span className="italic opacity-60">No description</span>
          )}
        </p>

        {/* Footer: badges + time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {project.archived && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs font-medium"
              >
                Archived
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{updatedAgo}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
