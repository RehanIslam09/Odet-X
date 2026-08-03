import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import {
  MobileSidebar,
  ThemeToggle,
  UserMenu,
} from "@/components/layout/index.js";
import { DynamicBreadcrumbs } from "@/components/layout/DynamicBreadcrumbs.js";
import { NotificationBell } from "@/features/notifications/components/NotificationBell.js";
import { ConnectionStatusBadge } from "@/features/workspaces/components/ConnectionStatusBadge.js";
import { WorkspacePresenceStack } from "@/features/workspaces/components/WorkspacePresenceStack.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";

export default function DashboardNavbar() {
  const { openCopilot } = useGlobalCopilot();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4 min-w-0">
        <MobileSidebar />

        <h1 className="text-sm font-semibold md:hidden truncate">
          AI Project Manager
        </h1>

        {/* Dynamic Breadcrumbs Hierarchy */}
        <DynamicBreadcrumbs />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Global AI Copilot Navbar Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => openCopilot()}
          className="h-8 px-2.5 text-xs font-medium gap-1.5 shadow-2xs border-border/80 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer"
          title="Open AI Copilot (Ctrl+J)"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Copilot</span>
          <kbd className="hidden lg:inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium opacity-80">
            ⌘J
          </kbd>
        </Button>

        <WorkspacePresenceStack />
        <ConnectionStatusBadge />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
