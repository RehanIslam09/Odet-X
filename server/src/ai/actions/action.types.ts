import { z } from "zod";
import { CreateTaskPayloadSchema, CreateTaskPayload } from "./schemas/create-task.schema.js";
import { UpdateTaskStatusPayloadSchema, UpdateTaskStatusPayload } from "./schemas/update-task-status.schema.js";
import { UpdateTaskPriorityPayloadSchema, UpdateTaskPriorityPayload } from "./schemas/update-task-priority.schema.js";
import { UpdateTaskDueDatePayloadSchema, UpdateTaskDueDatePayload } from "./schemas/update-task-due-date.schema.js";
import { AddTaskLabelPayloadSchema, AddTaskLabelPayload } from "./schemas/add-task-label.schema.js";

/**
 * Zod enum of all allowed controlled AI action types.
 * Strictly non-destructive operations.
 */
export const AllowedActionTypeEnum = z.enum([
  "CREATE_TASK",
  "UPDATE_TASK_STATUS",
  "UPDATE_TASK_PRIORITY",
  "UPDATE_TASK_DUE_DATE",
  "ADD_TASK_LABEL",
]);

export type AllowedActionType = z.infer<typeof AllowedActionTypeEnum>;

/**
 * Discriminated union of all supported AI proposed actions.
 * Discriminant field is `action`.
 */
export const ProposedActionSchema = z.discriminatedUnion("action", [
  CreateTaskPayloadSchema,
  UpdateTaskStatusPayloadSchema,
  UpdateTaskPriorityPayloadSchema,
  UpdateTaskDueDatePayloadSchema,
  AddTaskLabelPayloadSchema,
]);

export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export type {
  CreateTaskPayload,
  UpdateTaskStatusPayload,
  UpdateTaskPriorityPayload,
  UpdateTaskDueDatePayload,
  AddTaskLabelPayload,
};
