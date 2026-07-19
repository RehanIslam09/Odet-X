import { Request, Response } from "express";
import { listActivities } from "@/services/activity.service.js";
import { activityQuerySchema } from "@/validators/activity.validator.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccessResponse } from "@/utils/api-response.js";

/**
 * GET /api/v1/activities
 * Retrieves a cursor-paginated list of activities scoped to the authenticated user.
 */
export const getActivities = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const query = activityQuerySchema.parse(req.query);

    const result = await listActivities(userId, query);

    sendSuccessResponse(res, {
      message: "Activities retrieved successfully",
      data: result,
    });
  },
);
