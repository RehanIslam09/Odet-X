import { Outlet } from "react-router-dom";

import {
  DashboardNavbar,
  DashboardSidebar,
} from "@/components/layout/index.js";
import { CommandPalette } from "@/features/commands/components/CommandPalette.js";
import { CommandPaletteProvider } from "@/features/commands/context/CommandPaletteProvider.js";
import { WorkspaceProvider } from "@/features/workspaces/context/WorkspaceContext.js";
import { RealtimeProvider } from "@/realtime/RealtimeProvider.js";
import { GlobalCopilotProvider } from "@/features/ai/context/GlobalCopilotProvider.js";
import { BreadcrumbProvider } from "@/features/navigation/context/BreadcrumbContext.js";
import { useGlobalKeyboardShortcuts } from "@/features/navigation/hooks/useGlobalKeyboardShortcuts.js";

function DashboardLayoutContent() {
  useGlobalKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 border-r bg-background md:flex md:flex-col">
        <DashboardSidebar />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
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
      <RealtimeProvider>
        <GlobalCopilotProvider>
          <BreadcrumbProvider>
            <CommandPaletteProvider>
              <DashboardLayoutContent />
            </CommandPaletteProvider>
          </BreadcrumbProvider>
        </GlobalCopilotProvider>
      </RealtimeProvider>
    </WorkspaceProvider>
  );
}
