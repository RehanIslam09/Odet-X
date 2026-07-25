import { BadRequestError, ConflictError, UnauthorizedError } from "@/utils/app-error.js";
import { buildCopilotContext } from "@/domain/copilot-context-builder.js";
import { actionExecutor } from "@/ai/actions/action.executor.js";
import { ProposedAction, ProposedActionSchema } from "@/ai/actions/action.types.js";
import { ActionContext, DryRunResult, ExecutionResult } from "@/ai/actions/handlers/index.js";
import { getTaskById } from "@/services/task.service.js";
import { generateConfirmationToken, verifyConfirmationToken } from "@/utils/copilot-action-token.js";
import { nonceStore } from "@/utils/nonce-store.js";

export interface PerformDryRunResult {
  dryRun: DryRunResult;
  confirmationToken: string;
  expiresAt: string;
}

/**
 * Orchestrates backend action dry-run simulation and token generation.
 *
 * Operational & Security Guarantees:
 * 1. Authorizes project ownership via `buildCopilotContext`.
 * 2. Computes Before vs After diff without mutating database state.
 * 3. Signs a short-lived (5 min) HMAC confirmation token containing expectedVersion & single-use nonce.
 */
export async function performActionDryRun(
  userId: string,
  projectId: string,
  proposedAction: ProposedAction,
): Promise<PerformDryRunResult> {
  // 1. Authorize Project Ownership & Assemble Symbolic Map Context
  const contextResult = await buildCopilotContext({ projectId, userId });

  const actionContext: ActionContext = {
    userId,
    projectId,
    symbolicMap: contextResult.symbolicMap,
  };

  // 2. Perform Dry-Run State Diff Simulation via ActionExecutor
  const dryRunResult = await actionExecutor.dryRun(actionContext, proposedAction);

  // 3. Generate Signed Confirmation Token (5 min TTL)
  const tokenObj = generateConfirmationToken({
    actionType: proposedAction.action,
    projectId,
    userId,
    targetId: dryRunResult.target.id,
    targetRef: proposedAction.targetRef,
    expectedVersion: dryRunResult.expectedVersion,
    arguments: proposedAction.arguments as Record<string, unknown>,
    explanation: proposedAction.explanation,
  });

  return {
    dryRun: dryRunResult,
    confirmationToken: tokenObj.token,
    expiresAt: tokenObj.expiresAt,
  };
}

/**
 * Executes a confirmed AI action after verifying token signature, expiration, nonce replay, and OCC version.
 */
export async function confirmAction(
  userId: string,
  confirmationToken: string,
): Promise<ExecutionResult> {
  // 1. Verify HMAC Signature & Token Expiration
  const payload = verifyConfirmationToken(confirmationToken);

  // 2. User Identity Match Verification
  if (payload.userId !== userId) {
    throw new UnauthorizedError("Action confirmation token does not belong to the current authenticated user.");
  }

  // 3. Replay Attack Protection (Single-Use Nonce Consumption)
  if (!nonceStore.consume(payload.nonce)) {
    throw new ConflictError("Action confirmation token has already been executed.");
  }

  // 4. Authorize Project Access & Re-assemble Symbolic Context
  const contextResult = await buildCopilotContext({
    projectId: payload.projectId,
    userId,
  });

  const actionContext: ActionContext = {
    userId,
    projectId: payload.projectId,
    symbolicMap: contextResult.symbolicMap,
  };

  // 5. Optimistic Concurrency Control (OCC) Verification for Task Mutations
  if (payload.targetRef !== "project") {
    const mapEntry = contextResult.symbolicMap[payload.targetRef];
    if (!mapEntry || mapEntry.type !== "task") {
      throw new BadRequestError(`Invalid or unmapped target reference in confirmation token: '${payload.targetRef}'.`);
    }

    const currentTask = await getTaskById(mapEntry.id, userId);
    const taskObj = currentTask as unknown as { __v?: number; version?: number };
    const currentVersion = taskObj.__v !== undefined ? taskObj.__v : taskObj.version ?? 0;

    if (payload.expectedVersion !== null && payload.expectedVersion !== currentVersion) {
      throw new ConflictError(
        "Task was modified by another user or request. Please review updated task changes before applying.",
      );
    }
  }

  // 6. Reconstruct ProposedAction Payload & Execute Domain Mutation
  const rawAction = {
    action: payload.actionType,
    targetRef: payload.targetRef,
    arguments: payload.arguments,
    explanation: payload.explanation,
  };

  const proposedAction = ProposedActionSchema.parse(rawAction);

  return actionExecutor.execute(actionContext, proposedAction, payload.expectedVersion);
}
