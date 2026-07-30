import { Router } from "express";

import {
  archive,
  create,
  getOne,
  getOptions,
  getSummary,
  list,
  remove,
  update,
  generateTasks,
  generateSummary,
} from "@/controllers/project.controller.js";
import { queryCopilot } from "@/controllers/copilot.controller.js";

import planRoutes from "@/routes/plan.routes.js";
import projectMemoryRoutes from "@/routes/project-memory.routes.js";
import { projectRecommendationSubRoutes } from "@/routes/project-recommendation.routes.js";

import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { validateQuery } from "@/middleware/validate-query.js";
import { requirePermission } from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";

import {
  createProjectSchema,
  projectQuerySchema,
  updateProjectSchema,
  generateProjectTasksSchema,
  generateProjectSummarySchema,
} from "@/validators/project.validator.js";
import { copilotQuerySchema } from "@/validators/copilot.validator.js";

const router = Router();

// All project routes require authentication.
router.use(authenticate);

// ---------------------------------------------------------------------------
// Sub-resource Routes (/projects/:projectId/*)
// ---------------------------------------------------------------------------
router.use("/:projectId/plans", planRoutes);
router.use("/:projectId/memories", projectMemoryRoutes);
router.use("/:projectId/recommendations", projectRecommendationSubRoutes);

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

// GET /projects?page=1&limit=12&search=...&sort=-updatedAt&archived=false
router.get("/", requirePermission(Permission.PROJECT_READ), validateQuery(projectQuerySchema), list);

// POST /projects
router.post("/", requirePermission(Permission.PROJECT_CREATE), validate(createProjectSchema), create);

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

// GET /projects/options
router.get("/options", requirePermission(Permission.PROJECT_READ), getOptions);

// GET /projects/:id
router.get("/:id", requirePermission(Permission.PROJECT_READ), getOne);

// GET /projects/:id/summary
router.get("/:id/summary", requirePermission(Permission.PROJECT_READ), getSummary);

// PATCH /projects/:id
router.patch("/:id", requirePermission(Permission.PROJECT_UPDATE), validate(updateProjectSchema), update);

// DELETE /projects/:id
router.delete("/:id", requirePermission(Permission.PROJECT_DELETE), remove);

// ---------------------------------------------------------------------------
// Sub-resource actions
// ---------------------------------------------------------------------------

// POST /projects/:id/archive  (toggles archived state)
router.post("/:id/archive", requirePermission(Permission.PROJECT_ARCHIVE), archive);

// POST /projects/:id/generate-tasks (AI Task Generation)
router.post("/:id/generate-tasks", requirePermission(Permission.AI_ACTION_EXECUTE), validate(generateProjectTasksSchema), generateTasks);

// POST /projects/:id/generate-summary (AI Project Summary)
router.post("/:id/generate-summary", requirePermission(Permission.AI_ACTION_EXECUTE), validate(generateProjectSummarySchema), generateSummary);

// POST /projects/:projectId/copilot (Read-Only AI Project Copilot)
router.post("/:projectId/copilot", requirePermission(Permission.AI_COPILOT_QUERY), validate(copilotQuerySchema), queryCopilot);

export default router;
