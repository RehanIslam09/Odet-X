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

import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { validateQuery } from "@/middleware/validate-query.js";

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

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

// GET /projects?page=1&limit=12&search=...&sort=-updatedAt&archived=false
router.get("/", validateQuery(projectQuerySchema), list);

// POST /projects
router.post("/", validate(createProjectSchema), create);

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

// GET /projects/options
router.get("/options", getOptions);

// GET /projects/:id
router.get("/:id", getOne);

// GET /projects/:id/summary
router.get("/:id/summary", getSummary);

// PATCH /projects/:id
router.patch("/:id", validate(updateProjectSchema), update);

// DELETE /projects/:id
router.delete("/:id", remove);

// ---------------------------------------------------------------------------
// Sub-resource actions
// ---------------------------------------------------------------------------

// POST /projects/:id/archive  (toggles archived state)
router.post("/:id/archive", archive);

// POST /projects/:id/generate-tasks (AI Task Generation)
router.post("/:id/generate-tasks", validate(generateProjectTasksSchema), generateTasks);

// POST /projects/:id/generate-summary (AI Project Summary)
router.post("/:id/generate-summary", validate(generateProjectSummarySchema), generateSummary);

// POST /projects/:projectId/copilot (Read-Only AI Project Copilot)
router.post("/:projectId/copilot", validate(copilotQuerySchema), queryCopilot);

export default router;
