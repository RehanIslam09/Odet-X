import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home, Folder, CheckSquare, Activity, Settings } from "lucide-react";

import { useBreadcrumbs } from "@/features/navigation/context/BreadcrumbContext.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

function renderSegmentIcon(key?: string) {
  switch (key) {
    case "dashboard":
      return <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "projects":
      return <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "tasks":
      return <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "activities":
      return <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    case "settings":
      return <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    default:
      return null;
  }
}

export function DynamicBreadcrumbs() {
  const location = useLocation();
  const { breadcrumbs: customBreadcrumbs } = useBreadcrumbs();
  const { currentWorkspace } = useActiveWorkspace();

  const defaultSegments = useMemo(() => {
    if (customBreadcrumbs.length > 0) {
      return customBreadcrumbs;
    }

    const path = location.pathname;
    const workspaceSlug = currentWorkspace?.slug || "personal";
    const segments = [];

    // Root / Dashboard Segment
    segments.push({
      label: currentWorkspace?.name || "Dashboard",
      url: `/w/${workspaceSlug}/dashboard`,
      iconKey: "dashboard",
    });

    if (path.includes("/projects")) {
      segments.push({
        label: "Projects",
        url: `/w/${workspaceSlug}/projects`,
        iconKey: "projects",
      });

      const parts = path.split("/projects/")[1]?.split("/");
      if (parts && parts[0]) {
        segments.push({
          label: "Project Detail",
          url: `/w/${workspaceSlug}/projects/${parts[0]}`,
        });
      }
    } else if (path.includes("/tasks")) {
      segments.push({
        label: "Tasks",
        url: `/w/${workspaceSlug}/tasks`,
        iconKey: "tasks",
      });

      const parts = path.split("/tasks/")[1]?.split("/");
      if (parts && parts[0]) {
        segments.push({
          label: "Task Detail",
          url: `/w/${workspaceSlug}/tasks/${parts[0]}`,
        });
      }
    } else if (path.includes("/settings")) {
      segments.push({
        label: "Settings",
        url: `/w/${workspaceSlug}/settings`,
        iconKey: "settings",
      });
    } else if (path.includes("/activities")) {
      segments.push({
        label: "Activity",
        url: `/w/${workspaceSlug}/activities`,
        iconKey: "activities",
      });
    }

    return segments;
  }, [location.pathname, customBreadcrumbs, currentWorkspace]);

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
      {defaultSegments.map((segment, index) => {
        const isLast = index === defaultSegments.length - 1;

        return (
          <div key={index} className="flex items-center gap-1 min-w-0">
            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}

            {segment.url && !isLast ? (
              <Link
                to={segment.url}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate max-w-[140px]"
              >
                {renderSegmentIcon(segment.iconKey)}
                <span className="truncate">{segment.label}</span>
              </Link>
            ) : (
              <span className={`flex items-center gap-1.5 truncate max-w-[160px] ${isLast ? "font-medium text-foreground" : ""}`}>
                {renderSegmentIcon(segment.iconKey)}
                <span className="truncate">{segment.label}</span>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
