import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  dismissRecommendationApi,
  getRecommendationById,
  listProjectRecommendations,
  listWorkspaceRecommendations,
} from "@/services/project-recommendation-query.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { BadRequestError } from "@/utils/app-error.js";
import type { RecommendationQueryDto } from "@/validators/project-recommendation-api.validator.js";

// ---------------------------------------------------------------------------
// Route Parameter Helpers
// ---------------------------------------------------------------------------

function getOptionalProjectId(req: Request): string | undefined {
  const projectId = req.params.projectId;

  if (typeof projectId !== "string" || projectId.length === 0) {
    return undefined;
  }

  if (!Types.ObjectId.isValid(projectId)) {
    throw new BadRequestError("Invalid project ID format.");
  }

  return projectId;
}

function getRequiredRecommendationId(req: Request): string {
  const id = req.params.id || req.params.recommendationId;

  if (typeof id !== "string" || id.length === 0) {
    throw new BadRequestError("Recommendation ID is required.");
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError("Invalid recommendation ID format.");
  }

  return id;
}

function getValidatedRecommendationQuery(req: Request): RecommendationQueryDto {
  return (req.validatedQuery as RecommendationQueryDto) || { page: 1, limit: 20, status: "ACTIVE" };
}

// ---------------------------------------------------------------------------
// Controller Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/recommendations
 * Lists workspace-wide recommendations for authenticated user.
 */
export const listWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const workspaceId = req.workspace?._id?.toString();
  const query = getValidatedRecommendationQuery(req);

  const result = await listWorkspaceRecommendations(userId, query, workspaceId);

  sendSuccessResponse(res, {
    message: "Workspace recommendations retrieved successfully.",
    data: {
      recommendations: result.items,
      pagination: result.pagination,
    },
  });
});

/**
 * GET /api/v1/projects/:projectId/recommendations
 * Lists project-scoped recommendations for authenticated user.
 */
export const listProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getOptionalProjectId(req)!;
  const workspaceId = req.workspace?._id?.toString();
  const query = getValidatedRecommendationQuery(req);

  const result = await listProjectRecommendations(userId, projectId, query, workspaceId);

  sendSuccessResponse(res, {
    message: "Project recommendations retrieved successfully.",
    data: {
      recommendations: result.items,
      pagination: result.pagination,
    },
  });
});

/**
 * GET /api/v1/projects/:projectId/recommendations/:id OR GET /api/v1/recommendations/:id
 * Gets a single recommendation by ID.
 */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getOptionalProjectId(req);
  const recommendationId = getRequiredRecommendationId(req);
  const workspaceId = req.workspace?._id?.toString();

  const recommendation = await getRecommendationById(userId, recommendationId, projectId, workspaceId);

  sendSuccessResponse(res, {
    message: "Recommendation retrieved successfully.",
    data: {
      recommendation,
    },
  });
});

/**
 * PATCH /api/v1/projects/:projectId/recommendations/:id/dismiss OR PATCH /api/v1/recommendations/:id/dismiss
 * Dismisses an ACTIVE recommendation owned by user.
 */
export const dismiss = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = getOptionalProjectId(req);
  const recommendationId = getRequiredRecommendationId(req);
  const workspaceId = req.workspace?._id?.toString();

  const recommendation = await dismissRecommendationApi(userId, recommendationId, projectId, workspaceId);

  sendSuccessResponse(res, {
    message: "Recommendation dismissed successfully.",
    data: {
      recommendation,
    },
  });
});
