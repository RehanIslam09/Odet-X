/**
 * Command Palette React Context Definitions
 */

import { createContext } from "react";
import type {
  CommandContext,
  CommandDefinition,
  CommandExecutionResult,
} from "../types/command.types.js";

export interface CommandPaletteState {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  context: CommandContext;
  commands: CommandDefinition[];
  executeCommand: (commandId: string) => Promise<CommandExecutionResult>;
  createProjectOpen: boolean;
  setCreateProjectOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createTaskOpen: boolean;
  setCreateTaskOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createTaskProjectId?: string;
}

export const CommandPaletteContext = createContext<CommandPaletteState | null>(null);
