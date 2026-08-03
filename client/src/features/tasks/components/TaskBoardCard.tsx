import { memo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Tag as TagIcon,
  Folder,
} from "lucide-react";
import { format, isBefore, isToday, startOfDay } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

import { TaskPriorityBadge } from "./TaskPriorityBadge.js";
import { TaskStatusSelect } from "./TaskStatusSelect.js";
import { PresenceBadge } from "@/features/workspaces/components/PresenceBadge.js";
import type { Task, TaskPriority, TaskStatus } from "../types/tasks.types.js";

interface TaskBoardCardProps {
  task: Task & { projectName?: string; projectColor?: string };
  isOnline?: boolean;
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onPriorityChange?: (taskId: string, priority: TaskPriority) => void;
  onArchive?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export const TaskBoardCard = memo(function TaskBoardCard({
  task,
  isOnline = false,
  onEdit,
  onArchive,
  onDelete,
}: TaskBoardCardProps) {
  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Due date status evaluation
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue =
    dueDateObj &&
    task.status !== "done" &&
    isBefore(dueDateObj, startOfDay(new Date()));
  const isDueToday = dueDateObj && isToday(dueDateObj);

  return (
    <div
      tabIndex={0}
      className="group relative flex flex-col justify-between rounded-lg border border-border/60 bg-card p-3.5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {/* Top Bar: Project Badge & Context Menu */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.projectName ? (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-medium truncate gap-1 bg-muted/20 border-border/40"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: task.projectColor || "var(--primary)" }}
              />
              <span className="truncate">{task.projectName}</span>
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Folder className="h-3 w-3" />
              General
            </span>
          )}
        </div>

        {/* Quick Context Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">Task options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 text-xs">
            <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit Task
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onArchive && (
              <DropdownMenuItem onClick={() => onArchive(task)}>
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archive Task
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(task)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Task
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Title & Nav Link */}
      <Link
        to={`../tasks/${task.id}`}
        className="my-2.5 font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
      >
        {task.title}
      </Link>

      {/* Labels List */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 3).map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="h-4 px-1.5 text-[9px] font-normal text-muted-foreground bg-muted/50 gap-0.5"
            >
              <TagIcon className="h-2.5 w-2.5 opacity-60" />
              {label}
            </Badge>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[9px] text-muted-foreground self-center">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Metadata Indicators */}
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-auto text-xs text-muted-foreground">
        {/* Left Side: Priority & Status Selector */}
        <div className="flex items-center gap-2">
          <TaskPriorityBadge priority={task.priority} />
          <TaskStatusSelect taskId={task.id} status={task.status} />
        </div>

        {/* Right Side: Due Date & Assignee */}
        <div className="flex items-center gap-2 shrink-0">
          {dueDateObj && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-xs ${
                isOverdue
                  ? "bg-destructive/10 text-destructive"
                  : isDueToday
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
              title={format(dueDateObj, "MMM d, yyyy")}
            >
              <Calendar className="h-3 w-3" />
              <span>{format(dueDateObj, "MMM d")}</span>
            </div>
          )}

          {task.estimatedTime && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Estimated Effort">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedTime}</span>
            </div>
          )}

          {/* Assignee Avatar */}
          <div className="relative">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
                {getInitials(task.assigneeId ? "Assigned User" : undefined)}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 scale-75">
                <PresenceBadge status="online" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
