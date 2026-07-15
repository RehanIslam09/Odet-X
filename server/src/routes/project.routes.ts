import { Router } from "express";

import {
  archive,
  create,
  getOne,
  list,
  remove,
  update,
} from "@/controllers/project.controller.js";

import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { validateQuery } from "@/middleware/validate-query.js";

import {
  createProjectSchema,
  projectQuerySchema,
  updateProjectSchema,
} from "@/validators/project.validator.js";

const router = Router();

// All project routes require authentication.
router.use(authenticate);

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

// GET /projects/:id
router.get("/:id", getOne);

// PATCH /projects/:id
router.patch("/:id", validate(updateProjectSchema), update);

// DELETE /projects/:id
router.delete("/:id", remove);

// ---------------------------------------------------------------------------
// Sub-resource actions
// ---------------------------------------------------------------------------

// POST /projects/:id/archive  (toggles archived state)
router.post("/:id/archive", archive);

export default router;
