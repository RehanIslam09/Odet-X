import { useMemo } from "react";
import { TaskBoardColumn } from "./TaskBoardColumn";
import { TaskBoardSkeleton } from "./TaskBoardSkeleton";
import { TaskBoardEmptyState } from "./TaskBoardEmptyState";
import type { Task, TaskPriority, TaskStatus } from "../types/tasks.types.js";

interface ColumnConfig {
  status: TaskStatus;
  label: string;
  colorClass: string;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  { status: "backlog", label: "Backlog", colorClass: "bg-slate-400 dark:bg-slate-500" },
  { status: "todo", label: "Todo", colorClass: "bg-sky-500" },
  { status: "in_progress", label: "In Progress", colorClass: "bg-amber-500" },
  { status: "in_review", label: "In Review", colorClass: "bg-purple-500" },
  { status: "done", label: "Done", colorClass: "bg-emerald-500" },
  { status: "cancelled", label: "Cancelled", colorClass: "bg-rose-500" },
];

interface TaskBoardViewProps {
  tasks: (Task & { projectName?: string; projectColor?: string })[];
  isLoading?: boolean;
  onlineUserIds?: Set<string>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onCreateTaskClick?: () => void;
  onEditTask?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onPriorityChange?: (taskId: string, priority: TaskPriority) => void;
  onArchiveTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export function TaskBoardView({
  tasks,
  isLoading = false,
  onlineUserIds = new Set(),
  hasActiveFilters = false,
  onClearFilters,
  onCreateTaskClick,
  onEditTask,
  onStatusChange,
  onPriorityChange,
  onArchiveTask,
  onDeleteTask,
}: TaskBoardViewProps) {
  // Group tasks by status using memoization
  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, (Task & { projectName?: string; projectColor?: string })[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    };

    tasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.todo.push(task);
      }
    });

    return map;
  }, [tasks]);

  if (isLoading) {
    return <TaskBoardSkeleton />;
  }

  if (tasks.length === 0) {
    return (
      <TaskBoardEmptyState
        onCreateTaskClick={onCreateTaskClick}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div
      role="region"
      aria-label="Kanban Task Board"
      className="flex flex-1 w-full overflow-x-auto gap-4 pb-4 scrollbar-thin focus-visible:outline-hidden"
    >
      {KANBAN_COLUMNS.map((col) => (
        <TaskBoardColumn
          key={col.status}
          status={col.status}
          statusLabel={col.label}
          colorClass={col.colorClass}
          tasks={tasksByStatus[col.status] || []}
          onlineUserIds={onlineUserIds}
          onCreateTaskClick={onCreateTaskClick}
          onEditTask={onEditTask}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onArchiveTask={onArchiveTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
