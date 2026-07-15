import { AIDailyBrief } from "@/features/dashboard/components/AIDailyBrief";
import { ActivityTimeline } from "@/features/dashboard/components/ActivityTimeline";
import { DashboardHero } from "@/features/dashboard/components/DashboardHero";
import { FocusToday } from "@/features/dashboard/components/FocusToday";
import { ProductivityOverview } from "@/features/dashboard/components/ProductivityOverview";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { RecentProjects } from "@/features/dashboard/components/RecentProjects";

/**
 * Dashboard: "what should I work on right now?" — not a data grid.
 * Laid out as three asymmetric rows (2/3 + 1/3 on desktop) instead of a
 * plain stack, each pairing a wide primary card with a narrow companion.
 */
function DashboardPage() {
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
          <FocusToday />
        </div>
        <RecentProjects />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityTimeline />
        </div>
        <ProductivityOverview />
      </div>
    </div>
  );
}

export default DashboardPage;