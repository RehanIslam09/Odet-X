import { Outlet } from "react-router-dom";

import {
  DashboardNavbar,
  DashboardSidebar,
} from "@/components/layout";
import { CommandPalette } from "@/features/commands/components/CommandPalette";
import { WorkspaceProvider } from "@/features/workspaces/context/WorkspaceContext";
import { useRealtimeSync } from "@/realtime/useRealtimeSync";

function DashboardLayoutContent() {
  useRealtimeSync();

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 border-r bg-background md:flex md:flex-col">
        <DashboardSidebar />
      </aside>

      <div className="flex flex-1 flex-col">
        <DashboardNavbar />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <WorkspaceProvider>
      <DashboardLayoutContent />
    </WorkspaceProvider>
  );
}
