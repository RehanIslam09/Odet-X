/**
 * Phase 31 — WP-09 End-to-End Integration & Resilience Hardening Tests
 * Mandatory Contract Tests 52 through 57
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import { CommandPalette } from "@/features/commands/components/CommandPalette";
import { defaultCommandRegistry } from "@/features/commands/registry/command.registry";
import { defaultCommands } from "@/features/commands/catalog/default-commands";
import { searchApi } from "@/features/search/services/search.api";
import type { GlobalSearchResponseData } from "@/features/search/types/search.types";

// ---------------------------------------------------------------------------
// Helpers & Harness Components
// ---------------------------------------------------------------------------

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

function TestShell({ initialEntries = ["/"] }: { initialEntries?: string[] }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <div data-testid="dashboard-layout-shell">
          <LocationDisplay />
          <Routes>
            <Route path="/" element={<div>Dashboard Page</div>} />
            <Route path="/projects" element={<div>Projects List Page</div>} />
            <Route path="/tasks" element={<div>Tasks List Page</div>} />
            <Route path="/tasks/:taskId" element={<div>Task Details Page</div>} />
            <Route path="/projects/:projectId" element={<div>Project Details Page</div>} />
          </Routes>
          <CommandPalette />
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function openPalette() {
  fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
  await waitFor(() => {
    expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
  });
}

// ---------------------------------------------------------------------------
// Suite Lifecycle
// ---------------------------------------------------------------------------

describe("Phase 31 — WP-09: E2E Integration & Resilience Hardening (Tests 52–57)", () => {
  beforeEach(() => {
    defaultCommandRegistry.resetRegistry();
    defaultCommandRegistry.registerCommands([...defaultCommands]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // TEST 52 — TASK SEARCH -> SPA NAVIGATION
  // =========================================================================
  it("52. E2E: Open palette -> Type query -> Click task result -> Navigate to task page via React Router", async () => {
    const mockTaskResult: GlobalSearchResponseData = {
      query: "task",
      totalResults: 1,
      items: [
        {
          id: "task-52",
          type: "task",
          title: "Target Task 52",
          subtitle: "In Progress • Core Project",
          url: "/tasks/task-52",
          updatedAt: "2026-07-28T12:00:00.000Z",
        },
      ],
    };

    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockTaskResult);
    const windowAssignSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, assign: windowAssignSpy },
      writable: true,
      configurable: true,
    });

    render(<TestShell initialEntries={["/"]} />);
    expect(screen.getByTestId("current-location").textContent).toBe("/");

    // 1-3. Open Palette
    await openPalette();

    // 4-5. Type query & allow debounce
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "task" } });

    // 6-7. Task result appears
    await waitFor(() => {
      expect(screen.getByTestId("entity-item-task-task-52")).toBeInTheDocument();
    });

    // 8. Select task result
    fireEvent.click(screen.getByTestId("entity-item-task-task-52"));

    // 9-11. SPA navigation to task page occurs, palette closes, no window reload
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/tasks/task-52");
    });
    expect(windowAssignSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
  });

  // =========================================================================
  // TEST 53 — CREATE PROJECT COMMAND -> EXISTING DIALOG
  // =========================================================================
  it("53. E2E: Open palette -> Select 'Create Project' -> Open existing create project modal dialog", async () => {
    render(<TestShell initialEntries={["/"]} />);

    // 1. Open Palette
    await openPalette();

    // 2. Click Create Project launcher command
    const createProjectCmd = screen.getByTestId("command-item-launcher.create-project");
    expect(createProjectCmd).toBeInTheDocument();
    fireEvent.click(createProjectCmd);

    // 3-4. CreateProjectDialog opens and palette closes
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      // CreateProjectDialog header
      expect(screen.getByText("Create Project")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TEST 54 — CONCURRENTLY DELETED / STALE RESULT
  // =========================================================================
  it("54. Resilience: Select result deleted concurrently -> Handles stale result safely with error notice / 404 empty state without crashing app shell", async () => {
    const toastErrorSpy = vi.spyOn(toast, "error");
    const staleResult: GlobalSearchResponseData = {
      query: "deleted",
      totalResults: 1,
      items: [
        {
          id: "task-deleted-99",
          type: "task",
          title: "Concurrently Deleted Task",
          status: "DELETED",
          url: "/tasks/task-deleted-99",
          updatedAt: "2026-07-28T12:00:00.000Z",
        },
      ],
    };

    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(staleResult);

    render(<TestShell initialEntries={["/"]} />);

    await openPalette();
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "deleted" } });

    await waitFor(() => {
      expect(screen.getByTestId("entity-item-task-task-deleted-99")).toBeInTheDocument();
    });

    // Select concurrently deleted result
    fireEvent.click(screen.getByTestId("entity-item-task-task-deleted-99"));

    // Verify error toast or safe closing without crashing DashboardLayout
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith("Entity no longer exists");
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      expect(screen.getByTestId("dashboard-layout-shell")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TEST 55 — RAPID TYPING / OUT-OF-ORDER RESPONSE PROTECTION
  // =========================================================================
  it("55. Resilience: Rapid typing does not trigger out-of-order search responses (Query B results win over delayed Query A)", async () => {
    let resolveQueryA: (data: GlobalSearchResponseData) => void;
    let resolveQueryB: (data: GlobalSearchResponseData) => void;

    const queryAPromise = new Promise<GlobalSearchResponseData>((res) => {
      resolveQueryA = res;
    });
    const queryBPromise = new Promise<GlobalSearchResponseData>((res) => {
      resolveQueryB = res;
    });

    vi.spyOn(searchApi, "globalSearch").mockImplementation((params: { q: string }) => {
      if (params.q === "first") {
        return queryAPromise;
      }
      if (params.q === "second") {
        return queryBPromise;
      }
      return Promise.resolve({ query: params.q, totalResults: 0, items: [] });
    });

    render(<TestShell initialEntries={["/"]} />);
    await openPalette();

    const input = screen.getByTestId("command-palette-input");

    // 1. User types "first"
    fireEvent.change(input, { target: { value: "first" } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    // 2. User rapidly types "second"
    fireEvent.change(input, { target: { value: "second" } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    // 3. Query B resolves FIRST
    await act(async () => {
      resolveQueryB({
        query: "second",
        totalResults: 1,
        items: [
          { id: "item-B", type: "project", title: "Project Second", url: "/projects/item-B", updatedAt: "2026-07-28T00:00:00Z" },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("entity-item-project-item-B")).toBeInTheDocument();
    });

    // 4. Query A resolves AFTERWARD (out of order response)
    await act(async () => {
      resolveQueryA({
        query: "first",
        totalResults: 1,
        items: [
          { id: "item-A", type: "project", title: "Project First Stale", url: "/projects/item-A", updatedAt: "2026-07-28T00:00:00Z" },
        ],
      });
    });

    // 5. Query B results MUST remain displayed; stale Query A must NOT overwrite
    await waitFor(() => {
      expect(screen.getByTestId("entity-item-project-item-B")).toBeInTheDocument();
      expect(screen.queryByTestId("entity-item-project-item-A")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // TEST 56 — PALETTE SURVIVES ROUTE TRANSITIONS
  // =========================================================================
  it("56. Resilience: Command Palette remains active and functional across SPA route transitions", async () => {
    render(<TestShell initialEntries={["/"]} />);
    expect(screen.getByTestId("current-location").textContent).toBe("/");

    // 1. Open palette on route /
    await openPalette();

    // 2. Execute navigation command to /projects
    const projectsCmd = screen.getByTestId("command-item-navigation.projects");
    fireEvent.click(projectsCmd);

    // 3. Verify path updated to /projects and palette closed
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/projects");
    });

    // 4. Press Ctrl+K again on new route /projects
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });

    // 5. Execute another command from new route context
    const tasksCmd = screen.getByTestId("command-item-navigation.tasks");
    fireEvent.click(tasksCmd);

    // 6. Verify path updated to /tasks
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/tasks");
    });
  });

  // =========================================================================
  // TEST 57 — ZERO LIVE AI NETWORK CALLS
  // =========================================================================
  it("57. Resilience: Automated Command Palette test suite executes with 0 live AI network calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const mockResults: GlobalSearchResponseData = {
      query: "project",
      totalResults: 1,
      items: [
        { id: "proj-ai-check", type: "project", title: "Zero AI Project", url: "/projects/proj-ai-check", updatedAt: "2026-07-28T00:00:00Z" },
      ],
    };

    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(<TestShell initialEntries={["/"]} />);

    // Open palette
    await openPalette();

    // Search query
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "project" } });

    await waitFor(() => {
      expect(screen.getByTestId("entity-item-project-proj-ai-check")).toBeInTheDocument();
    });

    // Select result
    fireEvent.click(screen.getByTestId("entity-item-project-proj-ai-check"));

    // Verify fetch was never called with any external AI host URLs
    const aiCallRegex = /anthropic|openai|generativelanguage|google\.ai/i;
    for (const call of fetchSpy.mock.calls) {
      const url = String(call[0]);
      expect(aiCallRegex.test(url)).toBe(false);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
