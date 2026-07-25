import { BadRequestError } from "@/utils/app-error.js";
import { ProposedAction, ProposedActionSchema } from "./action.types.js";
import { actionRegistry } from "./action.registry.js";
import { ActionContext, DryRunResult, ExecutionResult, registerDefaultActionHandlers } from "./handlers/index.js";

/**
 * High-level orchestration engine for Controlled AI Actions.
 *
 * Responsibilities:
 * 1. Validates context and input action payloads.
 * 2. Looks up corresponding handler in ActionRegistry.
 * 3. Coordinates dry-run state diff computation.
 * 4. Coordinates execution delegation to domain services.
 *
 * Boundary Guarantee: Zero dependencies on Express, HTTP, React, or AIService.
 */
export class ActionExecutor {
  constructor() {
    registerDefaultActionHandlers();
  }

  /**
   * Simulates an AI action proposal to compute state diff (Before vs After) and expected version without mutating data.
   */
  async dryRun(context: ActionContext, proposedAction: ProposedAction): Promise<DryRunResult> {
    this.validateContext(context);

    const action = ProposedActionSchema.parse(proposedAction);
    const handler = actionRegistry.get(action.action);

    return handler.dryRun(context, action);
  }

  /**
   * Executes a confirmed AI action proposal by delegating to existing domain services.
   */
  async execute(
    context: ActionContext,
    proposedAction: ProposedAction,
    expectedVersion: number | null = null,
  ): Promise<ExecutionResult> {
    this.validateContext(context);

    const action = ProposedActionSchema.parse(proposedAction);
    const handler = actionRegistry.get(action.action);

    return handler.execute(context, action, expectedVersion);
  }

  private validateContext(context: ActionContext): void {
    if (!context || typeof context !== "object") {
      throw new BadRequestError("Valid ActionContext is required.");
    }
    if (!context.userId || typeof context.userId !== "string") {
      throw new BadRequestError("Valid userId is required in ActionContext.");
    }
    if (!context.projectId || typeof context.projectId !== "string") {
      throw new BadRequestError("Valid projectId is required in ActionContext.");
    }
    if (!context.symbolicMap || typeof context.symbolicMap !== "object") {
      throw new BadRequestError("Valid symbolicMap is required in ActionContext.");
    }
  }
}

/**
 * Singleton instance of ActionExecutor.
 */
export const actionExecutor = new ActionExecutor();
