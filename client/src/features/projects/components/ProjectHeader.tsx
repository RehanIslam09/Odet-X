import { Archive, ArrowLeft, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { ProjectIcon } from "@/components/common/ProjectIcon.js";
import type { Project } from "@/features/projects/types/projects.types.js";

interface ProjectHeaderProps {
  project: Project;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onAskCopilot?: () => void;
}

export function ProjectHeader({
  project,
  onEdit,
  onArchive,
  onDelete,
  onAskCopilot,
}: ProjectHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 w-fit gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex items-center gap-3">
          <ProjectIcon
            icon={project.emoji}
            color={project.color}
            size="lg"
          />

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>
              {project.archived && (
                <Badge variant="secondary" className="h-5 px-2 text-xs font-medium">
                  Archived
                </Badge>
              )}
            </div>
          </div>
        </div>

        {project.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground mt-2">
            {project.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
        {onAskCopilot && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAskCopilot}
            className="gap-2 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 font-medium"
          >
            <Sparkles className="h-4 w-4" />
            Ask Copilot
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive} className="gap-2">
          <Archive className="h-4 w-4" />
          {project.archived ? "Unarchive" : "Archive"}
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
