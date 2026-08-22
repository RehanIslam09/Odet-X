import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Sliders, Users, Wifi, Sparkles, AlertTriangle } from "lucide-react";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

export interface SettingsTabItem {
  id: string;
  label: string;
  subpath: string;
  icon: React.ElementType;
  teamOnly?: boolean;
}

export function SettingsPage() {
  const location = useLocation();
  const { currentWorkspace } = useActiveWorkspace();

  const slug = currentWorkspace?.slug || "personal";
  const isPersonal = currentWorkspace?.type === "PERSONAL" || currentWorkspace?.isPersonal === true;

  const ALL_TABS: SettingsTabItem[] = useMemo(
    () => [
      { id: "general", label: "General", subpath: "general", icon: Sliders },
      { id: "members", label: "Members & Roles", subpath: "members", icon: Users, teamOnly: true },
      { id: "realtime", label: "Realtime & Sockets", subpath: "realtime", icon: Wifi, teamOnly: true },
      { id: "ai", label: "AI Settings", subpath: "ai", icon: Sparkles },
      { id: "danger-zone", label: "Danger Zone", subpath: "danger-zone", icon: AlertTriangle },
    ],
    []
  );

  // Adaptively filter tabs based on tenancy type
  const visibleTabs = useMemo(() => {
    if (isPersonal) {
      return ALL_TABS.filter((t) => !t.teamOnly);
    }
    return ALL_TABS;
  }, [ALL_TABS, isPersonal]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Settings Page Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Workspace Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure identity, members, real-time routing, and governance options for{" "}
            <span className="font-semibold text-foreground">{currentWorkspace?.name || "Workspace"}</span>.
          </p>
        </div>
      </div>

      {/* Adaptive Tab Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px">
        {visibleTabs.map((tab) => {
          const targetUrl = `/w/${slug}/settings/${tab.subpath}`;
          const isActive = location.pathname.includes(`/settings/${tab.subpath}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              to={targetUrl}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Settings Subroute Content Outlet */}
      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}

export default SettingsPage;
