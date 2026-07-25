import { BadRequestError } from "@/utils/app-error.js";
import { getTaskById, updateTask } from "@/services/task.service.js";
import { SymbolicEntityMapItem } from "@/domain/copilot-context-builder.js";
import { UpdateTaskPriorityPayload } from "../schemas/update-task-priority.schema.js";
import { ActionContext, ActionHandler, DryRunResult, ExecutionResult } from "./index.js";

function resolveTaskRef(targetRef: string, symbolicMap: Record<string, SymbolicEntityMapItem>): string {
  const mapEntry = symbolicMap[targetRef];
  if (!mapEntry || mapEntry.type !== "task") {
    throw new BadRequestError(`Invalid or unmapped target task reference: '${targetRef}'.`);
  }
  return mapEntry.id;
}

/**
 * Handler for UPDATE_TASK_PRIORITY AI action.
 * Changes the priority level of a task.
 */
export class UpdateTaskPriorityHandler implements ActionHandler<UpdateTaskPriorityPayload> {
  readonly actionType = "UPDATE_TASK_PRIORITY" as const;

  async dryRun(context: ActionContext, action: UpdateTaskPriorityPayload): Promise<DryRunResult> {
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
        before: { priority: task.priority },
        after: { priority: action.arguments.priority },
      },
      explanation: action.explanation,
      expectedVersion: currentVersion,
    };
  }

  async execute(context: ActionContext, action: UpdateTaskPriorityPayload, _expectedVersion: number | null): Promise<ExecutionResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const updatedTask = await updateTask(realTaskId, context.userId, {
      priority: action.arguments.priority,
    });

    return {
      actionType: this.actionType,
      targetId: updatedTask._id.toString(),
      executedAt: new Date().toISOString(),
      updatedEntity: updatedTask.toJSON ? updatedTask.toJSON() : (updatedTask as unknown as Record<string, unknown>),
    };
  }
}
