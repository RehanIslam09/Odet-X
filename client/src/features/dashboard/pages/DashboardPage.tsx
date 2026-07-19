import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AIDailyBrief } from "@/features/dashboard/components/AIDailyBrief";
import { ActivityTimeline } from "@/features/dashboard/components/ActivityTimeline";
import { DashboardHero } from "@/features/dashboard/components/DashboardHero";
import { FocusToday } from "@/features/dashboard/components/FocusToday";
import { ProductivityOverview } from "@/features/dashboard/components/ProductivityOverview";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { RecentProjects } from "@/features/dashboard/components/RecentProjects";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview";

/**
 * Dashboard: "what should I work on right now?" — not a data grid.
 * Laid out as three asymmetric rows (2/3 + 1/3 on desktop) instead of a
 * plain stack, each pairing a wide primary card with a narrow companion.
 */
function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardOverview();

  // If there's an error, we still want to show the Hero and Quick Actions 
  // to keep the dashboard structurally stable, but we replace the metrics.
  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardHero />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
           <div className="lg:col-span-2">
            <div className="flex h-full flex-col gap-4 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-semibold">Error loading dashboard</h3>
              </div>
              <p className="text-sm">There was a problem retrieving your dashboard analytics. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit gap-2">
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
           </div>
           <QuickActions />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AIDailyBrief />
        </div>
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
             <Skeleton className="h-[250px] w-full rounded-xl" />
          ) : (
             <FocusToday attentionTasks={data?.attentionTasks ?? []} />
          )}
        </div>
        
        {isLoading ? (
          <Skeleton className="h-[250px] w-full rounded-xl" />
        ) : (
          <RecentProjects recentProjects={data?.recentProjects ?? []} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityTimeline />
        </div>
        
        {isLoading ? (
          <Skeleton className="h-[250px] w-full rounded-xl" />
        ) : (
          <ProductivityOverview summary={data?.summary} />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;