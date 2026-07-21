import { Request, Response } from "express";
import { Types } from "mongoose";

import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  toggleTaskArchive,
  updateTask,
  updateTaskNotes,
} from "@/services/task.service.js";

import { generateLabelsForTask } from "@/services/task-ai.service.js";

import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { BadRequestError } from "@/utils/app-error.js";
import type { TaskQueryDto } from "@/validators/task.validator.js";

function getRequiredTaskId(req: Request): string {
  const id = req.params.id;

  if (typeof id !== "string" || id.length === 0) {
    throw new BadRequestError("Task ID is required.");
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError("Invalid Task ID format.");
  }

  return id;
}

function getValidatedTaskQuery(req: Request): TaskQueryDto {
  return req.validatedQuery as TaskQueryDto;
}

// ---------------------------------------------------------------------------
// GET /tasks
// ---------------------------------------------------------------------------
export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const query = getValidatedTaskQuery(req);

  const result = await listTasks(userId, query);

  sendSuccessResponse(res, {
    message: "Tasks retrieved successfully.",
    data: {
      items: result.items.map((task) => task.toJSON()),
      pagination: result.pagination,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /tasks/:id
// ---------------------------------------------------------------------------
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredTaskId(req);

  const task = await getTaskById(id, userId);

  sendSuccessResponse(res, {
    message: "Task retrieved successfully.",
    data: {
      task: task.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// POST /tasks
// ---------------------------------------------------------------------------
export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();

  const task = await createTask(userId, req.body);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Task created successfully.",
    data: {
      task: task.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id
// ---------------------------------------------------------------------------
export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredTaskId(req);

  const task = await updateTask(id, userId, req.body);

  sendSuccessResponse(res, {
    message: "Task updated successfully.",
    data: {
      task: task.toJSON(),
    },
  });
});
// ---------------------------------------------------------------------------
// PATCH /tasks/:id/notes
// ---------------------------------------------------------------------------
export const updateNotes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredTaskId(req);

  const task = await updateTaskNotes(id, userId, req.body);

  sendSuccessResponse(res, {
    message: "Task notes updated successfully.",
    data: {
      task: task.toJSON(),
    },
  });
});
// ---------------------------------------------------------------------------
// POST /tasks/:id/archive
// ---------------------------------------------------------------------------
export const archive = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredTaskId(req);

  const task = await toggleTaskArchive(id, userId);

  sendSuccessResponse(res, {
    message: `Task ${task.archived ? "archived" : "unarchived"} successfully.`,
    data: {
      task: task.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// DELETE /tasks/:id
// ---------------------------------------------------------------------------
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredTaskId(req);

  await deleteTask(id, userId);

  sendSuccessResponse(res, {
    message: "Task deleted successfully.",
  });
});

// ---------------------------------------------------------------------------
// POST /tasks/:id/generate-labels (AI)
// ---------------------------------------------------------------------------
export const generateLabels = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredTaskId(req);

  const task = await generateLabelsForTask(id, userId);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Labels generated and applied successfully.",
    data: {
      task: task.toJSON(),
    },
  });
});
