import crypto from "node:crypto";
import { Types } from "mongoose";

import WorkspaceInvitation, {
  IWorkspaceInvitationDocument,
} from "@/models/workspace-invitation.model.js";
import WorkspaceMember from "@/models/workspace-member.model.js";
import Workspace from "@/models/workspace.model.js";
import User from "@/models/user.model.js";
import { WorkspaceRole } from "@/constants/workspace.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/utils/app-error.js";
import { createDomainEvent, domainEventBus } from "@/realtime/index.js";
import { recordActivity } from "@/services/activity.service.js";
import { createNotification } from "@/services/notification.service.js";

export interface WorkspaceInvitationDto {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
  expiresAt: Date;
  status: string;
  createdAt: Date;
}

function toInvitationDto(
  invitation: IWorkspaceInvitationDocument,
  inviterUser?: { id: string; name: string; email: string },
): WorkspaceInvitationDto {
  return {
    id: invitation._id.toString(),
    workspaceId: invitation.workspaceId.toString(),
    email: invitation.email,
    role: invitation.role,
    invitedBy: inviterUser || {
      id: invitation.invitedBy.toString(),
      name: "Workspace Admin",
      email: "",
    },
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    status: invitation.status,
    createdAt: invitation.createdAt,
  };
}

/**
 * Generates a new invitation for a user by email to join a workspace.
 */
export async function createInvitation(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  requestingUserId: string,
): Promise<WorkspaceInvitationDto> {
  const wsObjId = new Types.ObjectId(workspaceId);
  const reqObjId = new Types.ObjectId(requestingUserId);
  const normalizedEmail = email.trim().toLowerCase();

  const workspace = await Workspace.findById(wsObjId);
  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  const requestingMember = await WorkspaceMember.findOne({
    workspaceId: wsObjId,
    userId: reqObjId,
  });

  if (!requestingMember || requestingMember.role !== "OWNER") {
    throw new ForbiddenError("Workspace owner permission required.");
  }

  // Check if target user already holds membership in workspace
  const targetUser = await User.findOne({ email: normalizedEmail });
  if (targetUser) {
    const existingMember = await WorkspaceMember.findOne({
      workspaceId: wsObjId,
      userId: targetUser._id,
    });

    if (existingMember) {
      throw new ConflictError("User is already a member of this workspace.");
    }
  }

  // Revoke any existing PENDING invitation for this email & workspace
  await WorkspaceInvitation.updateMany(
    { workspaceId: wsObjId, email: normalizedEmail, status: "PENDING" },
    { $set: { status: "REVOKED", revokedAt: new Date() } },
  );

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

  const invitation = await WorkspaceInvitation.create({
    workspaceId: wsObjId,
    email: normalizedEmail,
    role: role || "MEMBER",
    invitedBy: reqObjId,
    token,
    expiresAt,
    status: "PENDING",
  });

  const inviterUser = await User.findById(reqObjId);
  const inviterInfo = {
    id: reqObjId.toString(),
    name: inviterUser ? inviterUser.name : "Workspace Admin",
    email: inviterUser ? inviterUser.email : "",
  };

  // If invited user is already a registered platform user, notify them
  if (targetUser) {
    await createNotification({
      recipientId: targetUser._id.toString(),
      actorId: requestingUserId,
      type: "workspace.invitation",
      title: "Workspace Invitation",
      message: `You have been invited to join the workspace "${workspace.name}".`,
      entityType: "workspaceMember",
      entityId: invitation._id.toString(),
      workspaceId,
      metadata: {
        token,
        workspaceName: workspace.name,
      },
    });
  }

  // Record Audit Trail
  await recordActivity({
    owner: requestingUserId,
    actorId: requestingUserId,
    workspaceId,
    type: "member.invited",
    entityType: "workspaceMember",
    entityId: invitation._id.toString(),
    metadata: {
      action: "INVITATION_CREATED",
      email: normalizedEmail,
      role: invitation.role,
    },
  });

  // Publish Realtime Domain Event
  await domainEventBus.publish(
    createDomainEvent({
      type: "member.invited",
      workspaceId,
      actorId: requestingUserId,
      resource: {
        type: "workspaceMember",
        id: invitation._id.toString(),
      },
      payload: {
        email: normalizedEmail,
        role: invitation.role,
      },
    }),
  );

  return toInvitationDto(invitation, inviterInfo);
}

/**
 * Lists active pending invitations for a workspace.
 */
