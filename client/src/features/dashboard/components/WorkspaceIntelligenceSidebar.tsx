import { memo } from "react";
import { Activity, ShieldCheck, AlertTriangle, Users, Eye, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge.js";
import { Progress } from "@/components/ui/progress.js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.js";
import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import { PresenceBadge } from "@/features/workspaces/components/PresenceBadge.js";
import { useAuthStore } from "@/store/auth.store.js";
import { WorkspaceRecommendationsCard } from "@/features/projects/components/recommendations/WorkspaceRecommendationsCard.js";
import { AIDailyBrief } from "@/features/dashboard/components/AIDailyBrief.js";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types.js";

interface WorkspaceIntelligenceSidebarProps {
  summary?: DashboardSummary;
  isLoading?: boolean;
}

export const WorkspaceIntelligenceSidebar = memo(function WorkspaceIntelligenceSidebar({
  summary,
  isLoading: _isLoading = false,
}: WorkspaceIntelligenceSidebarProps) {
  const { presenceUsers } = usePresenceAwareness();
  const currentUser = useAuthStore((state) => state.user);

  const activeProjects = summary?.projects.active ?? 0;
  const archivedProjects = summary?.projects.archived ?? 0;
  const totalProjects = activeProjects + archivedProjects;
  const projectPercentage = totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 100;

  const activeTasks = summary?.tasks.totalActive ?? 0;
  const completedTasks = summary?.tasks.completed ?? 0;
  const totalTasks = activeTasks + completedTasks;
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const completionPercentage = summary?.tasks.completionPercentage ?? taskPercentage;

  const isHealthy = taskPercentage >= 60;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs">
      {/* SIDEBAR PARENT HEADER */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
            Workspace Intelligence
          </h2>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] font-medium border-emerald-500/30 text-emerald-500 gap-1 px-1.5 py-0 shrink-0"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Telemetry
        </Badge>
      </div>

      {/* SECTION 1: WORKSPACE HEALTH DIAGNOSTICS */}
      <div className="border-b border-border/40 p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Workspace Health
            </h3>
            <p className="text-[11px] text-muted-foreground leading-normal break-words mt-0.5">
              Telemetry diagnostic scores and velocity indicators
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold gap-1 px-2 py-0.5 shrink-0 ${
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

        {/* Velocity Bar 1 */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-medium text-foreground">Active Projects Velocity</span>
            <span className="font-semibold text-primary font-mono text-[11px]">{projectPercentage}%</span>
          </div>
          <Progress value={projectPercentage} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{activeProjects} active</span>
            <span>{archivedProjects} archived</span>
          </div>
        </div>

        {/* Velocity Bar 2 */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-medium text-foreground">Task Completion Rate</span>
            <span className="font-semibold text-emerald-500 font-mono text-[11px]">{taskPercentage}%</span>
          </div>
          <Progress value={taskPercentage} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{completedTasks} resolved</span>
            <span>{activeTasks} in backlog/progress</span>
          </div>
        </div>

        {/* Diagnostic Badges */}
        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/30">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground text-[11px] truncate">Realtime Event Bus</p>
              <p className="text-[10px] text-muted-foreground">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/30">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground text-[11px] truncate">AI Copilot Engine</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROACTIVE AI SIGNALS & RECOMMENDATIONS */}
      <div className="border-b border-border/40 p-4 flex flex-col gap-3">
        <AIDailyBrief />
        <WorkspaceRecommendationsCard />
      </div>

      {/* SECTION 3: ONLINE TEAM PRESENCE & PRODUCTIVITY VELOCITY */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-tight">
              Online Team ({Math.max(presenceUsers.length, 1)})
            </h3>
          </div>
          <Badge variant="outline" className="text-[9px] font-medium border-emerald-500/30 text-emerald-500 gap-1 px-1.5 py-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Realtime
          </Badge>
        </div>

        {/* Presence Users List */}
        <div className="divide-y rounded-lg border border-border/30 bg-muted/10 overflow-hidden">
          {presenceUsers.length === 0 ? (
            <div className="flex items-center justify-between p-2.5 px-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
                      {getInitials(currentUser?.name || "You")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceBadge status="online" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {currentUser?.name || "You"}
                    </span>
                    <Badge variant="secondary" className="h-3.5 text-[8px] px-1 py-0">
                      You
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                    <Eye className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate">Viewing Dashboard</span>
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30 shrink-0 capitalize px-1.5 py-0">
                Online
              </Badge>
            </div>
          ) : (
            presenceUsers.map((user) => {
              const isSelf = currentUser?.id === user.userId;
              const viewingText = user.viewing
                ? `Viewing ${user.viewing.resourceType} #${user.viewing.resourceId.slice(-4)}`
                : "Active in workspace";

              return (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-2.5 px-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <PresenceBadge status="online" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {user.name}
                        </span>
                        {isSelf && (
                          <Badge variant="secondary" className="h-3.5 text-[8px] px-1 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                        <Eye className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{viewingText}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30 shrink-0 capitalize px-1.5 py-0">
                    Online
                  </Badge>
                </div>
              );
            })
          )}
        </div>

        {/* Embedded Productivity Overview Summary */}
        <div className="mt-1 flex flex-col gap-2 rounded-lg border border-border/30 bg-muted/10 p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground">
              Productivity Overview
            </h4>
            <span className="text-[10px] font-mono font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20">
              {completionPercentage}% resolution
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block font-medium">Projects</span>
              <span className="text-sm font-bold font-mono text-foreground">{activeProjects}</span>
            </div>
            <div className="p-2 rounded bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block font-medium">Active Tasks</span>
              <span className="text-sm font-bold font-mono text-foreground">{activeTasks}</span>
            </div>
            <div className="p-2 rounded bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block font-medium">Completed</span>
              <span className="text-sm font-bold font-mono text-emerald-500">{completedTasks}</span>
            </div>
            <div className="p-2 rounded bg-card border border-border/30">
              <span className="text-[10px] text-muted-foreground block font-medium">In Progress</span>
              <span className="text-sm font-bold font-mono text-amber-500">{summary?.tasks.inProgress ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
