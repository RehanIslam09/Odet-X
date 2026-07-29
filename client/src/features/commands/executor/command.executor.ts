/**
 * Command Execution Engine
 * Phase 31 — Global Search & Command Palette
 * WP-04 — Command Registry & Execution Architecture
 */

import type {
  CommandContext,
  CommandExecutionAdapters,
  CommandExecutionResult,
} from "../types/command.types.js";
import {
  CommandRegistry,
  defaultCommandRegistry,
} from "../registry/command.registry.js";

/**
 * Safely executes a command by ID.
 * Enforces availability checks, safety-class boundaries, and adapter isolation.
 */
export async function executeCommand(
  commandId: string,
  context: CommandContext,
  adapters: CommandExecutionAdapters,
  registry: CommandRegistry = defaultCommandRegistry
): Promise<CommandExecutionResult> {
  const cmd = registry.getCommandById(commandId);

  if (!cmd) {
    return {
      status: "not-found",
      commandId,
    };
  }

  // Verify context availability
  if (cmd.isAvailable && !cmd.isAvailable(context)) {
    return {
      status: "unavailable",
      commandId,
      reason: "Command is not available in the current context.",
    };
  }

  try {
    switch (cmd.safetyClass) {
      case "navigation": {
        if (!adapters.navigate) {
          return {
            status: "failed",
            commandId,
            error: "Navigation adapter is missing.",
          };
        }
        adapters.navigate(cmd.targetRoute);
        return { status: "executed", commandId };
      }

      case "ui-launcher": {
        if (cmd.launcherKey === "create-project") {
          if (!adapters.openCreateProject) {
            return {
              status: "failed",
              commandId,
              error: "Create project launcher adapter is missing.",
            };
          }
          adapters.openCreateProject();
          return { status: "executed", commandId };
        }

        if (cmd.launcherKey === "create-task") {
          if (!adapters.openCreateTask) {
            return {
              status: "failed",
              commandId,
              error: "Create task launcher adapter is missing.",
            };
          }
          adapters.openCreateTask(context.projectId);
          return { status: "executed", commandId };
        }

        return {
          status: "failed",
          commandId,
          error: `Unknown launcher key: ${cmd.launcherKey}`,
        };
      }

      case "safe-client-state": {
        return {
          status: "failed",
          commandId,
          error: "Safe client state execution adapter not configured.",
        };
      }

      case "domain-mutation": {
        return {
          status: "failed",
          commandId,
          error:
            "Direct domain mutation commands must delegate through existing confirmation workflows.",
        };
      }

      case "ai-controlled-action": {
        return {
          status: "failed",
          commandId,
          error:
            "AI controlled action commands must delegate through Phase 28 ActionExecutor with signed confirmation token.",
        };
      }

      default: {
        return {
          status: "failed",
          commandId,
          error: "Unrecognized command safety class.",
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "failed",
      commandId,
      error: message,
    };
  }
}
