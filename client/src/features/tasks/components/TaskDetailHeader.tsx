import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { ProjectIcon } from "@/components/common/ProjectIcon.js";
import type { Task } from "@/features/tasks/types/tasks.types.js";
import type { Project } from "@/features/projects/types/projects.types.js";

interface TaskDetailHeaderProps {
  task: Task;
  project?: Project | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TaskDetailHeader = memo(function TaskDetailHeader({
  task,
  project,
  onEdit,
  onDelete,
}: TaskDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b pb-4">
      <div className="flex flex-col gap-2 min-w-0">
        {/* Breadcrumb / Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {project ? (
            <>
              <Link 
                to="/projects" 
                className="hover:text-foreground transition-colors flex items-center"
              >
                Projects
              </Link>
              <span>/</span>
              <Link 
                to={`/projects/${project.id}`}
                className="hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <ProjectIcon icon={project.emoji} color={project.color} size="xs" />
                <span className="truncate max-w-[150px]">{project.name}</span>
              </Link>
              <span>/</span>
              <span className="text-foreground truncate max-w-[200px]">Task</span>
            </>
          ) : (
            <>
              <Link 
                to="/tasks" 
                className="hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Tasks
              </Link>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground break-words">
          {task.title}
        </h1>
      </div>

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete} 
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
