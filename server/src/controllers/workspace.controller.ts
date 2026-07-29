import { Request, Response } from "express";

import {
  createCustomWorkspace,
  deleteCustomWorkspace,
  getWorkspaceDetails,
  listWorkspaceMembers,
  listWorkspacesForUser,
  removeWorkspaceMember,
  updateCustomWorkspace,
} from "@/services/workspace.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { BadRequestError } from "@/utils/app-error.js";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "@/validators/workspace.validator.js";

/**
 * GET /api/v1/workspaces
 * Lists all workspaces the authenticated user belongs to.
 */
export const listWorkspaces = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const workspaces = await listWorkspacesForUser(userId);

    sendSuccessResponse(res, {
      statusCode: 200,
      data: workspaces,
      message: "Workspaces retrieved successfully.",
    });
  },
);

/**
 * POST /api/v1/workspaces
 * Creates a new custom non-personal workspace.
 */
export const createWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const body = req.body as CreateWorkspaceDto;

    const workspace = await createCustomWorkspace(userId, body);

    sendSuccessResponse(res, {
      statusCode: 201,
      data: workspace,
      message: "Workspace created successfully.",
    });
  },
);

/**
 * GET /api/v1/workspaces/:workspaceId
 * Gets details and member list for a workspace.
 */
export const getWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const targetWorkspaceId = req.workspace!._id.toString();

    const details = await getWorkspaceDetails(targetWorkspaceId, userId);

    sendSuccessResponse(res, {
      statusCode: 200,
      data: details,
      message: "Workspace retrieved successfully.",
    });
  },
);

/**
 * PATCH /api/v1/workspaces/:workspaceId
 * Updates name or slug of a workspace (OWNER permission required).
 */
export const updateWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const targetWorkspaceId = req.workspace!._id.toString();
    const body = req.body as UpdateWorkspaceDto;

    const updated = await updateCustomWorkspace(targetWorkspaceId, userId, body);

    sendSuccessResponse(res, {
      statusCode: 200,
      data: updated,
      message: "Workspace updated successfully.",
    });
  },
);

/**
 * DELETE /api/v1/workspaces/:workspaceId
 * Deletes a custom workspace (OWNER permission required, must have 0 active projects).
 */
export const deleteWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const targetWorkspaceId = req.workspace!._id.toString();

    await deleteCustomWorkspace(targetWorkspaceId, userId);

    sendSuccessResponse(res, {
      statusCode: 200,
      data: null,
      message: "Workspace deleted successfully.",
    });
  },
);

/**
 * GET /api/v1/workspaces/:workspaceId/members
 * Lists all members in a workspace.
 */
export const listMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const targetWorkspaceId = req.workspace!._id.toString();

    const members = await listWorkspaceMembers(targetWorkspaceId, userId);

    sendSuccessResponse(res, {
      statusCode: 200,
      data: members,
      message: "Workspace members retrieved successfully.",
    });
  },
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/members/:userId
 * Removes a member or self-leaves from a workspace.
 */
export const removeMember = asyncHandler(
  async (req: Request, res: Response) => {
    const requestingUserId = req.user!._id.toString();
    const targetWorkspaceId = req.workspace!._id.toString();
    const targetUserIdParam = req.params.userId;
    const targetUserId = Array.isArray(targetUserIdParam) ? targetUserIdParam[0] : targetUserIdParam;

    if (!targetUserId) {
      throw new BadRequestError("Target user id is required.");
    }

    await removeWorkspaceMember(targetWorkspaceId, targetUserId, requestingUserId);

    sendSuccessResponse(res, {
      statusCode: 200,
      data: null,
      message: "Workspace member removed successfully.",
    });
  },
);
