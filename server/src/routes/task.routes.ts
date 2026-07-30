import { Router } from "express";

import {
  archive,
  create,
  getOne,
  list,
  remove,
  update,
  updateNotes,
  generateLabels,
} from "@/controllers/task.controller.js";

import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { validateQuery } from "@/middleware/validate-query.js";
import { requirePermission } from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";

import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
  updateTaskNotesSchema,
  generateTaskLabelsSchema,
} from "@/validators/task.validator.js";

const router = Router();

// Enforce authentication for all task endpoints
router.use(authenticate);

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------
router.get("/", requirePermission(Permission.TASK_READ), validateQuery(taskQuerySchema), list);
router.post("/", requirePermission(Permission.TASK_CREATE), validate(createTaskSchema), create);

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------
router.get("/:id", requirePermission(Permission.TASK_READ), getOne);
router.patch("/:id", requirePermission(Permission.TASK_UPDATE), validate(updateTaskSchema), update);
router.delete("/:id", requirePermission(Permission.TASK_DELETE), remove);

// ---------------------------------------------------------------------------
// Sub-actions
// ---------------------------------------------------------------------------
router.patch("/:id/notes", requirePermission(Permission.TASK_UPDATE), validate(updateTaskNotesSchema), updateNotes);
router.post("/:id/archive", requirePermission(Permission.TASK_UPDATE), archive);
router.post("/:id/generate-labels", requirePermission(Permission.AI_ACTION_EXECUTE), validate(generateTaskLabelsSchema), generateLabels);

export default router;
