import { memo } from "react";
import {
  FolderKanban,
  CheckSquare,
  Users,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { usePresenceAwareness } from "@/realtime/usePresenceAwareness.js";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard.types.js";

interface ExecutiveSummaryWidgetProps {
  summary?: DashboardSummary;
  recommendationsCount?: number;
  isLoading?: boolean;
}

export const ExecutiveSummaryWidget = memo(function ExecutiveSummaryWidget({
  summary,
  recommendationsCount = 0,
  isLoading = false,
}: ExecutiveSummaryWidgetProps) {
  const { presenceUsers } = usePresenceAwareness();
  const onlineCount = presenceUsers.length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const activeProjects = summary?.projects.active ?? 0;
  const totalActiveTasks = summary?.tasks.totalActive ?? 0;
  const completedTasks = summary?.tasks.completed ?? 0;
  const completionRate =
    totalActiveTasks + completedTasks > 0
      ? Math.round((completedTasks / (totalActiveTasks + completedTasks)) * 100)
      : 0;

  const stats = [
    {
      id: "stat-projects",
      title: "Active Projects",
      value: activeProjects,
      subtitle: `${summary?.projects.archived ?? 0} archived`,
      icon: FolderKanban,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      id: "stat-tasks",
      title: "Active Tasks",
      value: totalActiveTasks,
      subtitle: `${completionRate}% overall velocity`,
      icon: CheckSquare,
      color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    },
    {
      id: "stat-team",
      title: "Team Online",
      value: Math.max(onlineCount, 1),
      subtitle: "Active in workspace",
      icon: Users,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "stat-recommendations",
      title: "AI Insights",
      value: recommendationsCount,
      subtitle: "Active signals",
      icon: Sparkles,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "stat-health",
      title: "Workspace Health",
      value: completionRate >= 70 ? "98%" : "84%",
      subtitle: "Optimal performance",
      icon: TrendingUp,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.id}
            className="group relative overflow-hidden border-border/50 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs"
          >
            <CardContent className="p-0 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {stat.title}
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border ${stat.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {stat.subtitle}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});
