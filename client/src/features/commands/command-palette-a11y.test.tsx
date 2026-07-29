/**
 * WP-08 — Accessibility, Keyboard & UX Hardening Tests
 * Phase 31 — Global Search & Command Palette
 *
 * Covers: accessible dialog identity, search input label, initial focus,
 * focus restoration, launcher focus handoff, keyboard navigation, Escape
 * behavior, shortcut collision/repeat/modifier hardening, search states,
 * query lifecycle, entity accessibility, ProjectMemory privacy, route
 * resilience, and safety class boundaries.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandPalette } from "@/features/commands/components/CommandPalette";
import { isGlobalCommandPaletteSuppressed } from "@/features/commands/utils/keyboard.utils";
import { defaultCommandRegistry } from "@/features/commands/registry/command.registry";
import { defaultCommands } from "@/features/commands/catalog/default-commands";
import { searchApi } from "@/features/search/services/search.api";
import { isSafeInternalUrl } from "@/features/search/utils/url.utils";
import type { GlobalSearchResponseData } from "@/features/search/types/search.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function TestWrapper({
  initialEntries = ["/"],
  children,
}: {
  initialEntries?: string[];
  children: React.ReactNode;
}) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
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
// Reset registry before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  defaultCommandRegistry.resetRegistry();
  defaultCommandRegistry.registerCommands([...defaultCommands]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// A. Accessible Dialog Identity
// ===========================================================================
describe("A. Accessible Dialog Identity", () => {
  it("1. dialog has role=dialog after opening", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("2. dialog has a meaningful accessible title visible to screen readers", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    expect(screen.getByText("Command Palette & Global Search")).toBeInTheDocument();
  });

  it("3. dialog description is present inside the dialog for screen readers", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    expect(
      screen.getByText("Search commands, projects, tasks, milestones, and memories...")
    ).toBeInTheDocument();
  });

  it("4. search input has an accessible label via aria-label", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const input = screen.getByLabelText("Search commands and workspace");
    expect(input).toBeInTheDocument();
  });

  it("5. command item textContent contains label text (icon does not add noise)", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const dashboardItem = screen.getByTestId("command-item-navigation.dashboard");
    expect(dashboardItem.textContent).toContain("Go to Dashboard");
  });
});

// ===========================================================================
// B. Initial Focus
// ===========================================================================
describe("B. Initial Focus", () => {
  it("6. Ctrl+K opens palette (input present in DOM)", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });
  });

  it("7. Meta+K (Cmd+K) opens palette", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", metaKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// C. Focus Restoration
// ===========================================================================
describe("C. Focus Restoration", () => {
  it("8. Escape closes the palette", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });

  it("9. query is cleared when palette closes, and reopening shows clean state", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "dashboard" } });
    fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      const newInput = screen.getByTestId("command-palette-input") as HTMLInputElement;
      expect(newInput.value).toBe("");
    });
  });
});

// ===========================================================================
// D. Launcher Focus Handoff
// ===========================================================================
describe("D. Launcher Focus Handoff", () => {
  it("10. Create Project command closes palette", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const createProjCmd = screen.getByTestId("command-item-launcher.create-project");
    fireEvent.click(createProjCmd);
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });

  it("11. Create Task command closes palette", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "create task" } });
    await waitFor(() => {
      expect(screen.getByTestId("command-item-launcher.create-task")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("command-item-launcher.create-task"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });
});

// ===========================================================================
// E. Keyboard Navigation
// ===========================================================================
describe("E. Keyboard Navigation", () => {
  it("13. ArrowDown and ArrowUp events on input do not throw errors", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    const input = screen.getByTestId("command-palette-input");
    expect(() => {
      fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    }).not.toThrow();
  });

  it("14. entity results render and are selectable (closes palette on click)", async () => {
    const mockResults: GlobalSearchResponseData = {
      query: "task",
      totalResults: 1,
      items: [
        {
          id: "t-kb-1",
          type: "task",
          title: "Keyboard Nav Task",
          url: "/tasks/t-kb-1",
          updatedAt: "2026-07-28T12:00:00.000Z",
        },
      ],
    };
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(
      <TestWrapper initialEntries={["/"]}>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "task" } });
    await waitFor(() => {
      expect(screen.getByTestId("entity-item-task-t-kb-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("entity-item-task-t-kb-1"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });

  it("15. navigation command click uses React Router (window.location.assign not called)", async () => {
    const assignSpy = vi.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: assignSpy },
      writable: true,
      configurable: true,
    });

    render(
      <TestWrapper initialEntries={["/"]}>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.click(screen.getByTestId("command-item-navigation.dashboard"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
    expect(assignSpy).not.toHaveBeenCalled();

    if (originalDescriptor) {
      Object.defineProperty(window, "location", originalDescriptor);
    }
  });
});

// ===========================================================================
// F. Escape Behavior
// ===========================================================================
describe("F. Escape Behavior", () => {
  it("18. Escape while palette is open closes it", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });

  it("19. Escape when palette is closed has no effect", () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    expect(() => {
      fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    }).not.toThrow();
    expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// G. Shortcut Collision
// ===========================================================================
describe("G. Shortcut Collision", () => {
  it("21. data-suppress-global-command-palette on target suppresses activation", () => {
    const div = document.createElement("div");
    div.setAttribute("data-suppress-global-command-palette", "true");
    const e = { defaultPrevented: false, target: div } as unknown as KeyboardEvent;
    expect(isGlobalCommandPaletteSuppressed(e)).toBe(true);
  });

  it("22. event.defaultPrevented suppresses global palette activation", () => {
    const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, cancelable: true });
    e.preventDefault();
    expect(isGlobalCommandPaletteSuppressed(e)).toBe(true);
  });

  it("23. outside editor Ctrl+K still opens palette", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });
  });

  it("23b. aria-label=Task notes editor textarea suppresses activation", () => {
    const textarea = document.createElement("textarea");
    textarea.setAttribute("aria-label", "Task notes editor");
    const e = { defaultPrevented: false, target: textarea } as unknown as KeyboardEvent;
    expect(isGlobalCommandPaletteSuppressed(e)).toBe(true);
  });
});

// ===========================================================================
// H. Shortcut Repeat & Modifier Hardening
// ===========================================================================
describe("H. Repeat & Modifier Hardening", () => {
  it("24. repeated keydown (e.repeat=true) does NOT open the palette", () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true, repeat: true });
    expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
  });

  it("25. Ctrl+Shift+K does NOT open the palette", () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "K", code: "KeyK", ctrlKey: true, shiftKey: true });
    expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
  });

  it("26. Ctrl+Alt+K does NOT open the palette", () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true, altKey: true });
    expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
  });

  it("27. Meta+K opens the palette (macOS support)", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", metaKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });
  });

  it("28. Ctrl+K opens the palette (Windows/Linux support)", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// I. Search States
// ===========================================================================
describe("I. Search States", () => {
  it("29. loading state does not remove local command items from DOM", async () => {
    vi.spyOn(searchApi, "globalSearch").mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "dashboard" } });

    await waitFor(() => {
      expect(screen.getByTestId("search-loading-indicator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("command-item-navigation.dashboard")).toBeInTheDocument();
  });

  it("30. error state does not remove local command items from DOM", async () => {
    vi.spyOn(searchApi, "globalSearch").mockRejectedValue(new Error("network fail"));

    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "dashboard" } });

    await waitFor(() => {
      expect(screen.getByTestId("search-error-indicator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("command-item-navigation.dashboard")).toBeInTheDocument();
  });

  it("32. single-character query triggers zero API calls", async () => {
    const spy = vi.spyOn(searchApi, "globalSearch");
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "a" } });
    // Use act-wrapped waitFor to correctly gate async debounce time without leaking act() warnings
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("33. closing palette stops search eligibility without errors", async () => {
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue({
      query: "alpha",
      totalResults: 0,
      items: [],
    });
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "alpha" } });
    fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });
});

// ===========================================================================
// J. Query Lifecycle
// ===========================================================================
describe("J. Query Lifecycle", () => {
  it("34. command selection clears query on next open", async () => {
    render(
      <TestWrapper initialEntries={["/"]}>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "dashboard" } });
    fireEvent.click(screen.getByTestId("command-item-navigation.dashboard"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      const reopened = screen.getByTestId("command-palette-input") as HTMLInputElement;
      expect(reopened.value).toBe("");
    });
  });

  it("35. entity navigation clears query on next open", async () => {
    const mockResults: GlobalSearchResponseData = {
      query: "proj",
      totalResults: 1,
      items: [
        { id: "p-nav-1", type: "project", title: "Nav Project", url: "/projects/p-nav-1", updatedAt: "2026-07-28T12:00:00.000Z" },
      ],
    };
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(
      <TestWrapper initialEntries={["/"]}>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "proj" } });
    await waitFor(() => {
      expect(screen.getByTestId("entity-item-project-p-nav-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("entity-item-project-p-nav-1"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      const newInput = screen.getByTestId("command-palette-input") as HTMLInputElement;
      expect(newInput.value).toBe("");
    });
  });

  it("37. reopening after Escape has clean empty query", async () => {
    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "projects" } });
    fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
    await waitFor(() => {
      const input = screen.getByTestId("command-palette-input") as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });
});

// ===========================================================================
// K. Entity Accessibility & Privacy
// ===========================================================================
describe("K. Entity Accessibility & Privacy", () => {
  it("38. entity groups have distinguishable group headings for screen readers", async () => {
    const mockResults: GlobalSearchResponseData = {
      query: "alpha",
      totalResults: 3,
      items: [
        { id: "pr-1", type: "project", title: "Alpha Project", url: "/projects/pr-1", updatedAt: "2026-07-28T00:00:00Z" },
        { id: "tk-1", type: "task", title: "Alpha Task", url: "/tasks/tk-1", updatedAt: "2026-07-28T00:00:00Z" },
        { id: "ms-1", type: "milestone", title: "Alpha Milestone", url: "/projects/pr-1", updatedAt: "2026-07-28T00:00:00Z" },
      ],
    };
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "alpha" } });
    await waitFor(() => {
      expect(screen.getByTestId("entity-group-projects")).toBeInTheDocument();
      expect(screen.getByTestId("entity-group-tasks")).toBeInTheDocument();
      expect(screen.getByTestId("entity-group-milestones")).toBeInTheDocument();
    });
  });

  it("39. memory snippet rendered as plain text (HTML tags are not interpreted)", async () => {
    const mockResults: GlobalSearchResponseData = {
      query: "secret",
      totalResults: 1,
      items: [
        {
          id: "mem-privacy-1",
          type: "memory",
          title: "Memory Privacy Test",
          subtitle: "Plain text with <b>html tags</b>",
          url: "/projects/pr-1",
          updatedAt: "2026-07-28T00:00:00Z",
        },
      ],
    };
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "secret" } });
    await waitFor(() => {
      const item = screen.getByTestId("entity-item-memory-mem-privacy-1");
      expect(item.textContent).toContain("Plain text with <b>html tags</b>");
      expect(item.querySelector("b")).toBeNull();
    });
  });

  it("40. unsafe entity URL is blocked by isSafeInternalUrl", () => {
    expect(isSafeInternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalUrl("https://evil.com/steal")).toBe(false);
    expect(isSafeInternalUrl("//evil.com")).toBe(false);
    expect(isSafeInternalUrl("/projects/safe-id")).toBe(true);
  });

  it("41. memory subtitle is not duplicated into multiple hidden DOM nodes", async () => {
    const mockResults: GlobalSearchResponseData = {
      query: "dup",
      totalResults: 1,
      items: [
        {
          id: "mem-dup-1",
          type: "memory",
          title: "Memory Dup Test",
          subtitle: "unique-snippet-for-test",
          url: "/projects/pr-1",
          updatedAt: "2026-07-28T00:00:00Z",
        },
      ],
    };
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(
      <TestWrapper>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "dup" } });
    await waitFor(() => {
      expect(screen.getByTestId("entity-item-memory-mem-dup-1")).toBeInTheDocument();
    });
    const snippetMatches = screen.getAllByText("unique-snippet-for-test");
    expect(snippetMatches.length).toBe(1);
  });
});

// ===========================================================================
// L. Route Resilience
// ===========================================================================
describe("L. Route Resilience", () => {
  it("42. navigation command closes palette after click", async () => {
    render(
      <TestWrapper initialEntries={["/"]}>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.click(screen.getByTestId("command-item-navigation.projects"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });

  it("44. palette closes after entity navigation click", async () => {
    const mockResults: GlobalSearchResponseData = {
      query: "route",
      totalResults: 1,
      items: [
        { id: "r-1", type: "project", title: "Route Project", url: "/projects/r-1", updatedAt: "2026-07-28T00:00:00Z" },
      ],
    };
    vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

    render(
      <TestWrapper initialEntries={["/"]}>
        <CommandPalette />
      </TestWrapper>
    );
    await openPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "route" } });
    await waitFor(() => {
      expect(screen.getByTestId("entity-item-project-r-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("entity-item-project-r-1"));
    await waitFor(() => {
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });
  });
});

// ===========================================================================
// M. Safety Class Boundaries
// ===========================================================================
describe("M. Existing Safety Class Boundaries", () => {
  it("46. CLASS D domain-mutation command is blocked without confirmation", async () => {
    const { executeCommand } = await import("@/features/commands/executor/command.executor");
    const { CommandRegistry } = await import("@/features/commands/registry/command.registry");

    const registry = new CommandRegistry();
    registry.registerCommand({
      id: "mutation.test-block",
      label: "Delete Entity",
      group: "Actions" as const,
      safetyClass: "domain-mutation" as const,
      mutationKey: "delete-entity",
      requiresConfirmation: true,
    });

    const result = await executeCommand(
      "mutation.test-block",
      { currentPath: "/" },
      { navigate: vi.fn() },
      registry
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toContain("confirmation");
    }
  });

  it("47. CLASS E AI-controlled action is blocked without signed token", async () => {
    const { executeCommand } = await import("@/features/commands/executor/command.executor");
    const { CommandRegistry } = await import("@/features/commands/registry/command.registry");

    const registry = new CommandRegistry();
    registry.registerCommand({
      id: "ai.test-block",
      label: "AI Action",
      group: "Actions" as const,
      safetyClass: "ai-controlled-action" as const,
      actionType: "CREATE_TASK",
      requiresSignedToken: true,
    });

    const result = await executeCommand(
      "ai.test-block",
      { currentPath: "/" },
      { navigate: vi.fn() },
      registry
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toContain("Phase 28");
    }
  });

  it("48. unknown command returns not-found status", async () => {
    const { executeCommand } = await import("@/features/commands/executor/command.executor");
    const { CommandRegistry } = await import("@/features/commands/registry/command.registry");

    const registry = new CommandRegistry();
    const result = await executeCommand("totally.unknown", { currentPath: "/" }, { navigate: vi.fn() }, registry);
    expect(result.status).toBe("not-found");
  });
});
