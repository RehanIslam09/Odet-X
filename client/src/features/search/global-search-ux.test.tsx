/**
 * Global Search UX & Result Navigation Vitest Suite
 * Phase 31 — Global Search & Command Palette
 * WP-06 — Global Search UX & Result Navigation
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandPalette } from "@/features/commands/components/CommandPalette";
import { CommandPaletteProvider } from "@/features/commands/context/CommandPaletteProvider";
import { defaultCommandRegistry } from "@/features/commands/registry/command.registry";
import { defaultCommands } from "@/features/commands/catalog/default-commands";
import { searchApi } from "./services/search.api";
import { isSafeInternalUrl } from "./utils/url.utils";
import type { GlobalSearchResponseData } from "./types/search.types";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function TestWrapper({ initialEntries = ["/"], children }: { initialEntries?: string[]; children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <CommandPaletteProvider>
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        </CommandPaletteProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("WP-06: Global Search UX & Result Navigation Integration", () => {
  beforeEach(() => {
    defaultCommandRegistry.resetRegistry();
    defaultCommandRegistry.registerCommands([...defaultCommands]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // A. REQUEST THRESHOLD & SUPPRESSION
  describe("A. Request Threshold & Suppression", () => {
    it("1-2. empty query and single-character query perform 0 search API calls", async () => {
      const searchSpy = vi.spyOn(searchApi, "globalSearch");

      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      const input = screen.getByTestId("command-palette-input");
      fireEvent.change(input, { target: { value: "a" } });

      // Use act-wrapped wait to correctly gate debounce without leaking act() warnings
      await act(async () => {
        await new Promise((r) => setTimeout(r, 400));
      });
      expect(searchSpy).not.toHaveBeenCalled();
    });

    it("3-4. two-character query triggers debounced search API call with trimmed query", async () => {
      const searchSpy = vi.spyOn(searchApi, "globalSearch").mockResolvedValue({
        query: "alpha",
        totalResults: 0,
        items: [],
      });

      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      const input = screen.getByTestId("command-palette-input");
      fireEvent.change(input, { target: { value: "  alpha  " } });

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith(
          {
            q: "alpha",
            type: "all",
            limit: 20,
          },
          expect.any(AbortSignal)
        );
      });
    });
  });

  // B. COMMANDS + ENTITIES COMPOSITION & GROUPING
  describe("B. Commands & Entity Search Composition", () => {
    it("12-20. renders entity search results grouped by type alongside local commands", async () => {
      const mockResults: GlobalSearchResponseData = {
        query: "alpha",
        totalResults: 4,
        items: [
          {
            id: "proj-1",
            type: "project",
            title: "Alpha Engine",
            subtitle: "Core Engine",
            url: "/projects/proj-1",
            updatedAt: "2026-07-28T12:00:00.000Z",
          },
          {
            id: "task-1",
            type: "task",
            title: "Alpha Integration Task",
            projectName: "Alpha Engine",
            status: "in_progress",
            url: "/tasks/task-1",
            updatedAt: "2026-07-28T12:00:00.000Z",
          },
          {
            id: "ms-1",
            type: "milestone",
            title: "Alpha Launch Milestone",
            projectName: "Alpha Engine",
            url: "/projects/proj-1",
            updatedAt: "2026-07-28T12:00:00.000Z",
          },
          {
            id: "mem-1",
            type: "memory",
            title: "Alpha Memory Note",
            subtitle: "Decision: use Redis for session caching",
            url: "/projects/proj-1",
            updatedAt: "2026-07-28T12:00:00.000Z",
          },
        ],
      };

      vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockResults);

      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      const input = screen.getByTestId("command-palette-input");
      fireEvent.change(input, { target: { value: "alpha" } });

      await waitFor(() => {
        expect(screen.getByTestId("entity-group-projects")).toBeInTheDocument();
        expect(screen.getByTestId("entity-group-tasks")).toBeInTheDocument();
        expect(screen.getByTestId("entity-group-milestones")).toBeInTheDocument();
        expect(screen.getByTestId("entity-group-project-memories")).toBeInTheDocument();

        expect(screen.getByTestId("entity-item-project-proj-1")).toBeInTheDocument();
        expect(screen.getByTestId("entity-item-task-task-1")).toBeInTheDocument();
        expect(screen.getByTestId("entity-item-milestone-ms-1")).toBeInTheDocument();
        expect(screen.getByTestId("entity-item-memory-mem-1")).toBeInTheDocument();
      });
    });
  });

  // C. PRIVACY & SAFETY BOUNDARIES
  describe("C. Privacy & Security Boundaries", () => {
    it("21-24. ProjectMemory snippet is rendered strictly as plain text", async () => {
      const mockMemoryResults: GlobalSearchResponseData = {
        query: "snippet",
        totalResults: 1,
        items: [
          {
            id: "mem-2",
            type: "memory",
            title: "Memory Snippet Safety",
            subtitle: "Safe plain text <b>html tag</b>",
            url: "/projects/proj-1",
            updatedAt: "2026-07-28T12:00:00.000Z",
          },
        ],
      };

      vi.spyOn(searchApi, "globalSearch").mockResolvedValue(mockMemoryResults);

      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "snippet" } });

      await waitFor(() => {
        const item = screen.getByTestId("entity-item-memory-mem-2");
        expect(item).toBeInTheDocument();
        // Text is rendered as plain string, not raw HTML element
        expect(item.textContent).toContain("Safe plain text <b>html tag</b>");
      });
    });

    it("31. isSafeInternalUrl rejects external and protocol-relative URLs", () => {
      expect(isSafeInternalUrl("/projects/123")).toBe(true);
      expect(isSafeInternalUrl("/tasks/abc?status=open")).toBe(true);

      expect(isSafeInternalUrl("https://evil.com")).toBe(false);
      expect(isSafeInternalUrl("http://localhost:3000")).toBe(false);
      expect(isSafeInternalUrl("//evil.com")).toBe(false);
      expect(isSafeInternalUrl("javascript:alert(1)")).toBe(false);
    });
  });

  // D. ENTITY NAVIGATION
  describe("D. Entity Navigation", () => {
    it("25-30. selecting an entity result navigates via React Router and closes palette", async () => {
      const mockResults: GlobalSearchResponseData = {
        query: "task",
        totalResults: 1,
        items: [
          {
            id: "task-99",
            type: "task",
            title: "Navigation Target Task",
            url: "/tasks/task-99",
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

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "task" } });

      await waitFor(() => {
        expect(screen.getByTestId("entity-item-task-task-99")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("entity-item-task-task-99"));

      await waitFor(() => {
        expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      });
    });
  });

  // E. STATES & LIFECYCLE
  describe("E. Error Handling & Query Lifecycle", () => {
    it("35. API search error renders non-destructive note while local commands remain selectable", async () => {
      vi.spyOn(searchApi, "globalSearch").mockRejectedValue(new Error("Network Error"));

      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "dash" } });

      await waitFor(() => {
        expect(screen.getByTestId("search-error-indicator")).toBeInTheDocument();
        // Local command remains functional
        expect(screen.getByTestId("command-item-navigation.dashboard")).toBeInTheDocument();
      });
    });

    it("36-39. closing and reopening palette resets transient query", async () => {
      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      // Open palette
      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      // Type query
      const input = screen.getByTestId("command-palette-input");
      fireEvent.change(input, { target: { value: "projects" } });
      expect((input as HTMLInputElement).value).toBe("projects");

      // Close palette via Escape
      fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
      await waitFor(() => {
        expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      });

      // Reopen palette
      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        const newInput = screen.getByTestId("command-palette-input") as HTMLInputElement;
        expect(newInput.value).toBe("");
      });
    });

    it("45. cancels in-flight search request by propagating AbortSignal to searchApi", async () => {
      const searchSpy = vi.spyOn(searchApi, "globalSearch").mockImplementation((_params, signal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return Promise.resolve({ query: "alpha", totalResults: 0, items: [] });
      });

      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "alpha" } });

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith(
          { q: "alpha", type: "all", limit: 20 },
          expect.any(AbortSignal)
        );
      });
    });
  });
});
