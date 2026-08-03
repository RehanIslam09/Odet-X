import { Request, Response } from "express";

import { asyncHandler } from "@/utils/async-handler.js";
import {
  acceptInvitation,
  createInvitation,
  getInvitationByToken,
  listPendingInvitations,
  revokeInvitation,
  transferWorkspaceOwnership,
  updateMemberRole,
} from "@/services/workspace-invitation.service.js";
import {
  CreateInvitationDto,
  TransferOwnershipDto,
  UpdateMemberRoleDto,
} from "@/validators/workspace.validator.js";

/**
 * Handles POST /api/v1/workspaces/:workspaceId/invitations
 */
export const createInvitationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;
    const body = req.body as CreateInvitationDto;

    const invitation = await createInvitation(
      workspaceId,
      body.email,
      body.role,
      req.user!._id.toString(),
    );

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully.",
      data: invitation,
    });
  },
);

/**
 * Handles GET /api/v1/workspaces/:workspaceId/invitations
 */
export const listPendingInvitationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;

    const invitations = await listPendingInvitations(
      workspaceId,
      req.user!._id.toString(),
    );

    res.status(200).json({
      success: true,
      message: "Pending invitations retrieved successfully.",
      data: invitations,
    });
  },
);

/**
 * Handles DELETE /api/v1/workspaces/:workspaceId/invitations/:invitationId
 */
export const revokeInvitationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;
    const invitationId = req.params.invitationId as string;

    await revokeInvitation(
      workspaceId,
      invitationId,
      req.user!._id.toString(),
    );

    res.status(200).json({
      success: true,
      message: "Invitation revoked successfully.",
    });
  },
);

/**
 * Handles GET /api/v1/invitations/:token
 */
export const getInvitationByTokenHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.params.token as string;

    const details = await getInvitationByToken(token);

    res.status(200).json({
      success: true,
      message: "Invitation token validated.",
      data: details,
    });
  },
);

/**
 * Handles POST /api/v1/invitations/:token/accept
 */
export const acceptInvitationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.params.token as string;

    const result = await acceptInvitation(token, req.user!._id.toString());

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully.",
      data: result,
    });
  },
);

/**
 * Handles PATCH /api/v1/workspaces/:workspaceId/members/:userId/role
 */
export const updateMemberRoleHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.params.userId as string;
    const body = req.body as UpdateMemberRoleDto;

    await updateMemberRole(
      workspaceId,
      userId,
      body.role,
      req.user!._id.toString(),
    );

    res.status(200).json({
      success: true,
      message: "Member role updated successfully.",
    });
  },
);

/**
 * Handles POST /api/v1/workspaces/:workspaceId/transfer-ownership
 */
export const transferOwnershipHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId as string;
    const body = req.body as TransferOwnershipDto;

    await transferWorkspaceOwnership(
      workspaceId,
      body.newOwnerUserId,
      req.user!._id.toString(),
    );

    res.status(200).json({
      success: true,
      message: "Workspace ownership transferred successfully.",
    });
  },
);
