import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { CircleDashed, SquareCheckBig, Calendar, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { format, isToday } from "date-fns";

import { Button } from "@/components/ui/button.js";
import { TaskPriorityBadge } from "@/features/tasks/components/TaskPriorityBadge.js";
import { TaskStatusSelect } from "@/features/tasks/components/TaskStatusSelect.js";
import { isTaskOverdue } from "@/features/tasks/utils/task.utils.js";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask.js";
import type { DashboardAttentionTask } from "@/features/dashboard/types/dashboard.types.js";

interface FocusTodayProps {
  attentionTasks: DashboardAttentionTask[];
}

export const FocusToday = memo(function FocusToday({ attentionTasks }: FocusTodayProps) {
  const updateTaskMutation = useUpdateTask();

  const handleQuickComplete = useCallback(
    (taskId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      updateTaskMutation.mutate({
        id: taskId,
        data: { status: "done" },
      });
    },
    [updateTaskMutation],
  );

  // Density Contract: Max 5 visible tasks
  const visibleTasks = attentionTasks.slice(0, 5);
  const remainingCount = Math.max(0, attentionTasks.length - 5);

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-2xs">
      {/* Header Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SquareCheckBig className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Focus Today
            </h2>
            <p className="text-xs text-muted-foreground">
              Tasks requiring your immediate attention
            </p>
          </div>
        </div>

        <Button id="focus-today-go-to-tasks" variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 cursor-pointer">
          <Link to="/tasks">
            <span>All Tasks</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Task Roster */}
      <div className="flex flex-col gap-2.5">
        {attentionTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <CircleDashed className="h-8 w-8 text-muted-foreground/40" />
            <p className="max-w-[240px] text-xs text-muted-foreground">
              No tasks require immediate attention right now. All caught up!
            </p>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs cursor-pointer">
              <Link to="/tasks">View Task Backlog</Link>
            </Button>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const overdue = isTaskOverdue(task.dueDate, task.status);

            return (
              <div
                key={task.id}
                className="group relative flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
              >
                {/* Left: Quick complete check & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => handleQuickComplete(task.id, e)}
                    className="h-5 w-5 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:border-emerald-500 transition-colors cursor-pointer shrink-0"
                    title="Mark task complete"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <div className="flex flex-col min-w-0">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="truncate text-xs font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {task.title}
                    </Link>
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                        <Calendar className={`h-3 w-3 ${overdue ? "text-destructive" : "text-muted-foreground"}`} />
                        <span
                          className={
                            overdue
                              ? "font-semibold text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {overdue
                            ? "Overdue"
                            : isToday(new Date(task.dueDate))
                            ? "Due Today"
                            : format(new Date(task.dueDate), "MMM d")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Priority & Inline Status Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <TaskPriorityBadge priority={task.priority} />
                  <TaskStatusSelect taskId={task.id} status={task.status} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Overflow Trigger for Density Contract */}
      {remainingCount > 0 && (
        <div className="pt-3 text-center border-t border-border/40 mt-2">
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <Link to="/tasks">
              +{remainingCount} more tasks requiring attention
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
});
