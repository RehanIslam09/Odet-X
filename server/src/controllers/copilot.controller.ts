import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { BadRequestError } from "@/utils/app-error.js";
import { buildCopilotContext } from "@/domain/copilot-context-builder.js";
import { queryProjectCopilot } from "@/services/project-copilot-ai.service.js";
import type { CopilotQueryDto } from "@/validators/copilot.validator.js";
import Project from "@/models/project.model.js";

async function getValidatedProjectId(req: Request): Promise<string> {
  const rawParam = req.params.projectId || req.params.id;
  const projectId = typeof rawParam === "string" ? rawParam : undefined;

  if (!projectId) {
    throw new BadRequestError("Invalid project id.");
  }

  if (projectId === "global") {
    const userId = req.user!._id;
    const workspaceId = req.workspace?._id;

    const filter: Record<string, any> = { owner: userId, isDeleted: false };
    if (workspaceId) {
      filter.workspaceId = workspaceId;
    }

    const latestProject = await Project.findOne(filter).sort({ updatedAt: -1 }).exec();
    if (!latestProject) {
      throw new BadRequestError("No active project found in this workspace to query Copilot.");
    }
    return latestProject._id.toString();
  }

  if (!Types.ObjectId.isValid(projectId)) {
    throw new BadRequestError("Invalid project id.");
  }

  return projectId;
}

/**
 * POST /api/v1/projects/:projectId/copilot
 *
 * Exposes read-only AI Project Copilot query endpoint.
 *
 * Operational & Security Guarantees:
 * 1. Requires authenticated user identity (`req.user`).
 * 2. Pre-checks project ownership (`{ _id: projectId, owner: userId, isDeleted: false }`).
 *    Unowned, soft-deleted, or nonexistent projects throw 404 `NotFoundError` BEFORE context assembly or AI execution.
 * 3. Builds bounded, deterministic project context (WP-01/WP-02).
 * 4. Executes read-only AI reasoning pipeline via `queryProjectCopilot` (WP-03).
 * 5. Resolves raw AI symbolic references against trusted server `symbolicMap`.
 * 6. Performs ZERO database mutations across Project, Task, Milestone, PlanDraft, or Activity collections.
 */
export const queryCopilot = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const projectId = await getValidatedProjectId(req);
  const { question, history } = req.body as CopilotQueryDto;

  // 1. Authorize Project Ownership & Build Context
  // (Throws 404 NotFoundError if project does not exist, is soft-deleted, or belongs to another user)
  const contextResult = await buildCopilotContext({
    projectId,
    userId,
  });

  // 2. Query Read-Only Copilot AI Service
  const copilotResult = await queryProjectCopilot({
    contextResult,
    question,
    history,
  });

  // 3. Send Success Response Envelope
  sendSuccessResponse(res, {
    message: "Copilot response generated successfully.",
    data: copilotResult,
  });
});
