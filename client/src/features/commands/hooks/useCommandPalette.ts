/**
 * Command Palette Hook
 * Retrieves unified CommandPaletteContext state.
 */

import { useContext } from "react";
import { CommandPaletteContext, type CommandPaletteState } from "../context/CommandPaletteContext.js";
import type { CommandExecutionResult } from "../types/command.types.js";

const DEFAULT_FALLBACK_STATE: CommandPaletteState = {
  open: false,
  setOpen: () => {},
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
  query: "",
  setQuery: () => {},
  context: { currentPath: "/" },
  commands: [],
  executeCommand: async (commandId: string): Promise<CommandExecutionResult> => ({ status: "not-found", commandId }),
  createProjectOpen: false,
  setCreateProjectOpen: () => {},
  createTaskOpen: false,
  setCreateTaskOpen: () => {},
  createTaskProjectId: undefined,
};

export function useCommandPalette(): CommandPaletteState {
  const ctx = useContext(CommandPaletteContext);
  return ctx || DEFAULT_FALLBACK_STATE;
}
