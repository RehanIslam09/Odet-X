/**
 * Command Palette State & Lifecycle Hook
 * Phase 31 — Global Search & Command Palette
 * WP-05 — Command Palette Foundation
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  CommandContext,
  CommandDefinition,
  CommandExecutionAdapters,
  CommandExecutionResult,
} from "../types/command.types.js";
import {
  CommandRegistry,
  defaultCommandRegistry,
} from "../registry/command.registry.js";
import { executeCommand } from "../executor/command.executor.js";
import { defaultCommands } from "../catalog/default-commands.js";
import { isGlobalCommandPaletteSuppressed } from "../utils/keyboard.utils.js";

// Ensure default catalog is registered in defaultCommandRegistry once on module load
if (defaultCommandRegistry.getAllCommands().length === 0) {
  defaultCommandRegistry.registerCommands([...defaultCommands]);
}

export function useCommandPalette(
  registry: CommandRegistry = defaultCommandRegistry
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Launcher dialog state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | undefined>(undefined);

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string; taskId?: string }>();

  // Extract current application context
  const context: CommandContext = useMemo(() => {
    // Also support parsing /projects/:projectId from location.pathname if params is empty
    let projId = params.projectId;
    if (!projId) {
      const match = location.pathname.match(/^\/projects\/([a-f0-9]{24})/i);
      if (match) {
        projId = match[1];
      }
    }

    return {
      currentPath: location.pathname,
      projectId: projId,
      taskId: params.taskId,
    };
  }, [location.pathname, params.projectId, params.taskId]);

  // Retrieve deterministic commands matching current query and context
  const filteredCommands: CommandDefinition[] = useMemo(() => {
    return registry.searchCommands(query, context);
  }, [query, context, registry]);

  // Execution adapters
  const adapters: CommandExecutionAdapters = useMemo(
    () => ({
      navigate: (path: string) => {
        navigate(path);
      },
      openCreateProject: () => {
        setCreateProjectOpen(true);
      },
      openCreateTask: (initialProjectId?: string) => {
        setCreateTaskProjectId(initialProjectId);
        setCreateTaskOpen(true);
      },
    }),
    [navigate]
  );

  // Execute command by ID
  const handleExecuteCommand = useCallback(
    async (commandId: string): Promise<CommandExecutionResult> => {
      const result = await executeCommand(
        commandId,
        context,
        adapters,
        registry
      );

      if (result.status === "executed") {
        setOpen(false);
        setQuery("");
      }

      return result;
    },
    [context, adapters, registry]
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate on KeyK code, with exactly Ctrl or Meta,
      // no additional modifiers (Shift/Alt), and never on key repeat.
      if (e.code !== "KeyK") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.shiftKey || e.altKey) return;
      if (e.repeat) return;

      if (isGlobalCommandPaletteSuppressed(e)) {
        return;
      }
      e.preventDefault();
      setOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    open,
    setOpen,
    query,
    setQuery,
    context,
    commands: filteredCommands,
    executeCommand: handleExecuteCommand,
    // Launcher state
    createProjectOpen,
    setCreateProjectOpen,
    createTaskOpen,
    setCreateTaskOpen,
    createTaskProjectId,
  };
}
