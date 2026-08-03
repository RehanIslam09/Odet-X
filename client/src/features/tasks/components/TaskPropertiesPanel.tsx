import { memo } from "react";
import { Link } from "react-router-dom";
import { Folder, Calendar, User, Tag, Sparkles } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { ProjectIcon } from "@/components/common/ProjectIcon.js";
import { TaskStatusBadge } from "./TaskStatusBadge.js";
import { TaskPriorityBadge } from "./TaskPriorityBadge.js";
import { useGenerateTaskLabels } from "@/features/ai";
import type { Task } from "@/features/tasks/types/tasks.types.js";
import type { Project } from "@/features/projects/types/projects.types.js";

interface TaskPropertiesPanelProps {
  task: Task;
  project?: Project | null;
}

export const TaskPropertiesPanel = memo(function TaskPropertiesPanel({
  task,
  project,
}: TaskPropertiesPanelProps) {
  const { mutate: generateLabels, isPending: generatingLabels } = useGenerateTaskLabels(task.id);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4 text-xs">
      <h3 className="font-semibold text-foreground tracking-tight text-sm border-b pb-2">
        Properties
      </h3>

      <div className="space-y-3">
        {/* Project */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <Folder className="h-4 w-4" />
            <span>Project</span>
          </div>
          <div className="flex-1 min-w-0 flex justify-end">
            {project ? (
              <Link 
                to={`/projects/${project.id}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-background border border-border rounded-md hover:bg-muted transition-colors max-w-full"
              >
                <ProjectIcon icon={project.emoji} color={project.color} size="xs" />
                <span className="truncate">{project.name}</span>
              </Link>
            ) : (
              <span className="text-muted-foreground italic">No project</span>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <div className="h-4 w-4 flex items-center justify-center rounded-full border border-muted-foreground/30" />
            <span>Status</span>
          </div>
          <div className="flex-1 flex justify-end">
            <TaskStatusBadge status={task.status} />
          </div>
        </div>

        {/* Priority */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <Tag className="h-4 w-4" />
            <span>Priority</span>
          </div>
          <div className="flex-1 flex justify-end">
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Assignee */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <User className="h-4 w-4" />
            <span>Assignee</span>
          </div>
          <div className="flex-1 text-right truncate">
            {task.assigneeId ? (
              <span className="font-medium text-foreground">Assigned</span>
            ) : (
              <span className="text-muted-foreground italic">Unassigned</span>
            )}
          </div>
        </div>

        {/* Due Date */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <Calendar className="h-4 w-4" />
            <span>Due Date</span>
          </div>
          <div className="flex-1 text-right font-medium text-foreground">
            {task.dueDate ? (
              format(new Date(task.dueDate), "MMM d, yyyy")
            ) : (
              <span className="text-muted-foreground italic">No due date</span>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Labels</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10 cursor-pointer"
              onClick={() => generateLabels()}
              disabled={generatingLabels}
              aria-label="AI Labels"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{generatingLabels ? "Generating..." : "AI Labels"}</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {task.labels && task.labels.length > 0 ? (
              task.labels.map((label) => (
                <Badge key={label} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground italic text-[11px]">No labels</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