export async function listPendingInvitations(
  workspaceId: string,
  requestingUserId: string,
): Promise<WorkspaceInvitationDto[]> {
  const wsObjId = new Types.ObjectId(workspaceId);
  const reqObjId = new Types.ObjectId(requestingUserId);

  const member = await WorkspaceMember.findOne({
    workspaceId: wsObjId,
    userId: reqObjId,
  });

  if (!member) {
    throw new NotFoundError("Workspace not found.");
  }

  const invites = await WorkspaceInvitation.find({
    workspaceId: wsObjId,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  })
    .populate("invitedBy", "name email")
    .sort({ createdAt: -1 })
    .exec();

  return invites.map((inv) => {
    const inviter = inv.invitedBy as unknown as { _id: Types.ObjectId; name: string; email: string };
    return toInvitationDto(inv, {
      id: inviter._id.toString(),
      name: inviter.name,
      email: inviter.email,
    });
  });
}

/**
 * Revokes a pending workspace invitation.
 */
export async function revokeInvitation(
  workspaceId: string,
  invitationId: string,
  requestingUserId: string,
): Promise<void> {
  const wsObjId = new Types.ObjectId(workspaceId);
  const invObjId = new Types.ObjectId(invitationId);
  const reqObjId = new Types.ObjectId(requestingUserId);

  const requestingMember = await WorkspaceMember.findOne({
    workspaceId: wsObjId,
    userId: reqObjId,
  });

  if (!requestingMember || requestingMember.role !== "OWNER") {
    throw new ForbiddenError("Workspace owner permission required.");
  }

  const invitation = await WorkspaceInvitation.findOne({
    _id: invObjId,
    workspaceId: wsObjId,
  });

  if (!invitation) {
    throw new NotFoundError("Invitation not found.");
  }

  if (invitation.status !== "PENDING") {
    throw new BadRequestError("Only pending invitations can be revoked.");
  }

  invitation.status = "REVOKED";
  invitation.revokedAt = new Date();
  await invitation.save();

  await recordActivity({
    owner: requestingUserId,
    actorId: requestingUserId,
    workspaceId,
    type: "member.removed",
    entityType: "workspaceMember",
    entityId: invitation._id.toString(),
    metadata: {
      action: "INVITATION_REVOKED",
      email: invitation.email,
    },
  });

  await domainEventBus.publish(
    createDomainEvent({
      type: "member.updated",
      workspaceId,
      actorId: requestingUserId,
      resource: {
        type: "workspaceMember",
        id: invitation._id.toString(),
      },
      payload: {
        action: "INVITATION_REVOKED",
      },
    }),
  );
}

/**
 * Validates an invitation token and returns details.
 */
export async function getInvitationByToken(token: string): Promise<{
  invitation: WorkspaceInvitationDto;
  workspaceName: string;
  workspaceSlug: string;
}> {
  const invitation = await WorkspaceInvitation.findOne({ token }).populate("workspaceId");
  if (!invitation) {
    throw new NotFoundError("Invitation token invalid or not found.");
  }

  if (invitation.status !== "PENDING") {
    throw new BadRequestError("This invitation is no longer active.");
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = "EXPIRED";
    await invitation.save();
    throw new BadRequestError("This invitation has expired.");
  }

  const workspace = invitation.workspaceId as unknown as {
    _id: Types.ObjectId;
    name: string;
    slug: string;
  };

  const inviterUser = await User.findById(invitation.invitedBy);

  return {
    invitation: toInvitationDto(invitation, {
      id: invitation.invitedBy.toString(),
      name: inviterUser ? inviterUser.name : "Workspace Admin",
      email: inviterUser ? inviterUser.email : "",
    }),
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
  };
}

/**
 * Accepts an invitation token and adds the accepting user to the workspace.
 */
export async function acceptInvitation(
  token: string,
  acceptingUserId: string,
): Promise<{ workspaceId: string; workspaceSlug: string; role: WorkspaceRole }> {
  const userObjId = new Types.ObjectId(acceptingUserId);

  const invitation = await WorkspaceInvitation.findOne({ token, status: "PENDING" });
  if (!invitation) {
    throw new NotFoundError("Invitation token invalid or active invitation not found.");
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = "EXPIRED";
    await invitation.save();
    throw new BadRequestError("This invitation has expired.");
  }

  const workspace = await Workspace.findById(invitation.workspaceId);
  if (!workspace) {
    throw new NotFoundError("Workspace no longer exists.");
  }

  // Verify if user is already a member
  let membership = await WorkspaceMember.findOne({
    workspaceId: workspace._id,
    userId: userObjId,
  });

  if (!membership) {
    membership = await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: userObjId,
      role: invitation.role,
      joinedAt: new Date(),
    });
  }

  invitation.status = "ACCEPTED";
  invitation.acceptedAt = new Date();
  await invitation.save();

  // Notify workspace owner
  await createNotification({
    recipientId: workspace.ownerId.toString(),
    actorId: acceptingUserId,
    type: "member.joined",
    title: "Invitation Accepted",
    message: `A new member has joined "${workspace.name}".`,
    entityType: "workspaceMember",
    entityId: membership._id.toString(),
    workspaceId: workspace._id.toString(),
  });

  // Record Activity Log
  await recordActivity({
    owner: acceptingUserId,
    actorId: acceptingUserId,
    workspaceId: workspace._id.toString(),
    type: "member.added",
    entityType: "workspaceMember",
    entityId: membership._id.toString(),
    metadata: {
      action: "INVITATION_ACCEPTED",
      role: membership.role,
    },
  });

  // Publish Realtime Event
  await domainEventBus.publish(
    createDomainEvent({
      type: "member.added",
      workspaceId: workspace._id.toString(),
      actorId: acceptingUserId,
      resource: {
        type: "workspaceMember",
        id: membership._id.toString(),
      },
      payload: {
        userId: acceptingUserId,
        role: membership.role,
      },
    }),
  );

  return {
    workspaceId: workspace._id.toString(),
    workspaceSlug: workspace.slug,
    role: membership.role,
  };
}

