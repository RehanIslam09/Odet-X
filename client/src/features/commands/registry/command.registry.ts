/**
 * Command Registry & Search Engine
 * Phase 31 — Global Search & Command Palette
 * WP-04 — Command Registry & Execution Architecture
 */

import type { CommandDefinition, CommandContext } from "../types/command.types.js";

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  /**
   * Registers a single command.
   * Throws an error if a command with the same ID already exists.
   */
  public registerCommand(command: CommandDefinition): void {
    if (!command.id || command.id.trim().length === 0) {
      throw new Error("Command ID must be a non-empty string.");
    }
    if (this.commands.has(command.id)) {
      throw new Error(`Duplicate command ID registration: '${command.id}'`);
    }
    this.commands.set(command.id, Object.freeze({ ...command }));
  }

  /**
   * Registers multiple commands in batch.
   */
  public registerCommands(commands: CommandDefinition[]): void {
    for (const cmd of commands) {
      this.registerCommand(cmd);
    }
  }

  /**
   * Retrieves all registered commands in canonical insertion order.
   */
  public getAllCommands(): readonly CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Retrieves a command by its unique ID.
   */
  public getCommandById(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  /**
   * Retrieves commands that are available for a given context.
   */
  public getAvailableCommands(context: CommandContext): CommandDefinition[] {
    return this.getAllCommands().filter((cmd) => {
      if (cmd.isAvailable) {
        return cmd.isAvailable(context);
      }
      return true;
    });
  }

  /**
   * Deterministically filters and ranks commands matching a user query string.
   */
  public searchCommands(
    query: string,
    context?: CommandContext
  ): CommandDefinition[] {
    const available = context
      ? this.getAvailableCommands(context)
      : Array.from(this.getAllCommands());

    const trimmed = (query || "").trim().toLowerCase();
    if (!trimmed) {
      return available;
    }

    interface ScoredCommand {
      cmd: CommandDefinition;
      score: number;
    }

    const scored: ScoredCommand[] = [];

    for (const cmd of available) {
      const labelLower = cmd.label.toLowerCase();
      let score = 0;

      if (labelLower === trimmed) {
        score = 100;
      } else if (labelLower.startsWith(trimmed)) {
        score = 80;
      } else if (labelLower.includes(trimmed)) {
        score = 60;
      } else if (cmd.keywords && cmd.keywords.some((k) => k.toLowerCase().includes(trimmed))) {
        score = 40;
      } else if (cmd.description && cmd.description.toLowerCase().includes(trimmed)) {
        score = 30;
      }

      if (score > 0) {
        scored.push({ cmd, score });
      }
    }

    // Sort by score DESC, keeping canonical registry insertion order for ties
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.cmd);
  }

  /**
   * Resets the registry (primarily for test teardown).
   */
  public resetRegistry(): void {
    this.commands.clear();
  }
}

/**
 * Singleton command registry instance for the application.
 */
export const defaultCommandRegistry = new CommandRegistry();
