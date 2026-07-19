import { FolderKanban, CheckCircle2, Clock, ListTodo } from "lucide-react";

import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types";

interface ProductivityOverviewProps {
  summary?: DashboardSummary;
}

/**
 * Productivity overview.
 *
 * Displays real metrics derived from the authenticated user's projects and tasks
 * using the unified Dashboard endpoint.
 */
export function ProductivityOverview({ summary }: ProductivityOverviewProps) {
  const activeProjects = summary?.projects.active ?? 0;
  const totalActiveTasks = summary?.tasks.totalActive ?? 0;
  const completedTasks = summary?.tasks.completed ?? 0;
  const inProgressTasks = summary?.tasks.inProgress ?? 0;
  const completionPercentage = summary?.tasks.completionPercentage ?? 0;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Overview
        </h2>
        {completionPercentage > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {completionPercentage}% complete
          </span>
        )}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span className="text-xl font-semibold tracking-tight">
            {activeProjects}
          </span>
          <span className="text-xs text-muted-foreground">
            Active projects
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-xl font-semibold tracking-tight">
            {totalActiveTasks}
          </span>
          <span className="text-xs text-muted-foreground">
            Total active tasks
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500/70" />
          <span className="text-xl font-semibold tracking-tight">
            {completedTasks}
          </span>
          <span className="text-xs text-muted-foreground">
            Completed tasks
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
          <Clock className="h-4 w-4 text-blue-500/70" />
          <span className="text-xl font-semibold tracking-tight">
            {inProgressTasks}
          </span>
          <span className="text-xs text-muted-foreground">
            In progress tasks
          </span>
        </div>
      </div>
    </div>
  );
}