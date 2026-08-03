import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Activity,
  Settings,
  Star,
  Clock,
  Pin,
} from "lucide-react";

import { WorkspaceSwitcher } from "@/features/workspaces/components/WorkspaceSwitcher.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { useFavorites } from "@/features/navigation/hooks/useFavorites.js";
import { useRecentlyViewed } from "@/features/navigation/hooks/useRecentlyViewed.js";

const MAIN_NAVIGATION = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Activity", href: "/activities", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const DashboardSidebar = memo(function DashboardSidebar() {
  const location = useLocation();
  const { currentWorkspace } = useActiveWorkspace();
  const slug = currentWorkspace?.slug || "personal";
  const { favoritesList } = useFavorites();
  const { recentlyViewedList } = useRecentlyViewed();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Header & Workspace Switcher */}
      <div className="border-b border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs">
            AI
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-xs font-semibold tracking-tight text-foreground truncate">
              AI Project Manager
            </h2>
            <span className="text-[10px] text-muted-foreground truncate">
              Enterprise Workspace
            </span>
          </div>
        </div>

        <WorkspaceSwitcher />
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Workspace
          </div>

          {MAIN_NAVIGATION.map((item) => {
            const targetUrl = `/w/${slug}${item.href}`;
            const isActive = location.pathname.includes(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={targetUrl}
                className={`group flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pinned / Favorites Section */}
        {favoritesList.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-sidebar-border">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                Favorites ({favoritesList.length})
              </span>
            </div>

            {favoritesList.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                to={item.url}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors truncate"
              >
                <Pin className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewedList.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-sidebar-border">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                Recent
              </span>
            </div>

            {recentlyViewedList.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={item.url}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors truncate"
              >
                <span className="truncate">{item.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default DashboardSidebar;
