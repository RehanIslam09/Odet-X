import { Request, Response } from "express";
import { listActivities } from "@/services/activity.service.js";
import { activityQuerySchema } from "@/validators/activity.validator.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";

/**
 * GET /api/v1/activities
 * Retrieves a cursor-paginated list of activities scoped to the active workspace (Phase 32).
 * Falls back to owner-scoped filter when no workspace context is present.
 */
export const getActivities = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const workspaceId = req.workspace?._id?.toString();
    const query = activityQuerySchema.parse(req.query);

    const result = await listActivities(userId, query, workspaceId);

    sendSuccessResponse(res, {
      message: "Activities retrieved successfully",
      data: result,
    });
  },
);
