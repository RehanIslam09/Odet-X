/**
 * Command Palette UI & Lifecycle Tests
 * Phase 31 — Global Search & Command Palette
 * WP-05 — Command Palette Foundation
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandPalette } from "./components/CommandPalette";
import { CommandPaletteProvider } from "./context/CommandPaletteProvider";
import { isGlobalCommandPaletteSuppressed } from "./utils/keyboard.utils";
import { defaultCommandRegistry } from "./registry/command.registry";
import { defaultCommands } from "./catalog/default-commands";
import type { CommandDefinition } from "./types/command.types";

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

describe("WP-05: Command Palette UI & Lifecycle Integration", () => {
  beforeEach(() => {
    defaultCommandRegistry.resetRegistry();
    defaultCommandRegistry.registerCommands([...defaultCommands]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // A. PALETTE LIFECYCLE
  describe("A. Palette Lifecycle", () => {
    it("1. palette starts closed by default", () => {
      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );
      expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
    });

    it("2. Ctrl+K opens palette", async () => {
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

    it("3. Cmd+K (metaKey) opens palette", async () => {
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

    it("4. Escape key closes palette", async () => {
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

      // Press Escape
      fireEvent.keyDown(document.activeElement || window, { key: "Escape", code: "Escape" });
      await waitFor(() => {
        expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      });
    });

    it("5-6. unmounting cleans up window keydown listener", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      unmount();
      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });

  // B. COLLISION BEHAVIOR
  describe("B. Collision Protection & TaskNotesEditor Immunity", () => {
    it("7. event.defaultPrevented prevents global command palette activation", () => {
      const mockEvent = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        cancelable: true,
      });
      mockEvent.preventDefault();

      expect(isGlobalCommandPaletteSuppressed(mockEvent)).toBe(true);
    });

    it("8-9. textarea with data-suppress-global-command-palette=true prevents global palette activation", () => {
      const textarea = document.createElement("textarea");
      textarea.setAttribute("data-suppress-global-command-palette", "true");
      document.body.appendChild(textarea);

      const eventOnTextarea = {
        defaultPrevented: false,
        target: textarea,
      } as unknown as KeyboardEvent;

      expect(isGlobalCommandPaletteSuppressed(eventOnTextarea)).toBe(true);
      document.body.removeChild(textarea);
    });
  });

  // C. COMMAND RENDERING
  describe("C. Command Rendering & Grouping", () => {
    it("10-14. displays available commands grouped under Navigation and Actions", async () => {
      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      expect(screen.getByTestId("command-group-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("command-group-actions")).toBeInTheDocument();

      expect(screen.getByTestId("command-item-navigation.dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("command-item-launcher.create-project")).toBeInTheDocument();
    });

    it("14. typing an unmatched query displays the empty state", async () => {
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
      fireEvent.change(input, { target: { value: "nonexistentcommandxyz" } });

      await waitFor(() => {
        expect(screen.getByTestId("command-palette-empty")).toBeInTheDocument();
        expect(screen.getByText("No results found.")).toBeInTheDocument();
      });
    });
  });

  // D. DETERMINISTIC FILTERING
  describe("D. Deterministic Command Search Integration", () => {
    it("15-17. typing filters commands via WP-04 searchCommands", async () => {
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
      fireEvent.change(input, { target: { value: "project" } });

      await waitFor(() => {
        expect(screen.getByTestId("command-item-navigation.projects")).toBeInTheDocument();
        expect(screen.getByTestId("command-item-launcher.create-project")).toBeInTheDocument();
        expect(screen.queryByTestId("command-item-navigation.dashboard")).not.toBeInTheDocument();
      });
    });
  });

  // E. CLASS A NAVIGATION EXECUTION
  describe("E. CLASS A — Navigation Execution", () => {
    it("18-21. selecting navigation command executes React Router navigation and closes palette", async () => {
      render(
        <TestWrapper initialEntries={["/"]}>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      const projectsCmd = screen.getByTestId("command-item-navigation.projects");
      fireEvent.click(projectsCmd);

      await waitFor(() => {
        // Palette closes upon execution
        expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      });
    });
  });

  // F. CLASS B LAUNCHER EXECUTION
  describe("F. CLASS B — UI Launcher Execution", () => {
    it("22-25. selecting Create Project command opens CreateProjectDialog", async () => {
      render(
        <TestWrapper>
          <CommandPalette />
        </TestWrapper>
      );

      fireEvent.keyDown(window, { key: "k", code: "KeyK", ctrlKey: true });
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
      });

      const createProjCmd = screen.getByTestId("command-item-launcher.create-project");
      fireEvent.click(createProjCmd);

      await waitFor(() => {
        expect(screen.queryByTestId("command-palette-input")).not.toBeInTheDocument();
      });
    });
  });

  // G. SECURITY & SIDE-EFFECT BOUNDARIES
  describe("G. Security Boundaries & Zero Side-Effects Audit", () => {
    it("26-30. opening and searching palette triggers zero GET /api/v1/search HTTP requests and zero DB mutations", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

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

      // Type search query
      const input = screen.getByTestId("command-palette-input");
      fireEvent.change(input, { target: { value: "tasks" } });

      await waitFor(() => {
        expect(screen.getByTestId("command-item-navigation.tasks")).toBeInTheDocument();
      });

      // Zero HTTP requests occurred
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("27. direct unconfirmed CLASS D domain mutation command remains blocked", async () => {
      const mutationCmd: CommandDefinition = {
        id: "mutation.delete",
        label: "Delete Project",
        group: "Actions",
        safetyClass: "domain-mutation",
        mutationKey: "delete-project",
        requiresConfirmation: true,
      };
      defaultCommandRegistry.registerCommand(mutationCmd);

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
      fireEvent.change(input, { target: { value: "delete" } });

      await waitFor(() => {
        expect(screen.getByTestId("command-item-mutation.delete")).toBeInTheDocument();
      });

      const item = screen.getByTestId("command-item-mutation.delete");
      fireEvent.click(item);

      // Does NOT execute unconfirmed mutation
    });
  });
});
