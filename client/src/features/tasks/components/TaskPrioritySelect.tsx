import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import type { TaskPriority } from "../types/tasks.types.js";
import { useUpdateTask } from "../hooks/useUpdateTask.js";

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

interface TaskPrioritySelectProps {
  taskId: string;
  priority: TaskPriority;
}

export function TaskPrioritySelect({ taskId, priority }: TaskPrioritySelectProps) {
  const { mutate: updateTask, isPending } = useUpdateTask();

  function handlePriorityChange(newPriority: TaskPriority) {
    if (newPriority === priority) return;
    updateTask({ id: taskId, data: { priority: newPriority } });
  }

  const priorityStyles: Record<TaskPriority, string> = {
    none: "text-muted-foreground border-border/50 bg-muted/10 hover:bg-muted/20",
    low: "text-blue-500 border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20",
    medium: "text-amber-500 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20",
    high: "text-orange-500 border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20",
    urgent: "text-red-500 border-red-500/20 bg-red-500/10 hover:bg-red-500/20",
  };

  return (
    <Select value={priority} onValueChange={handlePriorityChange} disabled={isPending}>
      <SelectTrigger 
        className={`h-7 px-3 text-[11px] font-semibold rounded-md border focus:ring-2 focus:ring-offset-1 focus:ring-ring w-fit gap-2 transition-colors ${priorityStyles[priority]} disabled:opacity-50 uppercase tracking-wider`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value} className="text-xs font-medium cursor-pointer">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
