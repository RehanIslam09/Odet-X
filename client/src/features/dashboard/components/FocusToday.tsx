import { memo, useCallback, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CircleDashed, SquareCheckBig, Calendar, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, isToday, isTomorrow, isBefore, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button.js";
import { TaskPriorityBadge } from "@/features/tasks/components/TaskPriorityBadge.js";
import { TaskStatusSelect } from "@/features/tasks/components/TaskStatusSelect.js";
import { isTaskOverdue } from "@/features/tasks/utils/task.utils.js";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import type { DashboardAttentionTask } from "@/features/dashboard/types/dashboard.types.js";

interface FocusTodayProps {
  attentionTasks: DashboardAttentionTask[];
}

type TaskFilter = "all" | "overdue" | "today" | "upcoming";

export const FocusToday = memo(function FocusToday({ attentionTasks }: FocusTodayProps) {
  const updateTaskMutation = useUpdateTask();
  const { currentWorkspace } = useActiveWorkspace();
  const [filter, setFilter] = useState<TaskFilter>("all");

  const now = startOfDay(new Date());

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

  const tasksLink = currentWorkspace ? `/w/${currentWorkspace.slug}/tasks` : "/tasks";

  const overdueCount = useMemo(
    () => attentionTasks.filter((t) => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== "done").length,
    [attentionTasks, now],
  );

  const todayCount = useMemo(
    () => attentionTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== "done").length,
    [attentionTasks],
  );

  const filteredTasks = useMemo(() => {
    if (filter === "overdue") {
      return attentionTasks.filter((t) => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== "done");
    }
    if (filter === "today") {
      return attentionTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== "done");
    }
    if (filter === "upcoming") {
      return attentionTasks.filter((t) => {
        if (!t.dueDate || t.status === "done") return false;
        const d = new Date(t.dueDate);
        return !isBefore(d, now) && !isToday(d);
      });
    }
    return attentionTasks;
  }, [attentionTasks, filter, now]);

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-2xs">
      {/* Header Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <SquareCheckBig className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Focus Today
              </h2>
              <span className="text-xs text-muted-foreground font-normal">•</span>
              <span className="text-xs font-medium text-muted-foreground">
                Upcoming Deadlines
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-normal break-words">
              Critical tasks and upcoming deliverables requiring immediate attention
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1 border border-border/30">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                filter === "all" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({attentionTasks.length})
            </button>
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter("overdue")}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  filter === "overdue" ? "bg-destructive/10 text-destructive font-semibold border border-destructive/30" : "text-destructive hover:bg-destructive/10"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                Overdue ({overdueCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilter("today")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                filter === "today" ? "bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/30" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today ({todayCount})
            </button>
          </div>

          <Button id="focus-today-go-to-tasks" variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 cursor-pointer">
            <Link to={tasksLink}>
              <span>All Tasks</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Task Roster */}
      <div className="flex flex-col gap-2">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CircleDashed className="h-7 w-7 text-muted-foreground/40" />
            <p className="max-w-[260px] text-xs text-muted-foreground">
              {filter === "all"
                ? "No tasks require immediate attention right now. All caught up!"
                : `No ${filter} tasks found.`}
            </p>
            <Button variant="outline" size="sm" asChild className="h-7 text-xs cursor-pointer mt-1">
              <Link to={tasksLink}>View Task Backlog</Link>
            </Button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const overdue = isTaskOverdue(task.dueDate, task.status);
            const taskLink = currentWorkspace ? `/w/${currentWorkspace.slug}/tasks/${task.id}` : `/tasks/${task.id}`;

            return (
              <div
                key={task.id}
                className="group relative flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/10 p-2.5 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
              >
                {/* Left: Quick complete check & Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => handleQuickComplete(task.id, e)}
                    className="h-5 w-5 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:border-emerald-500 transition-colors cursor-pointer shrink-0"
                    title="Mark task complete"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <div className="flex flex-col min-w-0 flex-1">
                    <Link
                      to={taskLink}
                      className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors"
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
                            : isTomorrow(new Date(task.dueDate))
                            ? "Due Tomorrow"
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
    </div>
  );
});
