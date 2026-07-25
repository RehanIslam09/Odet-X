import { SymbolicEntityMapItem } from "@/domain/copilot-context-builder.js";
import { AllowedActionType, ProposedAction } from "../action.types.js";
import { actionRegistry } from "../action.registry.js";
import { CreateTaskHandler } from "./create-task.handler.js";
import { UpdateTaskStatusHandler } from "./update-task-status.handler.js";
import { UpdateTaskPriorityHandler } from "./update-task-priority.handler.js";
import { UpdateTaskDueDateHandler } from "./update-task-due-date.handler.js";
import { AddTaskLabelHandler } from "./add-task-label.handler.js";

/**
 * Context provided to an AI action handler for validation, dry-run, and execution.
 */
export interface ActionContext {
  userId: string;
  projectId: string;
  symbolicMap: Record<string, SymbolicEntityMapItem>;
}

/**
 * Structured diff and preview generated during action dry-run simulation.
 */
export interface DryRunResult {
  actionType: AllowedActionType;
  target: {
    id: string;
    label: string;
    type: "task" | "project";
  };
  diff: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  explanation: string;
  expectedVersion: number | null;
}

/**
 * Result returned after successful execution of an AI action by a domain service.
 */
export interface ExecutionResult {
  actionType: AllowedActionType;
  targetId: string;
  executedAt: string;
  updatedEntity: Record<string, unknown>;
  activityId?: string;
}

/**
 * Interface contract that all action handlers must implement.
 * Handlers delegate actual mutations to domain services (e.g. task.service.ts).
 */
export interface ActionHandler<TAction extends ProposedAction = ProposedAction> {
  readonly actionType: TAction["action"];
  dryRun(context: ActionContext, action: TAction): Promise<DryRunResult>;
  execute(context: ActionContext, action: TAction, expectedVersion: number | null): Promise<ExecutionResult>;
}

export {
  CreateTaskHandler,
  UpdateTaskStatusHandler,
  UpdateTaskPriorityHandler,
  UpdateTaskDueDateHandler,
  AddTaskLabelHandler,
};

/**
 * Registers all 5 default AI action handlers into the ActionRegistry singleton.
 */
export function registerDefaultActionHandlers(): void {
  const handlers: ActionHandler<any>[] = [
    new CreateTaskHandler(),
    new UpdateTaskStatusHandler(),
    new UpdateTaskPriorityHandler(),
    new UpdateTaskDueDateHandler(),
    new AddTaskLabelHandler(),
  ];

  for (const handler of handlers) {
    if (!actionRegistry.has(handler.actionType)) {
      actionRegistry.register(handler);
    }
  }
}
