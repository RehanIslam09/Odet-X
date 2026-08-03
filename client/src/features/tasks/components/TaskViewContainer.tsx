import { memo } from "react";
import { TaskList } from "./TaskList.js";
import { TaskBoardView } from "./TaskBoardView.js";
import type { Task, TaskPriority, TaskStatus } from "../types/tasks.types.js";

interface TaskViewContainerProps {
  view: "list" | "board";
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

export const TaskViewContainer = memo(function TaskViewContainer({
  view,
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
}: TaskViewContainerProps) {
  if (view === "board") {
    return (
      <TaskBoardView
        tasks={tasks}
        isLoading={isLoading}
        onlineUserIds={onlineUserIds}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        onCreateTaskClick={onCreateTaskClick}
        onEditTask={onEditTask}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onArchiveTask={onArchiveTask}
        onDeleteTask={onDeleteTask}
      />
    );
  }

  return (
    <TaskList
      tasks={tasks}
      isLoading={isLoading}
      onCreateTaskClick={onCreateTaskClick || (() => {})}
      onEditTask={onEditTask || (() => {})}
      onArchiveTask={onArchiveTask || (() => {})}
      onDeleteTask={onDeleteTask || (() => {})}
    />
  );
});