/**
 * Updates a workspace member's role (OWNER permission required).
 */
export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: WorkspaceRole,
  requestingUserId: string,
): Promise<void> {
  const wsObjId = new Types.ObjectId(workspaceId);
  const targetObjId = new Types.ObjectId(targetUserId);
  const reqObjId = new Types.ObjectId(requestingUserId);

  const requestingMember = await WorkspaceMember.findOne({
    workspaceId: wsObjId,
    userId: reqObjId,
  });

  if (!requestingMember || requestingMember.role !== "OWNER") {
    throw new ForbiddenError("Workspace owner permission required.");
  }

  const targetMember = await WorkspaceMember.findOne({
    workspaceId: wsObjId,
    userId: targetObjId,
  });

  if (!targetMember) {
    throw new NotFoundError("Workspace member not found.");
  }

  if (targetMember.role === "OWNER" && newRole !== "OWNER") {
    const ownerCount = await WorkspaceMember.countDocuments({
      workspaceId: wsObjId,
      role: "OWNER",
    });

    if (ownerCount <= 1) {
      throw new ForbiddenError("Cannot demote the sole workspace owner.");
    }
  }

  targetMember.role = newRole;
  await targetMember.save();

  await recordActivity({
    owner: requestingUserId,
    actorId: requestingUserId,
    workspaceId,
    type: "member.role_changed",
    entityType: "workspaceMember",
    entityId: targetMember._id.toString(),
    metadata: {
      action: "ROLE_CHANGED",
      newRole,
    },
  });

  await domainEventBus.publish(
    createDomainEvent({
      type: "member.updated",
      workspaceId,
      actorId: requestingUserId,
      resource: {
        type: "workspaceMember",
        id: targetMember._id.toString(),
      },
      payload: {
        targetUserId,
        newRole,
      },
    }),
  );
}

/**
 * Transfers primary ownership of a workspace to another active member.
 */
export async function transferWorkspaceOwnership(
  workspaceId: string,
  newOwnerUserId: string,
  requestingUserId: string,
): Promise<void> {
  const wsObjId = new Types.ObjectId(workspaceId);
  const newOwnerObjId = new Types.ObjectId(newOwnerUserId);

  const workspace = await Workspace.findById(wsObjId);
  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  if (workspace.ownerId.toString() !== requestingUserId) {
    throw new ForbiddenError("Primary workspace owner permission required.");
  }

  const newOwnerMember = await WorkspaceMember.findOne({
    workspaceId: wsObjId,
    userId: newOwnerObjId,
  });

  if (!newOwnerMember) {
    throw new NotFoundError("Target user is not an active member of this workspace.");
  }

  await Workspace.findByIdAndUpdate(wsObjId, { ownerId: newOwnerObjId });

  newOwnerMember.role = "OWNER";
  await newOwnerMember.save();

  await createNotification({
    recipientId: newOwnerUserId,
    actorId: requestingUserId,
    type: "member.joined",
    title: "Workspace Ownership Transferred",
    message: `You are now the primary owner of "${workspace.name}".`,
    entityType: "workspaceMember",
    entityId: newOwnerMember._id.toString(),
    workspaceId,
  });

  await recordActivity({
    owner: requestingUserId,
    actorId: requestingUserId,
    workspaceId,
    type: "workspace.owner_transferred",
    entityType: "workspace",
    entityId: workspace._id.toString(),
    metadata: {
      action: "OWNERSHIP_TRANSFERRED",
      newOwnerUserId,
    },
  });

  await domainEventBus.publish(
    createDomainEvent({
      type: "workspace.ownerTransferred",
      workspaceId,
      actorId: requestingUserId,
      resource: {
        type: "workspaceMember",
        id: workspace._id.toString(),
      },
      payload: {
        newOwnerUserId,
      },
    }),
  );
}
