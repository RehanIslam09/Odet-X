import { memo } from "react";
import { Plus, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";

import { TaskBoardCard } from "./TaskBoardCard.js";
import type { Task, TaskPriority, TaskStatus } from "../types/tasks.types.js";

interface TaskBoardColumnProps {
  status: TaskStatus;
  statusLabel: string;
  colorClass: string;
  tasks: (Task & { projectName?: string; projectColor?: string })[];
  onlineUserIds?: Set<string>;
  onCreateTaskClick?: () => void;
  onEditTask?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onPriorityChange?: (taskId: string, priority: TaskPriority) => void;
  onArchiveTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export const TaskBoardColumn = memo(function TaskBoardColumn({
  statusLabel,
  colorClass,
  tasks,
  onlineUserIds = new Set(),
  onCreateTaskClick,
  onEditTask,
  onStatusChange,
  onPriorityChange,
  onArchiveTask,
  onDeleteTask,
}: TaskBoardColumnProps) {
  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col rounded-xl border border-border/40 bg-muted/20 p-3 shadow-2xs">
      {/* Column Header */}
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-muted/20 pb-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
          <h3 className="font-semibold text-xs text-foreground uppercase tracking-wide">
            {statusLabel}
          </h3>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/60"
          >
            {tasks.length}
          </Badge>
        </div>

        {onCreateTaskClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateTaskClick}
            className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title={`Add task to ${statusLabel}`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="sr-only">Add Task</span>
          </Button>
        )}
      </div>

      {/* Column Cards Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[150px] max-h-[calc(100vh-280px)] scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border/60 bg-background/50">
            <Inbox className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
            <p className="text-xs font-medium text-muted-foreground/70">No tasks in {statusLabel}</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isOnline = task.assigneeId
              ? onlineUserIds.has(task.assigneeId)
              : false;

            return (
              <TaskBoardCard
                key={task.id}
                task={task}
                isOnline={isOnline}
                onEdit={onEditTask}
                onStatusChange={onStatusChange}
                onPriorityChange={onPriorityChange}
                onArchive={onArchiveTask}
                onDelete={onDeleteTask}
              />
            );
          })
        )}
      </div>
    </div>
  );
});
