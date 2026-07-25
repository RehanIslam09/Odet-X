import { BadRequestError } from "@/utils/app-error.js";
import { getProjectById } from "@/services/project.service.js";
import { createTask } from "@/services/task.service.js";
import { CreateTaskPayload } from "../schemas/create-task.schema.js";
import { ActionContext, ActionHandler, DryRunResult, ExecutionResult } from "./index.js";

/**
 * Handler for CREATE_TASK AI action.
 * Creates a single task in the active project.
 */
export class CreateTaskHandler implements ActionHandler<CreateTaskPayload> {
  readonly actionType = "CREATE_TASK" as const;

  async dryRun(context: ActionContext, action: CreateTaskPayload): Promise<DryRunResult> {
    if (action.targetRef !== "project") {
      throw new BadRequestError("CREATE_TASK target reference must be 'project'.");
    }

    const project = await getProjectById(context.projectId, context.userId);

    const parsedDueDate = action.arguments.dueDate ? new Date(action.arguments.dueDate).toISOString() : null;

    return {
      actionType: this.actionType,
      target: {
        id: project._id.toString(),
        label: project.name,
        type: "project",
      },
      diff: {
        before: {},
        after: {
          title: action.arguments.title,
          description: action.arguments.description || "",
          status: action.arguments.status || "todo",
          priority: action.arguments.priority || "medium",
          dueDate: parsedDueDate,
          labels: action.arguments.labels || [],
        },
      },
      explanation: action.explanation,
      expectedVersion: null,
    };
  }

  async execute(context: ActionContext, action: CreateTaskPayload, _expectedVersion: number | null): Promise<ExecutionResult> {
    if (action.targetRef !== "project") {
      throw new BadRequestError("CREATE_TASK target reference must be 'project'.");
    }

    const parsedDueDate = action.arguments.dueDate ? new Date(action.arguments.dueDate) : null;

    const task = await createTask(context.userId, {
      projectId: context.projectId,
      title: action.arguments.title,
      description: action.arguments.description,
      status: action.arguments.status,
      priority: action.arguments.priority,
      dueDate: parsedDueDate,
      labels: action.arguments.labels,
    });

    return {
      actionType: this.actionType,
      targetId: task._id.toString(),
      executedAt: new Date().toISOString(),
      updatedEntity: task.toJSON ? task.toJSON() : (task as unknown as Record<string, unknown>),
    };
  }
}
