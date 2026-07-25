import { BadRequestError } from "@/utils/app-error.js";
import { getTaskById, updateTask } from "@/services/task.service.js";
import { SymbolicEntityMapItem } from "@/domain/copilot-context-builder.js";
import { UpdateTaskDueDatePayload } from "../schemas/update-task-due-date.schema.js";
import { ActionContext, ActionHandler, DryRunResult, ExecutionResult } from "./index.js";

function resolveTaskRef(targetRef: string, symbolicMap: Record<string, SymbolicEntityMapItem>): string {
  const mapEntry = symbolicMap[targetRef];
  if (!mapEntry || mapEntry.type !== "task") {
    throw new BadRequestError(`Invalid or unmapped target task reference: '${targetRef}'.`);
  }
  return mapEntry.id;
}

/**
 * Handler for UPDATE_TASK_DUE_DATE AI action.
 * Updates or clears target completion date of a task.
 */
export class UpdateTaskDueDateHandler implements ActionHandler<UpdateTaskDueDatePayload> {
  readonly actionType = "UPDATE_TASK_DUE_DATE" as const;

  async dryRun(context: ActionContext, action: UpdateTaskDueDatePayload): Promise<DryRunResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const task = await getTaskById(realTaskId, context.userId);

    const taskObj = task as unknown as { __v?: number; version?: number };
    const currentVersion = taskObj.__v !== undefined ? taskObj.__v : taskObj.version ?? 0;
    const beforeDate = task.dueDate ? new Date(task.dueDate).toISOString() : null;
    const afterDate = action.arguments.dueDate ? new Date(action.arguments.dueDate).toISOString() : null;

    return {
      actionType: this.actionType,
      target: {
        id: task._id.toString(),
        label: task.title,
        type: "task",
      },
      diff: {
        before: { dueDate: beforeDate },
        after: { dueDate: afterDate },
      },
      explanation: action.explanation,
      expectedVersion: currentVersion,
    };
  }

  async execute(context: ActionContext, action: UpdateTaskDueDatePayload, _expectedVersion: number | null): Promise<ExecutionResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const parsedDueDate = action.arguments.dueDate ? new Date(action.arguments.dueDate) : null;

    const updatedTask = await updateTask(realTaskId, context.userId, {
      dueDate: parsedDueDate,
    });

    return {
      actionType: this.actionType,
      targetId: updatedTask._id.toString(),
      executedAt: new Date().toISOString(),
      updatedEntity: updatedTask.toJSON ? updatedTask.toJSON() : (updatedTask as unknown as Record<string, unknown>),
    };
  }
}
