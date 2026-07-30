import { Router } from "express";
import {
  dismiss,
  getOne,
  listProject,
  listWorkspace,
} from "@/controllers/project-recommendation.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { validateQuery } from "@/middleware/validate-query.js";
import { requirePermission } from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";
import {
  dismissRecommendationSchema,
  recommendationQuerySchema,
} from "@/validators/project-recommendation-api.validator.js";

// Sub-router for /projects/:projectId/recommendations
export const projectRecommendationSubRoutes = Router({ mergeParams: true });
projectRecommendationSubRoutes.use(authenticate);

// GET /api/v1/projects/:projectId/recommendations
projectRecommendationSubRoutes.get("/", requirePermission(Permission.PROJECT_READ), validateQuery(recommendationQuerySchema), listProject);

// GET /api/v1/projects/:projectId/recommendations/:id
projectRecommendationSubRoutes.get("/:id", requirePermission(Permission.PROJECT_READ), getOne);

// PATCH /api/v1/projects/:projectId/recommendations/:id/dismiss
projectRecommendationSubRoutes.patch("/:id/dismiss", requirePermission(Permission.PROJECT_UPDATE), validate(dismissRecommendationSchema), dismiss);


// Main router for /api/v1/recommendations
export const workspaceRecommendationRoutes = Router();
workspaceRecommendationRoutes.use(authenticate);

// GET /api/v1/recommendations
workspaceRecommendationRoutes.get("/", requirePermission(Permission.PROJECT_READ), validateQuery(recommendationQuerySchema), listWorkspace);

// GET /api/v1/recommendations/:id
workspaceRecommendationRoutes.get("/:id", requirePermission(Permission.PROJECT_READ), getOne);

// PATCH /api/v1/recommendations/:id/dismiss
workspaceRecommendationRoutes.patch("/:id/dismiss", requirePermission(Permission.PROJECT_UPDATE), validate(dismissRecommendationSchema), dismiss);
