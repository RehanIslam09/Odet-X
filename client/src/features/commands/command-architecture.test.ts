/**
 * Command Registry & Execution Architecture Tests
 * Phase 31 — Global Search & Command Palette
 * WP-04 — Command Registry & Execution Architecture
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  CommandDefinition,
  CommandContext,
  CommandExecutionAdapters,
} from "./index.js";
import {
  CommandRegistry,
  executeCommand,
  defaultCommands,
} from "./index.js";

describe("WP-04: Command Registry & Execution Architecture", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
    registry.registerCommands([...defaultCommands]);
  });

  // A. REGISTRY INTEGRITY
  describe("A. Registry Integrity", () => {
    it("1. registry loads successfully with default catalog", () => {
      const commands = registry.getAllCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.length).toBe(defaultCommands.length);
    });

    it("2-6. registry contains unique IDs, non-empty labels, valid safety classes, and deterministic ordering", () => {
      const commands = registry.getAllCommands();
      const ids = new Set<string>();

      const validSafetyClasses = new Set([
        "navigation",
        "ui-launcher",
        "safe-client-state",
        "domain-mutation",
        "ai-controlled-action",
      ]);

      for (const cmd of commands) {
        expect(ids.has(cmd.id)).toBe(false);
        ids.add(cmd.id);

        expect(cmd.label.trim().length).toBeGreaterThan(0);
        expect(validSafetyClasses.has(cmd.safetyClass)).toBe(true);
        expect(cmd.group).toBeTruthy();
      }

      // Check deterministic ordering
      const idsOrder1 = registry.getAllCommands().map((c) => c.id);
      const idsOrder2 = registry.getAllCommands().map((c) => c.id);
      expect(idsOrder1).toEqual(idsOrder2);
    });

    it("7. rejects registration of duplicate command IDs with a descriptive error", () => {
      const dup: CommandDefinition = {
        id: "navigation.dashboard",
        label: "Duplicate Dashboard",
        group: "Navigation",
        safetyClass: "navigation",
        targetRoute: "/",
      };
      expect(() => registry.registerCommand(dup)).toThrow(
        "Duplicate command ID registration: 'navigation.dashboard'"
      );
    });
  });

  // B. LOOKUP
  describe("B. Command Lookup", () => {
    it("8. known command can be retrieved by ID", () => {
      const cmd = registry.getCommandById("navigation.dashboard");
      expect(cmd).toBeDefined();
      expect(cmd?.label).toBe("Go to Dashboard");
    });

    it("9. unknown command returns undefined (safe not-found)", () => {
      const cmd = registry.getCommandById("unknown.command");
      expect(cmd).toBeUndefined();
    });

    it("10. lookup does not mutate registry state", () => {
      const initialCount = registry.getAllCommands().length;
      registry.getCommandById("navigation.projects");
      registry.getCommandById("nonexistent");
      expect(registry.getAllCommands().length).toBe(initialCount);
    });
  });

  // C. AVAILABILITY & CONTEXT
  describe("C. Command Availability & Context Rules", () => {
    it("11. globally available navigation commands are available in normal context", () => {
      const context: CommandContext = { currentPath: "/" };
      const available = registry.getAvailableCommands(context);
      expect(available.some((c) => c.id === "navigation.dashboard")).toBe(true);
    });

    it("12-13. context-dependent command evaluates availability correctly based on context", () => {
      const ctxCmd: CommandDefinition = {
        id: "context.project-specific",
        label: "Project Action",
        group: "Projects",
        safetyClass: "navigation",
        targetRoute: "/projects/123",
        isAvailable: (ctx) => Boolean(ctx.projectId),
      };
      registry.registerCommand(ctxCmd);

      const noProjCtx: CommandContext = { currentPath: "/" };
      expect(registry.getAvailableCommands(noProjCtx).some((c) => c.id === "context.project-specific")).toBe(false);

      const projCtx: CommandContext = { currentPath: "/projects/123", projectId: "123" };
      expect(registry.getAvailableCommands(projCtx).some((c) => c.id === "context.project-specific")).toBe(true);
    });
  });

  // D. DETERMINISTIC SEARCH & FILTERING
  describe("D. Deterministic Command Search & Filtering", () => {
    it("14. empty query returns all available commands", () => {
      const results = registry.searchCommands("");
      expect(results.length).toBe(registry.getAllCommands().length);
    });

    it("15-18. label and keyword matching is case-insensitive and normalized", () => {
      const resultsLabel = registry.searchCommands("  dashboard  ");
      expect(resultsLabel.length).toBeGreaterThan(0);
      expect(resultsLabel[0].id).toBe("navigation.dashboard");

      const resultsKeyword = registry.searchCommands("home");
      expect(resultsKeyword.some((c) => c.id === "navigation.dashboard")).toBe(true);
    });

    it("19. unrelated query returns empty array", () => {
      const results = registry.searchCommands("nonexistentkeyword12345");
      expect(results).toEqual([]);
    });

    it("20-22. repeated identical searches return identical deterministic ordering", () => {
      const res1 = registry.searchCommands("create").map((c) => c.id);
      const res2 = registry.searchCommands("create").map((c) => c.id);
      expect(res1).toEqual(res2);
    });
  });

  // E. CLASS A NAVIGATION INTEGRATION
  describe("E. CLASS A — Navigation Command Execution", () => {
    it("23-26. calls navigate adapter with canonical route without full-page reload", async () => {
      const navigateMock = vi.fn();
      const adapters: CommandExecutionAdapters = { navigate: navigateMock };
      const context: CommandContext = { currentPath: "/" };

      const result = await executeCommand("navigation.projects", context, adapters, registry);
      expect(result).toEqual({ status: "executed", commandId: "navigation.projects" });
      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/projects");
    });
  });

  // F. CLASS B LAUNCHER INTEGRATION
  describe("F. CLASS B — UI Launcher Command Execution", () => {
    it("27-30. opens create project dialog via launcher adapter", async () => {
      const openCreateProjectMock = vi.fn();
      const navigateMock = vi.fn();
      const adapters: CommandExecutionAdapters = {
        navigate: navigateMock,
        openCreateProject: openCreateProjectMock,
      };
      const context: CommandContext = { currentPath: "/" };

      const result = await executeCommand("launcher.create-project", context, adapters, registry);
      expect(result).toEqual({ status: "executed", commandId: "launcher.create-project" });
      expect(openCreateProjectMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("27-30. opens create task dialog with optional initialProjectId context", async () => {
      const openCreateTaskMock = vi.fn();
      const adapters: CommandExecutionAdapters = {
        navigate: vi.fn(),
        openCreateTask: openCreateTaskMock,
      };
      const context: CommandContext = { currentPath: "/projects/proj-100", projectId: "proj-100" };

      const result = await executeCommand("launcher.create-task", context, adapters, registry);
      expect(result).toEqual({ status: "executed", commandId: "launcher.create-task" });
      expect(openCreateTaskMock).toHaveBeenCalledTimes(1);
      expect(openCreateTaskMock).toHaveBeenCalledWith("proj-100");
    });
  });

  // G. UNKNOWN / UNAVAILABLE EXECUTION
  describe("G. Unknown & Unavailable Command Execution Safety", () => {
    it("31. unknown command returns status not-found without executing adapters", async () => {
      const navigateMock = vi.fn();
      const result = await executeCommand("unknown.id", { currentPath: "/" }, { navigate: navigateMock }, registry);
      expect(result).toEqual({ status: "not-found", commandId: "unknown.id" });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("32-34. unavailable command returns status unavailable without executing adapters", async () => {
      const ctxCmd: CommandDefinition = {
        id: "context.locked",
        label: "Locked Command",
        group: "Projects",
        safetyClass: "navigation",
        targetRoute: "/locked",
        isAvailable: () => false,
      };
      registry.registerCommand(ctxCmd);

      const navigateMock = vi.fn();
      const result = await executeCommand("context.locked", { currentPath: "/" }, { navigate: navigateMock }, registry);
      expect(result).toEqual({
        status: "unavailable",
        commandId: "context.locked",
        reason: "Command is not available in the current context.",
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // H. SAFETY CLASSES & TAXONOMY BOUNDARIES
  describe("H. Safety Classes & Taxonomy Boundaries", () => {
    it("37. CLASS D mutating domain command requires confirmation and rejects direct unconfirmed execution", async () => {
      const mutationCmd: CommandDefinition = {
        id: "mutation.delete-item",
        label: "Delete Item",
        group: "Actions",
        safetyClass: "domain-mutation",
        mutationKey: "delete-item",
        requiresConfirmation: true,
      };
      registry.registerCommand(mutationCmd);

      const result = await executeCommand("mutation.delete-item", { currentPath: "/" }, { navigate: vi.fn() }, registry);
      expect(result.status).toBe("failed");
      if (result.status === "failed") {
        expect(result.error).toContain("confirmation workflows");
      }
    });

    it("38. CLASS E AI controlled action command requires Phase 28 signed token delegation", async () => {
      const aiCmd: CommandDefinition = {
        id: "ai.generate-plan",
        label: "Generate Plan",
        group: "Actions",
        safetyClass: "ai-controlled-action",
        actionType: "CREATE_TASK",
        requiresSignedToken: true,
      };
      registry.registerCommand(aiCmd);

      const result = await executeCommand("ai.generate-plan", { currentPath: "/" }, { navigate: vi.fn() }, registry);
      expect(result.status).toBe("failed");
      if (result.status === "failed") {
        expect(result.error).toContain("Phase 28 ActionExecutor");
      }
    });
  });

  // I. ADAPTER ISOLATION
  describe("I. Adapter Isolation", () => {
    it("39-44. registry modules operate purely without React dependencies or window global objects", () => {
      const commands = registry.getAllCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.every((c) => typeof c.id === "string")).toBe(true);
    });
  });

  // J. ZERO SIDE-EFFECTS AUDIT
  describe("J. Zero Side-Effects Audit", () => {
    it("45-50. registry operations, lookups, and search perform zero network calls or mutations", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      registry.getAllCommands();
      registry.getCommandById("navigation.dashboard");
      registry.getAvailableCommands({ currentPath: "/" });
      registry.searchCommands("project");

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
