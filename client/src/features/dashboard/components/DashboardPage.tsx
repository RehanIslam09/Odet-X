import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { ActivityTimeline } from "@/features/dashboard/components/ActivityTimeline.js";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader.js";
import { FocusToday } from "@/features/dashboard/components/FocusToday.js";
import { RecentProjects } from "@/features/dashboard/components/RecentProjects.js";
import { ExecutiveSummaryWidget } from "@/features/dashboard/components/ExecutiveSummaryWidget.js";
import { WorkspaceIntelligenceSidebar } from "@/features/dashboard/components/WorkspaceIntelligenceSidebar.js";
import { WorkspaceExecutionAnalytics } from "@/features/dashboard/components/WorkspaceExecutionAnalytics.js";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview.js";

function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardOverview();

  if (isError) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <DashboardHeader summary={data?.summary} />
        <div className="flex h-full flex-col gap-4 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* HEADER COMMAND BAR: Workspace Greeting & Status */}
      <DashboardHeader summary={data?.summary} />

      {/* TOP METRICS: Executive Telemetry Summary */}
      <ExecutiveSummaryWidget summary={data?.summary} isLoading={isLoading} />

      {/* CONTINUOUS DUAL-STREAM CANVAS: Execution Stream (66%) <-> Intelligence Sidebar (33%) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* LEFT COLUMN: PRIMARY EXECUTION STREAM (66% / 2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          {/* 1. Focus Today & Critical Deliverables Feed */}
          {isLoading ? (
            <Skeleton className="h-[300px] w-full rounded-xl" />
          ) : (
            <FocusToday attentionTasks={data?.attentionTasks ?? []} />
          )}

          {/* 2. Active Projects & Resolution Progress */}
          {isLoading ? (
            <Skeleton className="h-[280px] w-full rounded-xl" />
          ) : (
            <RecentProjects recentProjects={data?.recentProjects ?? []} />
          )}

          {/* 3. Real-Time Workspace Activity Timeline */}
          <ActivityTimeline />

          {/* 4. Workspace Execution Analytics & 14-Day Trends */}
          <WorkspaceExecutionAnalytics summary={data?.summary} />
        </div>

        {/* RIGHT COLUMN: UNIFIED WORKSPACE INTELLIGENCE SIDEBAR (33% / 1 Col) */}
        <div className="flex flex-col min-w-0">
          <WorkspaceIntelligenceSidebar summary={data?.summary} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
