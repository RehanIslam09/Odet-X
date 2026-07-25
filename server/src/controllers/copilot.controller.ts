import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { BadRequestError } from "@/utils/app-error.js";
import { buildCopilotContext } from "@/domain/copilot-context-builder.js";
import { queryProjectCopilot } from "@/services/project-copilot-ai.service.js";
import type { CopilotQueryDto } from "@/validators/copilot.validator.js";

function getValidatedProjectId(req: Request): string {
  const projectId = req.params.projectId || req.params.id;

  if (!projectId || typeof projectId !== "string" || !Types.ObjectId.isValid(projectId)) {
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
  const projectId = getValidatedProjectId(req);
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
