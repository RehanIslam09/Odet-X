import { Router } from "express";

import {
  create,
  list,
  remove,
  update,
} from "@/controllers/project-memory.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { validateQuery } from "@/middleware/validate-query.js";
import {
  createProjectMemorySchema,
  projectMemoryQuerySchema,
  updateProjectMemorySchema,
} from "@/validators/project-memory.validator.js";

// mergeParams: true allows access to :projectId from parent project router
const router = Router({ mergeParams: true });

// All project memory endpoints require authentication
router.use(authenticate);

// POST /api/v1/projects/:projectId/memories
router.post("/", validate(createProjectMemorySchema), create);

// GET /api/v1/projects/:projectId/memories
router.get("/", validateQuery(projectMemoryQuerySchema), list);

// PATCH /api/v1/projects/:projectId/memories/:memoryId
router.patch("/:memoryId", validate(updateProjectMemorySchema), update);

// DELETE /api/v1/projects/:projectId/memories/:memoryId
router.delete("/:memoryId", remove);

export default router;
