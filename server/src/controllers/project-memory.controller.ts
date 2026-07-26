import { Request, Response } from "express";
import { Types } from "mongoose";

import {
  createProjectMemory,
  deleteProjectMemory,
  listProjectMemories,
  updateProjectMemory,
} from "@/services/project-memory.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { BadRequestError } from "@/utils/app-error.js";
import type { ProjectMemoryQueryDto } from "@/validators/project-memory.validator.js";

// ---------------------------------------------------------------------------
// Route Parameter Helpers
// ---------------------------------------------------------------------------

function getRequiredProjectId(req: Request): string {
  const projectId = req.params.projectId;

  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new BadRequestError("Project ID is required.");
  }

  if (!Types.ObjectId.isValid(projectId)) {
    throw new BadRequestError("Invalid project ID format.");
  }

  return projectId;
}

function getRequiredMemoryId(req: Request): string {
  const memoryId = req.params.memoryId;

  if (typeof memoryId !== "string" || memoryId.length === 0) {
    throw new BadRequestError("Memory ID is required.");
  }

  if (!Types.ObjectId.isValid(memoryId)) {
    throw new BadRequestError("Invalid memory ID format.");
  }

  return memoryId;
}

function getValidatedMemoryQuery(req: Request): ProjectMemoryQueryDto {
  return req.validatedQuery as ProjectMemoryQueryDto;
}

// ---------------------------------------------------------------------------
// Controller Endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/projects/:projectId/memories
 * Creates a new explicit project memory.
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getRequiredProjectId(req);

  const memory = await createProjectMemory(userId, projectId, req.body);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Project memory created successfully.",
    data: {
      memory,
    },
  });
});

/**
 * GET /api/v1/projects/:projectId/memories
 * Lists paginated project memories for an owned project.
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getRequiredProjectId(req);
  const query = getValidatedMemoryQuery(req);

  const result = await listProjectMemories(userId, projectId, query);

  sendSuccessResponse(res, {
    message: "Project memories retrieved successfully.",
    data: {
      items: result.items,
      pagination: result.pagination,
    },
  });
});

/**
 * PATCH /api/v1/projects/:projectId/memories/:memoryId
 * Applies content update with Optimistic Concurrency Control (expectedVersion).
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getRequiredProjectId(req);
  const memoryId = getRequiredMemoryId(req);

  const memory = await updateProjectMemory(userId, projectId, memoryId, req.body);

  sendSuccessResponse(res, {
    message: "Project memory updated successfully.",
    data: {
      memory,
    },
  });
});

/**
 * DELETE /api/v1/projects/:projectId/memories/:memoryId
 * Hard-deletes a project memory permanently.
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getRequiredProjectId(req);
  const memoryId = getRequiredMemoryId(req);

  await deleteProjectMemory(userId, projectId, memoryId);

  sendSuccessResponse(res, {
    message: "Project memory deleted successfully.",
  });
});
