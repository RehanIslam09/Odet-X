import { BadRequestError } from "@/utils/app-error.js";
import { getTaskById, updateTask } from "@/services/task.service.js";
import { SymbolicEntityMapItem } from "@/domain/copilot-context-builder.js";
import { UpdateTaskStatusPayload } from "../schemas/update-task-status.schema.js";
import { ActionContext, ActionHandler, DryRunResult, ExecutionResult } from "./index.js";

function resolveTaskRef(targetRef: string, symbolicMap: Record<string, SymbolicEntityMapItem>): string {
  const mapEntry = symbolicMap[targetRef];
  if (!mapEntry || mapEntry.type !== "task") {
    throw new BadRequestError(`Invalid or unmapped target task reference: '${targetRef}'.`);
  }
  return mapEntry.id;
}

/**
 * Handler for UPDATE_TASK_STATUS AI action.
 * Moves a task to a new status stage.
 */
export class UpdateTaskStatusHandler implements ActionHandler<UpdateTaskStatusPayload> {
  readonly actionType = "UPDATE_TASK_STATUS" as const;

  async dryRun(context: ActionContext, action: UpdateTaskStatusPayload): Promise<DryRunResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const task = await getTaskById(realTaskId, context.userId);

    const taskObj = task as unknown as { __v?: number; version?: number };
    const currentVersion = taskObj.__v !== undefined ? taskObj.__v : taskObj.version ?? 0;

    return {
      actionType: this.actionType,
      target: {
        id: task._id.toString(),
        label: task.title,
        type: "task",
      },
      diff: {
        before: { status: task.status },
        after: { status: action.arguments.status },
      },
      explanation: action.explanation,
      expectedVersion: currentVersion,
    };
  }

  async execute(context: ActionContext, action: UpdateTaskStatusPayload, _expectedVersion: number | null): Promise<ExecutionResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const updatedTask = await updateTask(realTaskId, context.userId, {
      status: action.arguments.status,
    });

    return {
      actionType: this.actionType,
      targetId: updatedTask._id.toString(),
      executedAt: new Date().toISOString(),
      updatedEntity: updatedTask.toJSON ? updatedTask.toJSON() : (updatedTask as unknown as Record<string, unknown>),
    };
  }
}
