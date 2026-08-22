/**
 * Command Palette Context Provider
 * Provides unified single-source-of-truth state for the Command Palette
 * across the application layout hierarchy.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
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
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { isGlobalCommandPaletteSuppressed } from "../utils/keyboard.utils.js";
import { CommandPaletteContext, type CommandPaletteState } from "./CommandPaletteContext.js";

// Ensure default catalog is registered once on module load
if (defaultCommandRegistry.getAllCommands().length === 0) {
  defaultCommandRegistry.registerCommands([...defaultCommands]);
}

export interface CommandPaletteProviderProps {
  children: ReactNode;
  registry?: CommandRegistry;
}

export function CommandPaletteProvider({
  children,
  registry = defaultCommandRegistry,
}: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | undefined>(undefined);

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string; taskId?: string }>();
  const { currentWorkspace } = useActiveWorkspace();

  const openCommandPalette = useCallback(() => {
    setOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setOpen(false);
  }, []);

  const context: CommandContext = useMemo(() => {
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

  const filteredCommands: CommandDefinition[] = useMemo(() => {
    return registry.searchCommands(query, context);
  }, [query, context, registry]);

  const adapters: CommandExecutionAdapters = useMemo(
    () => ({
      navigate: (path: string) => {
        if (currentWorkspace?.slug && !path.startsWith("/w/")) {
          const subpath = path === "/" ? "/dashboard" : path;
          const cleanSubpath = subpath.startsWith("/") ? subpath : `/${subpath}`;
          navigate(`/w/${currentWorkspace.slug}${cleanSubpath}`);
        } else {
          navigate(path);
        }
      },
      openCreateProject: () => {
        setCreateProjectOpen(true);
      },
      openCreateTask: (initialProjectId?: string) => {
        setCreateTaskProjectId(initialProjectId);
        setCreateTaskOpen(true);
      },
    }),
    [navigate, currentWorkspace],
  );

  const handleExecuteCommand = useCallback(
    async (commandId: string): Promise<CommandExecutionResult> => {
      const result = await executeCommand(
        commandId,
        context,
        adapters,
        registry,
      );

      if (result.status === "executed") {
        setOpen(false);
        setQuery("");
      }

      return result;
    },
    [context, adapters, registry],
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" && e.code !== "KeyK") return;
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

  const value: CommandPaletteState = useMemo(
    () => ({
      open,
      setOpen,
      openCommandPalette,
      closeCommandPalette,
      query,
      setQuery,
      context,
      commands: filteredCommands,
      executeCommand: handleExecuteCommand,
      createProjectOpen,
      setCreateProjectOpen,
      createTaskOpen,
      setCreateTaskOpen,
      createTaskProjectId,
    }),
    [
      open,
      openCommandPalette,
      closeCommandPalette,
      query,
      context,
      filteredCommands,
      handleExecuteCommand,
      createProjectOpen,
      createTaskOpen,
      createTaskProjectId,
    ],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}
