import { cn } from "@/lib/utils";
import type { TasksQueryParams } from "../types/tasks.types";

interface QuickFiltersProps {
  value: TasksQueryParams["quickFilter"];
  onChange: (filter: TasksQueryParams["quickFilter"]) => void;
  counts?: {
    all: number;
    myTasks: number;
    dueToday: number;
    overdue: number;
    completed: number;
  };
}

export function QuickFilters({ value = "all", onChange, counts }: QuickFiltersProps) {
  const filterItems: {
    id: NonNullable<TasksQueryParams["quickFilter"]>;
    label: string;
    count?: number;
  }[] = [
    { id: "all", label: "All", count: counts?.all },
    { id: "my-tasks", label: "My Tasks", count: counts?.myTasks },
    { id: "due-today", label: "Due Today", count: counts?.dueToday },
    { id: "overdue", label: "Overdue", count: counts?.overdue },
    { id: "completed", label: "Completed", count: counts?.completed },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2">
      {filterItems.map((item) => {
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer select-none",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-background text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/30"
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground/80"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
