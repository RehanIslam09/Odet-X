import { Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { DryRunActionDto, ConfirmActionDto } from "@/validators/copilot-action.validator.js";
import { performActionDryRun, confirmAction as executeConfirmAction } from "@/services/copilot-action.service.js";

/**
 * POST /api/v1/copilot/actions/dry-run
 * (or POST /api/v1/projects/:projectId/copilot/actions/dry-run)
 *
 * Computes state diff (Before vs After) and returns cryptographically signed confirmation token.
 */
export const dryRunAction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { projectId, proposedAction } = req.body as DryRunActionDto;

  const result = await performActionDryRun(userId, projectId, proposedAction);

  sendSuccessResponse(res, {
    message: "Action dry-run completed successfully.",
    data: result,
  });
});

/**
 * POST /api/v1/copilot/actions/confirm
 *
 * Verifies signed confirmation token, checks single-use nonce & OCC, and executes domain mutation.
 */
export const confirmAction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { confirmationToken } = req.body as ConfirmActionDto;

  const result = await executeConfirmAction(userId, confirmationToken);

  sendSuccessResponse(res, {
    message: "Action executed successfully.",
    data: result,
  });
});
