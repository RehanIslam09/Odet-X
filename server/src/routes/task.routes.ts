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
router.get("/", validateQuery(taskQuerySchema), list);
router.post("/", validate(createTaskSchema), create);

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------
router.get("/:id", getOne);
router.patch("/:id", validate(updateTaskSchema), update);
router.delete("/:id", remove);

// ---------------------------------------------------------------------------
// Sub-actions
// ---------------------------------------------------------------------------
router.patch("/:id/notes", validate(updateTaskNotesSchema), updateNotes);
router.post("/:id/archive", archive);
router.post("/:id/generate-labels", validate(generateTaskLabelsSchema), generateLabels);

export default router;
