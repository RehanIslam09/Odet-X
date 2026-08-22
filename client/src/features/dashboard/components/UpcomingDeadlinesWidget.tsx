import { memo } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { format, isToday, isTomorrow, isBefore, startOfDay, addDays } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { TaskPriorityBadge } from "@/features/tasks/components/TaskPriorityBadge.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import type { DashboardAttentionTask } from "@/features/dashboard/types/dashboard.types.js";

interface UpcomingDeadlinesWidgetProps {
  tasks: DashboardAttentionTask[];
}

export const UpcomingDeadlinesWidget = memo(function UpcomingDeadlinesWidget({
  tasks,
}: UpcomingDeadlinesWidgetProps) {
  const { currentWorkspace } = useActiveWorkspace();
  const now = startOfDay(new Date());

  const tasksLink = currentWorkspace ? `/w/${currentWorkspace.slug}/tasks` : "/tasks";

  const overdueTasks = tasks.filter(
    (t) => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== "done",
  );
  const todayTasks = tasks.filter(
    (t) => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== "done",
  );
  const tomorrowTasks = tasks.filter(
    (t) => t.dueDate && isTomorrow(new Date(t.dueDate)) && t.status !== "done",
  );
  const upcomingWeekTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    const d = new Date(t.dueDate);
    return isBefore(d, addDays(now, 7)) && !isBefore(d, now) && !isToday(d) && !isTomorrow(d);
  });

  const getTaskUrl = (taskId: string) =>
    currentWorkspace ? `/w/${currentWorkspace.slug}/tasks/${taskId}` : `/tasks/${taskId}`;

  return (
    <Card className="flex flex-col border-border/60 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Upcoming Deadlines
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Timeline visualization of critical deliverables
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 cursor-pointer">
            <Link to={tasksLink}>
              <span>View All</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mb-2" />
            <p className="font-medium text-foreground">No pending deadlines</p>
            <p className="mt-0.5">All scheduled deliverables are up to date.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Overdue ({overdueTasks.length})</span>
                </div>
                {overdueTasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    to={getTaskUrl(task.id)}
                    className="flex items-center justify-between p-2 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <TaskPriorityBadge priority={task.priority} />
                      <span className="text-[10px] font-semibold text-destructive">
                        {format(new Date(task.dueDate!), "MMM d")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Today Section */}
            {todayTasks.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Due Today ({todayTasks.length})</span>
                </div>
                {todayTasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    to={getTaskUrl(task.id)}
                    className="flex items-center justify-between p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-xs"
                  >
                    <span className="font-medium text-foreground truncate">{task.title}</span>
                    <TaskPriorityBadge priority={task.priority} />
                  </Link>
                ))}
              </div>
            )}

            {/* Tomorrow & Upcoming Section */}
            {(tomorrowTasks.length > 0 || upcomingWeekTasks.length > 0) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>Upcoming This Week</span>
                </div>
                {[...tomorrowTasks, ...upcomingWeekTasks].slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    to={getTaskUrl(task.id)}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors text-xs"
                  >
                    <span className="font-medium text-foreground truncate">{task.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <TaskPriorityBadge priority={task.priority} />
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(task.dueDate!), "MMM d")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
