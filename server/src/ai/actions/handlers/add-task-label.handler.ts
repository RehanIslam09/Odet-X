import { BadRequestError } from "@/utils/app-error.js";
import { getTaskById, updateTask } from "@/services/task.service.js";
import { SymbolicEntityMapItem } from "@/domain/copilot-context-builder.js";
import { AddTaskLabelPayload } from "../schemas/add-task-label.schema.js";
import { ActionContext, ActionHandler, DryRunResult, ExecutionResult } from "./index.js";

function resolveTaskRef(targetRef: string, symbolicMap: Record<string, SymbolicEntityMapItem>): string {
  const mapEntry = symbolicMap[targetRef];
  if (!mapEntry || mapEntry.type !== "task") {
    throw new BadRequestError(`Invalid or unmapped target task reference: '${targetRef}'.`);
  }
  return mapEntry.id;
}

/**
 * Handler for ADD_TASK_LABEL AI action.
 * Appends a label to a task if not already present.
 */
export class AddTaskLabelHandler implements ActionHandler<AddTaskLabelPayload> {
  readonly actionType = "ADD_TASK_LABEL" as const;

  async dryRun(context: ActionContext, action: AddTaskLabelPayload): Promise<DryRunResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const task = await getTaskById(realTaskId, context.userId);

    const taskObj = task as unknown as { __v?: number; version?: number };
    const currentVersion = taskObj.__v !== undefined ? taskObj.__v : taskObj.version ?? 0;
    const trimmedLabel = action.arguments.label.trim();
    const beforeLabels = [...(task.labels || [])];
    const afterLabels = beforeLabels.includes(trimmedLabel)
      ? beforeLabels
      : [...beforeLabels, trimmedLabel];

    return {
      actionType: this.actionType,
      target: {
        id: task._id.toString(),
        label: task.title,
        type: "task",
      },
      diff: {
        before: { labels: beforeLabels },
        after: { labels: afterLabels },
      },
      explanation: action.explanation,
      expectedVersion: currentVersion,
    };
  }

  async execute(context: ActionContext, action: AddTaskLabelPayload, _expectedVersion: number | null): Promise<ExecutionResult> {
    const realTaskId = resolveTaskRef(action.targetRef, context.symbolicMap);
    const task = await getTaskById(realTaskId, context.userId);

    const trimmedLabel = action.arguments.label.trim();
    const existingLabels = [...(task.labels || [])];
    const updatedLabels = existingLabels.includes(trimmedLabel)
      ? existingLabels
      : [...existingLabels, trimmedLabel];

    const updatedTask = await updateTask(realTaskId, context.userId, {
      labels: updatedLabels,
    });

    return {
      actionType: this.actionType,
      targetId: updatedTask._id.toString(),
      executedAt: new Date().toISOString(),
      updatedEntity: updatedTask.toJSON ? updatedTask.toJSON() : (updatedTask as unknown as Record<string, unknown>),
    };
  }
}
