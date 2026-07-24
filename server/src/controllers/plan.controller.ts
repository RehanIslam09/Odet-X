import { Request, Response } from "express";
import { Types } from "mongoose";
import { generateProjectPlan } from "@/services/project-planning-ai.service.js";
import {
  getActiveProjectPlanDraft,
  getProjectPlanDraft,
  updateProjectPlanDraft,
  discardProjectPlanDraft,
} from "@/services/plan-draft.service.js";
import { commitPlan } from "@/services/plan-commit.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { BadRequestError } from "@/utils/app-error.js";

/**
 * Validates and extracts route parameters for project planning endpoints.
 */
function getValidatedParams(req: Request): { projectId: string; draftId: string } {
  const projectId = req.params.projectId;
  if (!projectId || typeof projectId !== "string" || !Types.ObjectId.isValid(projectId)) {
    throw new BadRequestError("Invalid project id.");
  }

  const draftId = req.params.draftId;
  if (!draftId || typeof draftId !== "string" || !Types.ObjectId.isValid(draftId)) {
    throw new BadRequestError("Invalid draft id.");
  }

  return { projectId, draftId };
}

function getValidatedProjectId(req: Request): string {
  const projectId = req.params.projectId;
  if (!projectId || typeof projectId !== "string" || !Types.ObjectId.isValid(projectId)) {
    throw new BadRequestError("Invalid project id.");
  }

  return projectId;
}

/**
 * GET /api/v1/projects/:projectId/plans/active
 * Retrieves the currently active uncommitted draft for a project, or null if none exists.
 */
export const getActiveDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getValidatedProjectId(req);

  const draft = await getActiveProjectPlanDraft(userId, projectId);

  sendSuccessResponse(res, {
    message: "Active project plan draft retrieved successfully.",
    data: draft ? draft.toJSON() : null,
  });
});

/**
 * POST /api/v1/projects/:projectId/plans
 * Generates an AI-assisted project plan draft.
 */
export const generatePlan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getValidatedProjectId(req);
  const { description } = req.body;

  const draft = await generateProjectPlan(projectId, userId, description);

  sendSuccessResponse(res, {
    statusCode: 201,
    message: "Project plan generated successfully.",
    data: draft.toJSON(),
  });
});

/**
 * GET /api/v1/projects/:projectId/plans/:draftId
 * Retrieves a persisted plan draft.
 */
export const getDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { projectId, draftId } = getValidatedParams(req);

  const draft = await getProjectPlanDraft(userId, projectId, draftId);

  sendSuccessResponse(res, {
    message: "Project plan draft retrieved successfully.",
    data: draft.toJSON(),
  });
});

/**
 * PATCH /api/v1/projects/:projectId/plans/:draftId
 * Updates / edits an uncommitted plan draft.
 */
export const updateDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { projectId, draftId } = getValidatedParams(req);

  const draft = await updateProjectPlanDraft(userId, projectId, draftId, req.body);

  sendSuccessResponse(res, {
    message: "Project plan draft updated successfully.",
    data: draft.toJSON(),
  });
});

/**
 * DELETE /api/v1/projects/:projectId/plans/:draftId
 * Discards an uncommitted plan draft.
 */
export const discardDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { projectId, draftId } = getValidatedParams(req);

  const draft = await discardProjectPlanDraft(userId, projectId, draftId);

  sendSuccessResponse(res, {
    message: "Project plan draft discarded successfully.",
    data: draft.toJSON(),
  });
});

/**
 * POST /api/v1/projects/:projectId/plans/:draftId/commit
 * Commits a validated plan draft into permanent Tasks and Milestones.
 */
export const commitDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { projectId, draftId } = getValidatedParams(req);

  const result = await commitPlan(userId, projectId, draftId);

  sendSuccessResponse(res, {
    message: "Project plan committed successfully.",
    data: result,
  });
});
