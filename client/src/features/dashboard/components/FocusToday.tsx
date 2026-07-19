import { Link } from "react-router-dom";
import { CircleDashed, SquareCheckBig } from "lucide-react";
import { format, isToday } from "date-fns";

import { Button } from "@/components/ui/button";
import { isTaskOverdue } from "@/features/tasks/utils/task.utils";
import type { DashboardAttentionTask } from "@/features/dashboard/types/dashboard.types";

interface FocusTodayProps {
  attentionTasks: DashboardAttentionTask[];
}

/**
 * Today's Focus / Attention Tasks.
 *
 * Displays up to 5 tasks requiring immediate attention (overdue or due soon).
 * Overdue tasks are natively ordered first by the backend API.
 */
export function FocusToday({ attentionTasks }: FocusTodayProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SquareCheckBig className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Focus
          </h2>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {attentionTasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
            <CircleDashed className="h-6 w-6 text-muted-foreground/50" />
            <p className="max-w-[220px] text-xs text-muted-foreground">
              No tasks require immediate attention right now.
            </p>
            <Button id="focus-today-go-to-tasks" variant="outline" size="sm" asChild>
              <Link to="/tasks">View all tasks</Link>
            </Button>
          </div>
        )}

        {attentionTasks.map((task) => {
          const overdue = isTaskOverdue(task.dueDate, task.status);

          return (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="group -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-sm font-medium leading-none">
                  {task.title}
                </p>
                {task.dueDate && (
                  <p
                    className={`text-xs ${
                      overdue
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {overdue ? "Overdue" : "Due"} • {isToday(new Date(task.dueDate)) ? "Today" : format(new Date(task.dueDate), "MMM d")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}