import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { AIDailyBrief } from "@/features/dashboard/components/AIDailyBrief.js";
import { ActivityTimeline } from "@/features/dashboard/components/ActivityTimeline.js";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader.js";
import { FocusToday } from "@/features/dashboard/components/FocusToday.js";
import { ProductivityOverview } from "@/features/dashboard/components/ProductivityOverview.js";
import { RecentProjects } from "@/features/dashboard/components/RecentProjects.js";
import { ExecutiveSummaryWidget } from "@/features/dashboard/components/ExecutiveSummaryWidget.js";
import { UpcomingDeadlinesWidget } from "@/features/dashboard/components/UpcomingDeadlinesWidget.js";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview.js";
import { WorkspaceRecommendationsCard } from "@/features/projects/components/recommendations/WorkspaceRecommendationsCard.js";
import {
  DashboardShell,
  DashboardGrid,
  DashboardStream,
  DashboardWidgetSlot,
} from "@/features/dashboard/components/layout/index.js";

/**
 * Phase 34.5 — Dashboard Layout Refactor (Milestone 2: Integrated Header Architecture)
 *
 * Integrates Team Presence, Workspace Health, and Quick Actions into DashboardHeader.
 */
function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardOverview();

  if (isError) {
    return (
      <DashboardShell>
        <DashboardHeader summary={data?.summary} />
        <DashboardGrid>
          <DashboardStream span={12}>
            <DashboardWidgetSlot>
              <div className="flex flex-col gap-4 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-semibold">Error loading dashboard</h3>
                </div>
                <p className="text-sm">
                  There was a problem retrieving your dashboard analytics. Please try again.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </DashboardWidgetSlot>
          </DashboardStream>
        </DashboardGrid>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* HEADER COMMAND BAR: Hero Greeting, Ambient Presence, Health & Quick Actions */}
      <DashboardHeader summary={data?.summary} />

      {/* TOP METRICS: Executive Telemetry Summary */}
      <ExecutiveSummaryWidget summary={data?.summary} isLoading={isLoading} />

      {/* DUAL INDEPENDENT STREAM LAYOUT */}
      <DashboardGrid>
        {/* PRIMARY STREAM (7 Cols / 65% Width) */}
        <DashboardStream span={7}>
          <DashboardWidgetSlot>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : (
              <FocusToday attentionTasks={data?.attentionTasks ?? []} />
            )}
          </DashboardWidgetSlot>

          <DashboardWidgetSlot>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full rounded-xl" />
            ) : (
              <RecentProjects recentProjects={data?.recentProjects ?? []} />
            )}
          </DashboardWidgetSlot>

          <DashboardWidgetSlot>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : (
              <UpcomingDeadlinesWidget tasks={data?.attentionTasks ?? []} />
            )}
          </DashboardWidgetSlot>

          <DashboardWidgetSlot>
            <ActivityTimeline />
          </DashboardWidgetSlot>
        </DashboardStream>

        {/* SECONDARY STREAM (5 Cols / 35% Width) */}
        <DashboardStream span={5}>
          <DashboardWidgetSlot>
            <AIDailyBrief />
          </DashboardWidgetSlot>

          <DashboardWidgetSlot>
            <WorkspaceRecommendationsCard />
          </DashboardWidgetSlot>

          <DashboardWidgetSlot>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : (
              <ProductivityOverview summary={data?.summary} />
            )}
          </DashboardWidgetSlot>
        </DashboardStream>
      </DashboardGrid>
    </DashboardShell>
  );
}

export default DashboardPage;
