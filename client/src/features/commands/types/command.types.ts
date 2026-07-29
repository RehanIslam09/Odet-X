/**
 * Command Safety Taxonomy & Domain Contracts
 * Phase 31 — Global Search & Command Palette
 * WP-04 — Command Registry & Execution Architecture
 */

export type CommandSafetyClass =
  | "navigation"
  | "ui-launcher"
  | "safe-client-state"
  | "domain-mutation"
  | "ai-controlled-action";

export type CommandGroup =
  | "Navigation"
  | "Actions"
  | "Projects"
  | "Tasks"
  | "Preferences";

export interface CommandContext {
  currentPath: string;
  projectId?: string;
  taskId?: string;
}

export interface BaseCommandDefinition {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  group: CommandGroup;
  safetyClass: CommandSafetyClass;
  shortcut?: string;
  iconKey?: string;
  isAvailable?: (context: CommandContext) => boolean;
}

export interface NavigationCommandDefinition extends BaseCommandDefinition {
  safetyClass: "navigation";
  targetRoute: string;
}

export interface UiLauncherCommandDefinition extends BaseCommandDefinition {
  safetyClass: "ui-launcher";
  launcherKey: "create-project" | "create-task";
}

export interface SafeClientStateCommandDefinition extends BaseCommandDefinition {
  safetyClass: "safe-client-state";
  stateKey: string;
}

export interface DomainMutationCommandDefinition extends BaseCommandDefinition {
  safetyClass: "domain-mutation";
  mutationKey: string;
  requiresConfirmation: true;
}

export interface AiControlledActionCommandDefinition extends BaseCommandDefinition {
  safetyClass: "ai-controlled-action";
  actionType: string;
  requiresSignedToken: true;
}

export type CommandDefinition =
  | NavigationCommandDefinition
  | UiLauncherCommandDefinition
  | SafeClientStateCommandDefinition
  | DomainMutationCommandDefinition
  | AiControlledActionCommandDefinition;

export interface CommandExecutionAdapters {
  navigate: (path: string) => void;
  openCreateProject?: () => void;
  openCreateTask?: (initialProjectId?: string) => void;
}

export type CommandExecutionResult =
  | { status: "executed"; commandId: string }
  | { status: "unavailable"; commandId: string; reason: string }
  | { status: "not-found"; commandId: string }
  | { status: "failed"; commandId: string; error: string };
