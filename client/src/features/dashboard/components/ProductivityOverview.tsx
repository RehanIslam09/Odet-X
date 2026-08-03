import { memo } from "react";
import { FolderKanban, CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";

import { Progress } from "@/components/ui/progress.js";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types.js";

interface ProductivityOverviewProps {
  summary?: DashboardSummary;
}

export const ProductivityOverview = memo(function ProductivityOverview({
  summary,
}: ProductivityOverviewProps) {
  const activeProjects = summary?.projects.active ?? 0;
  const totalActiveTasks = summary?.tasks.totalActive ?? 0;
  const completedTasks = summary?.tasks.completed ?? 0;
  const inProgressTasks = summary?.tasks.inProgress ?? 0;
  const completionPercentage = summary?.tasks.completionPercentage ?? 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/60 bg-card p-5 shadow-2xs">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Productivity Overview
            </h2>
            <p className="text-xs text-muted-foreground">
              Workspace task execution & resolution metrics
            </p>
          </div>
        </div>

        {completionPercentage > 0 && (
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {completionPercentage}% resolution
          </span>
        )}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col justify-between gap-1 rounded-lg border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Projects</span>
            <FolderKanban className="h-4 w-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {activeProjects}
          </span>
          <span className="text-[10px] text-muted-foreground">Active in workspace</span>
        </div>

        <div className="flex flex-col justify-between gap-1 rounded-lg border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Active Tasks</span>
            <ListTodo className="h-4 w-4 text-sky-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {totalActiveTasks}
          </span>
          <span className="text-[10px] text-muted-foreground">Pending resolution</span>
        </div>

        <div className="flex flex-col justify-between gap-1 rounded-lg border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {completedTasks}
          </span>
          <span className="text-[10px] text-muted-foreground">Resolved tasks</span>
        </div>

        <div className="flex flex-col justify-between gap-1 rounded-lg border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">In Progress</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {inProgressTasks}
          </span>
          <span className="text-[10px] text-muted-foreground">Currently active</span>
        </div>
      </div>

      <div className="mt-auto space-y-1.5 pt-3 border-t border-border/40">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Resolution Velocity</span>
          <span className="font-semibold text-foreground">{completionPercentage}%</span>
        </div>
        <Progress value={completionPercentage} className="h-1.5" />
      </div>
    </div>
  );
});
