import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { BreadcrumbProvider, useBreadcrumbs } from "./context/BreadcrumbContext.js";
import { useRecentlyViewed } from "./hooks/useRecentlyViewed.js";
import { useFavorites } from "./hooks/useFavorites.js";
import { DynamicBreadcrumbs } from "@/components/layout/DynamicBreadcrumbs.js";

// Mock WorkspaceContext
vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useActiveWorkspace: () => ({
    currentWorkspace: { id: "ws-1", slug: "engineering", name: "Engineering Workspace" },
  }),
}));

describe("WP-05 Navigation & Productivity Subsystems", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("1. Breadcrumb Context & Component", () => {
    it("renders default dynamic breadcrumb segments for current route", () => {
      render(
        <MemoryRouter initialEntries={["/w/engineering/projects/proj-123"]}>
          <BreadcrumbProvider>
            <DynamicBreadcrumbs />
          </BreadcrumbProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText("Engineering Workspace")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("Project Detail")).toBeInTheDocument();
    });

    it("allows custom breadcrumbs override via BreadcrumbContext", () => {
      const CustomConsumer = () => {
        const { setCustomBreadcrumbs } = useBreadcrumbs();
        return (
          <button
            onClick={() =>
              setCustomBreadcrumbs([
                { label: "Home", url: "/" },
                { label: "Custom Deep Page" },
              ])
            }
          >
            Set Custom
          </button>
        );
      };

      render(
        <MemoryRouter initialEntries={["/w/engineering/dashboard"]}>
          <BreadcrumbProvider>
            <CustomConsumer />
            <DynamicBreadcrumbs />
          </BreadcrumbProvider>
        </MemoryRouter>,
      );

      act(() => {
        screen.getByText("Set Custom").click();
      });

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Custom Deep Page")).toBeInTheDocument();
    });
  });

  describe("2. Recently Viewed Hook", () => {
    it("adds, deduplicates, and bounds recently viewed items to max 20", () => {
      const { result } = renderHook(() => useRecentlyViewed());

      act(() => {
        result.current.addRecentlyViewed({
          id: "proj-1",
          title: "Project Alpha",
          type: "project",
          url: "/projects/proj-1",
        });
      });

      expect(result.current.recentlyViewedList).toHaveLength(1);
      expect(result.current.recentlyViewedList[0].title).toBe("Project Alpha");

      // Duplicate addition shifts item to top without creating duplicates
      act(() => {
        result.current.addRecentlyViewed({
          id: "proj-2",
          title: "Project Beta",
          type: "project",
          url: "/projects/proj-2",
        });
        result.current.addRecentlyViewed({
          id: "proj-1",
          title: "Project Alpha",
          type: "project",
          url: "/projects/proj-1",
        });
      });

      expect(result.current.recentlyViewedList).toHaveLength(2);
      expect(result.current.recentlyViewedList[0].title).toBe("Project Alpha");
    });
  });

  describe("3. Favorites & Pinning Hook", () => {
    it("toggles and persists user pinned items in localStorage", () => {
      const { result } = renderHook(() => useFavorites());

      const item = {
        id: "task-99",
        title: "Fix Authentication Flow",
        type: "task" as const,
        url: "/tasks/task-99",
      };

      expect(result.current.isFavorite("task-99")).toBe(false);

      act(() => {
        result.current.toggleFavorite(item);
      });

      expect(result.current.isFavorite("task-99")).toBe(true);
      expect(result.current.favoritesList).toHaveLength(1);

      act(() => {
        result.current.toggleFavorite(item);
      });

      expect(result.current.isFavorite("task-99")).toBe(false);
      expect(result.current.favoritesList).toHaveLength(0);
    });
  });
});
