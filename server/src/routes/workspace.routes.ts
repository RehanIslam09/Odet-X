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
import {
  createInvitationHandler,
  listPendingInvitationsHandler,
  revokeInvitationHandler,
  transferOwnershipHandler,
  updateMemberRoleHandler,
} from "@/controllers/workspace-invitation.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import {
  resolveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  requirePermission,
} from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";
import {
  createInvitationSchema,
  createWorkspaceSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
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
  requireWorkspaceOwner,
  validate(updateWorkspaceSchema),
  updateWorkspace,
);

router.delete(
  "/:workspaceId",
  resolveWorkspace,
  requireWorkspaceOwner,
  deleteWorkspace,
);

// Member management routes
router.get(
  "/:workspaceId/members",
  resolveWorkspace,
  requireWorkspaceMember,
  requirePermission(Permission.MEMBER_LIST),
  listMembers,
);

router.delete(
  "/:workspaceId/members/:userId",
  resolveWorkspace,
  requireWorkspaceMember,
  requirePermission(Permission.MEMBER_REMOVE),
  removeMember,
);

router.patch(
  "/:workspaceId/members/:userId/role",
  resolveWorkspace,
  requireWorkspaceOwner,
  validate(updateMemberRoleSchema),
  updateMemberRoleHandler,
);

router.post(
  "/:workspaceId/transfer-ownership",
  resolveWorkspace,
  requireWorkspaceOwner,
  validate(transferOwnershipSchema),
  transferOwnershipHandler,
);

// Invitation management routes
router.post(
  "/:workspaceId/invitations",
  resolveWorkspace,
  requirePermission(Permission.MEMBER_INVITE),
  validate(createInvitationSchema),
  createInvitationHandler,
);

router.get(
  "/:workspaceId/invitations",
  resolveWorkspace,
  requirePermission(Permission.MEMBER_LIST),
  listPendingInvitationsHandler,
);

router.delete(
  "/:workspaceId/invitations/:invitationId",
  resolveWorkspace,
  requirePermission(Permission.MEMBER_INVITE),
  revokeInvitationHandler,
);

export default router;
