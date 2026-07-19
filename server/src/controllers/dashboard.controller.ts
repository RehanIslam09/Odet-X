import { Request, Response } from "express";
import { getDashboardOverview } from "@/services/dashboard.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";

/**
 * GET /api/v1/dashboard/overview
 * Returns the aggregated dashboard analytics for the authenticated user.
 */
export const getOverview = async (req: Request, res: Response) => {
  const userId = req.user!._id.toString(); // Authenticated user boundary
  const data = await getDashboardOverview(userId);

  sendSuccessResponse(res, {
    message: "Dashboard overview retrieved successfully.",
    data
  });
};
