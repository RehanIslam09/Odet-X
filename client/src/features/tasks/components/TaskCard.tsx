import { Archive, Calendar, Clock, MoreHorizontal, Pencil, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { TaskStatusBadge } from "./TaskStatusBadge.js";
import { TaskPriorityBadge } from "./TaskPriorityBadge.js";
import type { Task } from "../types/tasks.types.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onArchive: (task: Task) => void;
  onDelete: (task: Task) => void;
}

/**
 * Formats a YYYY-MM-DD date into a relative, reader-friendly string.
 */
function formatDueDate(dueDateStr?: string | null) {
  if (!dueDateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${monthNames[due.getMonth()]} ${due.getDate()}`;

  if (diffDays < 0) {
    return {
      text: `${formattedDate} (Overdue)`,
      style: "text-red-500 border-red-500/20 bg-red-500/5",
    };
  } else if (diffDays === 0) {
    return {
      text: "Today",
      style: "text-blue-500 border-blue-500/20 bg-blue-500/5 font-medium",
    };
  } else if (diffDays === 1) {
    return {
      text: "Tomorrow",
      style: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    };
  } else if (diffDays < 7) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
      text: days[due.getDay()],
      style: "text-muted-foreground border-border/80 bg-muted/20",
    };
  } else {
    return {
      text: formattedDate,
      style: "text-muted-foreground border-border/80 bg-muted/20",
    };
  }
}

export function TaskCard({ task, onEdit, onArchive, onDelete }: TaskCardProps) {
  const dateMeta = formatDueDate(task.dueDate);

  return (
    <div
      className={cn(
        "group flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 md:py-2.5 md:px-4 rounded-lg border border-border/60 bg-card hover:bg-muted/10 hover:border-border transition-all duration-150 shadow-2xs hover:shadow-xs",
        task.status === "done" && "opacity-85 hover:opacity-100",
        task.status === "cancelled" && "opacity-60 hover:opacity-100"
      )}
    >
      {/* Left Column: Status, Title, Labels */}
      <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
        {/* Status Indicator */}
        <div className="pt-0.5 md:pt-0 shrink-0">
          <TaskStatusBadge status={task.status} className="border-none bg-transparent p-0 text-muted-foreground group-hover:text-foreground" />
        </div>

        {/* Task Title and Tags */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1 min-w-0">
          <span
            className={cn(
              "text-[13px] font-medium tracking-tight text-foreground truncate transition-colors",
              task.status === "done" && "text-muted-foreground/80 line-through",
              task.status === "cancelled" && "text-muted-foreground/60 line-through"
            )}
          >
            {task.title}
          </span>

          {/* Labels List */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap shrink-0">
              {task.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-muted text-muted-foreground/90 border border-border/40"
                >
                  <Tag className="h-2 w-2 text-muted-foreground/50" />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Project, Priority, Due Date, Est Time, Actions */}
      <div className="flex flex-wrap items-center gap-2.5 md:gap-4 shrink-0 justify-between md:justify-end border-t border-border/40 md:border-t-0 pt-2.5 md:pt-0">
        {/* Project Tag */}
        {task.projectName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: task.projectColor || "#71717a" }}
            />
            <span className="text-[11px] font-medium truncate max-w-[100px]">
              {task.projectName}
            </span>
          </div>
        )}

        {/* Separator */}
        <span className="hidden md:block h-3.5 w-px bg-border/60" />

        {/* Priority */}
        <div className="shrink-0">
          <TaskPriorityBadge priority={task.priority} />
        </div>

        {/* Due Date Indicator */}
        {dateMeta && (
          <div
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border transition-colors",
              dateMeta.style
            )}
          >
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{dateMeta.text}</span>
          </div>
        )}

        {/* Estimated Time */}
        {task.estimatedTime && (
          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/30">
            <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <span>{task.estimatedTime}</span>
          </div>
        )}

        {/* Task Actions Dropdown (renders like ProjectCard) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Options for task ${task.title}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              id={`edit-task-${task.id}`}
              onClick={() => onEdit(task)}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              id={`archive-task-${task.id}`}
              onClick={() => onArchive(task)}
            >
              <Archive className="mr-2 h-3.5 w-3.5" />
              {task.archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              id={`delete-task-${task.id}`}
              onClick={() => onDelete(task)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
