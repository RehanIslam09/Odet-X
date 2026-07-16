import {
  CircleDashed,
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "../types/tasks.types";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig = {
  backlog: {
    label: "Backlog",
    colorClass: "text-muted-foreground bg-muted/40 border-muted/80",
    icon: CircleDashed,
  },
  todo: {
    label: "Todo",
    colorClass: "text-foreground bg-secondary/50 border-border/80",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: CircleDot,
  },
  in_review: {
    label: "In Review",
    colorClass: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    icon: CircleDot,
  },
  done: {
    label: "Done",
    colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    colorClass: "text-muted-foreground/80 line-through bg-muted/20 border-muted/50",
    icon: XCircle,
  },
};

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.todo;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-all duration-200",
        config.colorClass,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
