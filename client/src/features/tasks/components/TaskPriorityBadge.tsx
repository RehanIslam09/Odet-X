import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Equal,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "../types/tasks.types";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const priorityConfig = {
  none: {
    label: "No Priority",
    colorClass: "text-muted-foreground bg-muted/20 border-muted/40",
    icon: MoreHorizontal,
  },
  low: {
    label: "Low",
    colorClass: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/5 border-zinc-500/10",
    icon: ChevronDown,
  },
  medium: {
    label: "Medium",
    colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: Equal,
  },
  high: {
    label: "High",
    colorClass: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
    icon: ChevronUp,
  },
  urgent: {
    label: "Urgent",
    colorClass: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30 font-semibold animate-pulse",
    icon: AlertTriangle,
  },
};

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.none;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors",
        config.colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
