import { Calendar, Clock, Folder, Tag, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

import { Button } from "@/components/ui/button.js";
import type { Task } from "../types/tasks.types.js";
import { useProject } from "@/features/projects/hooks/useProject.js";
import { useGenerateTaskLabels } from "@/features/ai";
import { TaskStatusBadge } from "./TaskStatusBadge.js";
import { TaskPriorityBadge } from "./TaskPriorityBadge.js";
import { isTaskOverdue } from "../utils/task.utils.js";

interface TaskPropertiesPanelProps {
  task: Task;
}

export function TaskPropertiesPanel({ task }: TaskPropertiesPanelProps) {
  const { data: projectRes } = useProject(task.projectId ?? undefined);
  const project = projectRes?.project;

  const { mutate: generateLabels, isPending: isGeneratingLabels } = useGenerateTaskLabels(task.id);

  const isOverdue = isTaskOverdue(task.dueDate, task.status);

  return (
    <div className="flex flex-col gap-6 p-5 bg-muted/30 border border-border/60 rounded-xl">
      <h3 className="font-semibold text-sm text-foreground">Properties</h3>
      
      <div className="flex flex-col gap-4 text-sm">
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
                {project.emoji && <span className="shrink-0">{project.emoji}</span>}
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground"><path d="M2 13V3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13Z" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span>Priority</span>
          </div>
          <div className="flex-1 flex justify-end">
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Due Date */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <Calendar className="h-4 w-4" />
            <span>Due Date</span>
          </div>
          <div className="flex-1 min-w-0 flex justify-end">
            {task.dueDate ? (
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${isOverdue ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-foreground bg-background border-border'}`}>
                {format(new Date(task.dueDate), "MMM d, yyyy")}
                {isOverdue && " (Overdue)"}
              </span>
            ) : (
              <span className="text-muted-foreground italic">None</span>
            )}
          </div>
        </div>

        {/* Estimated Time */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0">
            <Clock className="h-4 w-4" />
            <span>Estimate</span>
          </div>
          <div className="flex-1 min-w-0 flex justify-end">
            {task.estimatedTime ? (
              <span className="px-2 py-0.5 bg-background border border-border rounded-md text-xs font-medium text-foreground">
                {task.estimatedTime}
              </span>
            ) : (
              <span className="text-muted-foreground italic">None</span>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 w-28 shrink-0 mt-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Labels</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateLabels()}
              disabled={isGeneratingLabels}
              className="h-6 px-1.5 text-[11px] gap-1 w-fit text-muted-foreground hover:text-foreground -ml-1 mt-0.5"
              title="Auto-generate AI labels for this task"
            >
              {isGeneratingLabels ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI Labels
                </>
              )}
            </Button>
          </div>
          <div className="flex-1 min-w-0 flex flex-wrap justify-end gap-1.5">
            {task.labels && task.labels.length > 0 ? (
              task.labels.map((label) => (
                <span 
                  key={label}
                  className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium border border-border/50"
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground italic mt-1">None</span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border/60 w-full my-1" />

      <div className="flex flex-col gap-2 text-[11px] text-muted-foreground">
        <div className="flex justify-between">
          <span>Created</span>
          <span>{format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <div className="flex justify-between">
          <span>Last updated</span>
          <span>{format(new Date(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
      </div>
    </div>
  );
}
