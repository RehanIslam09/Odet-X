import { Request, Response } from "express";
import { Types } from "mongoose";

import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectOptions,
  getProjectSummary,
  listProjects,
  toggleProjectArchive,
  updateProject,
} from "@/services/project.service.js";

import { generateTasksForProject } from "@/services/project-ai.service.js";
import { generateSummaryForProject } from "@/services/project-summary-ai.service.js";

import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { BadRequestError } from "@/utils/app-error.js";

import type { ProjectQueryDto } from "@/validators/project.validator.js";

function getRequiredProjectId(req: Request): string {
  const id = req.params.id;

  if (typeof id !== "string" || id.length === 0) {
    throw new BadRequestError("Project id is required.");
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError("Invalid project id.");
  }

  return id;
}

function getValidatedProjectQuery(req: Request): ProjectQueryDto {
  return req.validatedQuery as ProjectQueryDto;
}

// ---------------------------------------------------------------------------
// GET /projects
// ---------------------------------------------------------------------------

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const query = getValidatedProjectQuery(req);
  const workspaceId = req.workspace?._id?.toString();

  const result = await listProjects(userId, query, workspaceId);

  sendSuccessResponse(res, {
    message: "Projects retrieved successfully.",
    data: {
      items: result.items.map((project) => project.toJSON()),
      pagination: result.pagination,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();

  const project = await getProjectById(id, userId, workspaceId);

  sendSuccessResponse(res, {
    message: "Project retrieved successfully.",
    data: {
      project: project.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /projects/:id/summary
// ---------------------------------------------------------------------------

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();

  const summary = await getProjectSummary(id, userId, workspaceId);

  sendSuccessResponse(res, {
    message: "Project summary retrieved successfully.",
    data: {
      summary,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /projects/options
// ---------------------------------------------------------------------------

export const getOptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const workspaceId = req.workspace?._id?.toString();

  const options = await getProjectOptions(userId, workspaceId);

  sendSuccessResponse(res, {
    message: "Project options retrieved successfully.",
    data: {
      items: options,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /projects
// ---------------------------------------------------------------------------

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const workspaceId = req.workspace?._id?.toString();

  const project = await createProject(userId, req.body, workspaceId);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Project created successfully.",
    data: {
      project: project.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /projects/:id
// ---------------------------------------------------------------------------

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();

  const project = await updateProject(id, userId, req.body, workspaceId);

  sendSuccessResponse(res, {
    message: "Project updated successfully.",
    data: {
      project: project.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// POST /projects/:id/archive
// ---------------------------------------------------------------------------

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();

  const project = await toggleProjectArchive(id, userId, workspaceId);

  sendSuccessResponse(res, {
    message: `Project ${project.archived ? "archived" : "unarchived"} successfully.`,
    data: {
      project: project.toJSON(),
    },
  });
});

// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();

  await deleteProject(id, userId, workspaceId);

  sendSuccessResponse(res, {
    message: "Project deleted successfully.",
  });
});

// ---------------------------------------------------------------------------
// POST /projects/:id/generate-tasks (AI)
// ---------------------------------------------------------------------------

export const generateTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();
  const { description } = req.body;

  const tasks = await generateTasksForProject(id, userId, description, workspaceId);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Tasks generated successfully.",
    data: {
      items: tasks.map(t => t.toJSON()),
    },
  });
});

// ---------------------------------------------------------------------------
// POST /projects/:id/generate-summary (AI)
// ---------------------------------------------------------------------------

export const generateSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const id = getRequiredProjectId(req);
  const workspaceId = req.workspace?._id?.toString();

  const project = await generateSummaryForProject(id, userId, workspaceId);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Project summary generated successfully.",
    data: {
      project: project.toJSON(),
    },
  });
});
