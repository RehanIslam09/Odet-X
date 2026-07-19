import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import type { TaskStatus } from "../types/tasks.types.js";
import { useUpdateTask } from "../hooks/useUpdateTask.js";

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

interface TaskStatusSelectProps {
  taskId: string;
  status: TaskStatus;
}

export function TaskStatusSelect({ taskId, status }: TaskStatusSelectProps) {
  const { mutate: updateTask, isPending } = useUpdateTask();

  function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === status) return;
    updateTask({ id: taskId, data: { status: newStatus } });
  }

  const statusStyles: Record<TaskStatus, string> = {
    backlog: "border-muted-foreground/30 text-muted-foreground bg-muted/20 hover:bg-muted/30",
    todo: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20",
    in_progress: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20",
    in_review: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20",
    done: "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20",
    cancelled: "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20",
  };

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
      <SelectTrigger 
        className={`h-7 px-3 text-xs font-semibold rounded-full border focus:ring-2 focus:ring-offset-1 focus:ring-ring w-fit gap-2 transition-colors ${statusStyles[status]} disabled:opacity-50`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value} className="text-xs font-medium cursor-pointer">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
