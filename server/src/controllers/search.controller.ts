import { Request, Response } from "express";
import { searchGlobalEntities } from "@/services/global-search.service.js";
import { sendSuccessResponse } from "@/utils/api-response.js";
import { asyncHandler } from "@/utils/async-handler.js";
import type { SearchQueryInput } from "@/validators/search.validator.js";

/**
 * Controller for GET /api/v1/search
 */
export const search = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Authenticated user identity is guaranteed by authenticate middleware
    const ownerId = (req.user!._id as { toString(): string }).toString();

    // Validated query params are attached to req.validatedQuery by validateQuery middleware
    const queryInput = req.validatedQuery as SearchQueryInput;

    const workspaceId = req.workspace?._id?.toString();
    const workspaceSlug = req.workspace?.slug;

    const results = await searchGlobalEntities({
      ownerId,
      query: queryInput.q,
      type: queryInput.type,
      limit: queryInput.limit,
      ...(workspaceId ? { workspaceId } : {}),
      ...(workspaceSlug ? { workspaceSlug } : {}),
    });

    sendSuccessResponse(res, {
      message: "Search results retrieved successfully.",
      data: results,
    });
  }
);
