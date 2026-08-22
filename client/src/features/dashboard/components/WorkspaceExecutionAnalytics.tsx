import { memo } from "react";
import { TrendingUp, Flame, Calendar, Activity, Zap, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge.js";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types.js";

interface WorkspaceExecutionAnalyticsProps {
  summary?: DashboardSummary;
}

export const WorkspaceExecutionAnalytics = memo(function WorkspaceExecutionAnalytics({
  summary,
}: WorkspaceExecutionAnalyticsProps) {
  const analytics = summary?.analytics;
  const dailyTrend = analytics?.dailyTrend ?? [];
  const maxCount = Math.max(...dailyTrend.map((d) => d.count), 1);

  const momentum = analytics?.momentum ?? "STABLE";
  const activeStreak = analytics?.activeStreak ?? 0;
  const thisWeekCount = analytics?.thisWeekActivityCount ?? 0;
  const lastWeekCount = analytics?.lastWeekActivityCount ?? 0;

  const momentumConfig = {
    INCREASING: {
      label: "Increasing Velocity",
      badgeClass: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
      icon: ArrowUpRight,
    },
    STABLE: {
      label: "Stable Velocity",
      badgeClass: "border-sky-500/30 text-sky-500 bg-sky-500/10",
      icon: Minus,
    },
    DECLINING: {
      label: "Declining Velocity",
      badgeClass: "border-amber-500/30 text-amber-500 bg-amber-500/10",
      icon: ArrowDownRight,
    },
  };

  const currentMomentum = momentumConfig[momentum];
  const MomentumIcon = currentMomentum.icon;

  return (
    <div className="flex flex-col rounded-xl border border-border/60 bg-card p-4.5 shadow-2xs">
      {/* Panel Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
              Execution Analytics & Activity Trends
            </h2>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              14-day workspace contribution velocity & momentum telemetry
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-[10px] font-semibold gap-1 px-2 py-0.5 shrink-0 self-start sm:self-auto ${currentMomentum.badgeClass}`}
        >
          <MomentumIcon className="h-3 w-3" />
          {currentMomentum.label}
        </Badge>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Metric 1: Active Streak */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/10 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-500 shrink-0">
            <Flame className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase block truncate">Active Streak</span>
            <span className="text-base font-bold font-mono text-foreground leading-tight">
              {activeStreak} {activeStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Metric 2: 7-Day Output */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/10 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase block truncate">7-Day Output</span>
            <span className="text-base font-bold font-mono text-foreground leading-tight">
              {thisWeekCount} <span className="text-[10px] text-muted-foreground font-sans">vs {lastWeekCount} prev</span>
            </span>
          </div>
        </div>

        {/* Metric 3: Resolution Rate */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/10 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/10 text-sky-500 shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase block truncate">Task Resolution</span>
            <span className="text-base font-bold font-mono text-foreground leading-tight">
              {summary?.tasks.completionPercentage ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 14-Day Activity Sparkline Heatmap */}
      <div className="flex flex-col gap-1.5 rounded-lg border border-border/30 bg-muted/10 p-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            14-Day Contribution Heatmap
          </span>
          <span className="font-mono text-[10px]">
            {dailyTrend.length > 0 ? `${dailyTrend[0].label} – ${dailyTrend[dailyTrend.length - 1].label}` : ""}
          </span>
        </div>

        {/* Sparkline Bar Canvas */}
        <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
          {dailyTrend.map((day) => {
            const heightPercent = maxCount > 0 ? Math.max((day.count / maxCount) * 100, 8) : 8;
            const hasActivity = day.count > 0;

            return (
              <div
                key={day.date}
                className="group relative flex flex-col items-center flex-1 h-full justify-end"
              >
                {/* Hover Tooltip */}
                <div className="absolute -top-7 hidden group-hover:flex items-center rounded bg-popover px-1.5 py-0.5 text-[9px] font-medium text-popover-foreground shadow-xs border border-border z-10 whitespace-nowrap">
                  {day.label}: {day.count} {day.count === 1 ? "activity" : "activities"}
                </div>

                {/* Sparkbar */}
                <div
                  className={`w-full rounded-xs transition-all duration-200 group-hover:opacity-100 ${
                    hasActivity
                      ? "bg-primary/70 group-hover:bg-primary shadow-2xs"
                      : "bg-muted/40"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
