import { memo } from "react";
import { Activity, ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";
import { Progress } from "@/components/ui/progress.js";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types.js";

interface WorkspaceHealthWidgetProps {
  summary?: DashboardSummary;
}

export const WorkspaceHealthWidget = memo(function WorkspaceHealthWidget({
  summary,
}: WorkspaceHealthWidgetProps) {
  const activeProjects = summary?.projects.active ?? 0;
  const archivedProjects = summary?.projects.archived ?? 0;
  const totalProjects = activeProjects + archivedProjects;
  const projectPercentage = totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 100;

  const activeTasks = summary?.tasks.totalActive ?? 0;
  const completedTasks = summary?.tasks.completed ?? 0;
  const totalTasks = activeTasks + completedTasks;
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const isHealthy = taskPercentage >= 60;

  return (
    <Card className="flex flex-col border-border/60 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Workspace Health
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Telemetry diagnostic scores and velocity indicators
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-semibold gap-1 ${
              isHealthy
                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                : "border-amber-500/30 text-amber-500 bg-amber-500/10"
            }`}
          >
            {isHealthy ? (
              <>
                <ShieldCheck className="h-3 w-3" />
                All Systems Normal
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                Attention Needed
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {/* Project Completion Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground">Active Projects Velocity</span>
            <span className="font-semibold text-primary">{projectPercentage}%</span>
          </div>
          <Progress value={projectPercentage} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{activeProjects} active</span>
            <span>{archivedProjects} archived</span>
          </div>
        </div>

        {/* Task Completion Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground">Task Completion Rate</span>
            <span className="font-semibold text-emerald-500">{taskPercentage}%</span>
          </div>
          <Progress value={taskPercentage} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{completedTasks} resolved</span>
            <span>{activeTasks} in backlog/progress</span>
          </div>
        </div>

        {/* Health Indicators List */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <div>
              <p className="font-medium text-foreground text-[11px]">Realtime Event Bus</p>
              <p className="text-[10px] text-muted-foreground">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
            <div>
              <p className="font-medium text-foreground text-[11px]">AI Copilot Engine</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
