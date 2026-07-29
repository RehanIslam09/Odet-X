import { Router } from "express";

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listMembers,
  listWorkspaces,
  removeMember,
  updateWorkspace,
} from "@/controllers/workspace.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import {
  resolveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "@/middleware/workspace-auth.middleware.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "@/validators/workspace.validator.js";

const router = Router();

// All workspace endpoints require an authenticated user session
router.use(authenticate);

// Top-level workspace routes
router.get("/", listWorkspaces);
router.post("/", validate(createWorkspaceSchema), createWorkspace);

// Specific workspace ID routes (require resolution & membership)
router.get(
  "/:workspaceId",
  resolveWorkspace,
  requireWorkspaceMember,
  getWorkspace,
);

router.patch(
  "/:workspaceId",
  resolveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  validate(updateWorkspaceSchema),
  updateWorkspace,
);

router.delete(
  "/:workspaceId",
  resolveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  deleteWorkspace,
);

// Member management routes
router.get(
  "/:workspaceId/members",
  resolveWorkspace,
  requireWorkspaceMember,
  listMembers,
);

router.delete(
  "/:workspaceId/members/:userId",
  resolveWorkspace,
  requireWorkspaceMember,
  removeMember,
);

export default router;
