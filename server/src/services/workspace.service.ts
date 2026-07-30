import { Types } from "mongoose";

import User from "@/models/user.model.js";
import Workspace, { IWorkspaceDocument } from "@/models/workspace.model.js";
import WorkspaceMember, { IWorkspaceMemberDocument } from "@/models/workspace-member.model.js";
import Project from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import { MAX_WORKSPACE_NAME_LENGTH, WorkspaceRole } from "@/constants/workspace.js";
import { CreateWorkspaceDto, UpdateWorkspaceDto, slugify } from "@/validators/workspace.validator.js";
import { ConflictError, ForbiddenError, NotFoundError } from "@/utils/app-error.js";

// ---------------------------------------------------------------------------
// DTOs & Interfaces
// ---------------------------------------------------------------------------

export interface ProvisionPersonalWorkspaceResult {
  workspace: IWorkspaceDocument;
  member: IWorkspaceMemberDocument;
}

export interface WorkspaceMemberUserDto {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface WorkspaceMemberDto {
  id: string;
  workspaceId: string;
  userId: string;
  user?: WorkspaceMemberUserDto;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isPersonal: boolean;
  role?: WorkspaceRole;
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toWorkspaceDto(
  workspace: IWorkspaceDocument,
  role?: WorkspaceRole,
  memberCount?: number,
): WorkspaceDto {
  return {
    id: workspace._id.toString(),
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId.toString(),
    isPersonal: workspace.isPersonal,
    ...(role ? { role } : {}),
    ...(typeof memberCount === "number" ? { memberCount } : {}),
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Personal Workspace Provisioning
// ---------------------------------------------------------------------------

export async function provisionPersonalWorkspace(user: {
  _id: string | Types.ObjectId | unknown;
  name: string;
  username: string;
}): Promise<ProvisionPersonalWorkspaceResult> {
  const userId = new Types.ObjectId(String(user._id));

  let workspace = await Workspace.findOne({
    ownerId: userId,
    isPersonal: true,
  });

  if (workspace) {
    let member = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: userId,
    });

    if (!member) {
      member = await WorkspaceMember.create({
        workspaceId: workspace._id,
        userId: userId,
        role: "OWNER",
      });
    } else if (member.role !== "OWNER") {
      member.role = "OWNER";
      await member.save();
    }

    // Backfill any legacy projects lacking workspaceId
    await Project.collection.updateMany(
      { owner: userId, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: workspace._id } },
    );
    await Task.collection.updateMany(
      { owner: userId, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: workspace._id } },
    );

    return { workspace, member };
  }

  // Generate clean personal workspace name & slug
  const cleanedName = user.name ? user.name.trim() : "Personal";
  const rawWsName = `${cleanedName}'s Workspace`;
  const wsName =
    rawWsName.length > MAX_WORKSPACE_NAME_LENGTH
      ? rawWsName.slice(0, MAX_WORKSPACE_NAME_LENGTH).trim()
      : rawWsName;

  const baseSlug = slugify(user.username || user.name || "personal");
  let slug = baseSlug;
  let attempt = 1;

  while (attempt <= 10) {
    const existing = await Workspace.findOne({ slug });
    if (!existing) {
      break;
    }
    attempt++;
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug.slice(0, 40)}-${suffix}`;
  }

  workspace = new Workspace({
    name: wsName,
    slug,
    ownerId: userId,
    isPersonal: true,
  });

  try {
    await workspace.save();
  } catch (err: any) {
    if (err?.code === 11000) {
      const existingPersonal = await Workspace.findOne({
        ownerId: userId,
        isPersonal: true,
      });

      if (existingPersonal) {
        let existingMember = await WorkspaceMember.findOne({
          workspaceId: existingPersonal._id,
          userId: userId,
        });

        if (!existingMember) {
          existingMember = await WorkspaceMember.create({
            workspaceId: existingPersonal._id,
            userId: userId,
            role: "OWNER",
          });
        }
        return { workspace: existingPersonal, member: existingMember };
      }
    }
    throw err;
  }

  let member: IWorkspaceMemberDocument;
  try {
    member = await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: userId,
      role: "OWNER",
    });
  } catch (err) {
    await Workspace.deleteOne({ _id: workspace._id });
    throw err;
  }

  // Backfill any legacy projects and tasks lacking workspaceId
  await Project.collection.updateMany(
    { owner: userId, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
    { $set: { workspaceId: workspace._id } },
  );
  await Task.collection.updateMany(
    { owner: userId, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
    { $set: { workspaceId: workspace._id } },
  );

  return { workspace, member };
}

/**
 * Creates a non-personal custom workspace owned by the requesting user.
 */
export async function createCustomWorkspace(
  userId: string,
  data: CreateWorkspaceDto,
): Promise<WorkspaceDto> {
  const userObjId = new Types.ObjectId(userId);
  const baseSlug = data.slug ? slugify(data.slug) : slugify(data.name);

  let slug = baseSlug;
  let attempt = 1;
  while (attempt <= 10) {
    const existing = await Workspace.findOne({ slug });
    if (!existing) {
      break;
    }
    attempt++;
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug.slice(0, 40)}-${suffix}`;
  }

  const workspace = new Workspace({
    name: data.name,
    slug,
    ownerId: userObjId,
    isPersonal: false,
  });

  try {
    await workspace.save();
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new ConflictError("Workspace slug is already taken.");
    }
    throw err;
  }

  try {
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: userObjId,
      role: "OWNER",
    });
  } catch (err) {
    await Workspace.deleteOne({ _id: workspace._id });
    throw err;
  }

  return toWorkspaceDto(workspace, "OWNER", 1);
}

/**
 * Lists all workspaces that the user belongs to (as OWNER or MEMBER).
 * If a legacy user has no memberships, automatically provisions their personal workspace.
 */
export async function listWorkspacesForUser(userId: string): Promise<WorkspaceDto[]> {
  const userObjId = new Types.ObjectId(userId);

  let memberships = await WorkspaceMember.find({ userId: userObjId });
  if (memberships.length === 0) {
    const userDoc = await User.findById(userObjId);
    if (userDoc) {
      await provisionPersonalWorkspace(userDoc);
      memberships = await WorkspaceMember.find({ userId: userObjId });
    }
  }

  if (memberships.length === 0) {
    return [];
  }

  const membershipMap = new Map<string, WorkspaceRole>();
  const workspaceIds = memberships.map((m) => {
    membershipMap.set(m.workspaceId.toString(), m.role);
    return m.workspaceId;
  });

  const workspaces = await Workspace.find({ _id: { $in: workspaceIds } })
    .sort({ isPersonal: -1, createdAt: 1 })
    .exec();

  const memberCounts = await WorkspaceMember.aggregate([
    { $match: { workspaceId: { $in: workspaceIds } } },
    { $group: { _id: "$workspaceId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>();
  for (const mc of memberCounts) {
    countMap.set(mc._id.toString(), mc.count);
  }

  return workspaces.map((ws) => {
    const wsIdStr = ws._id.toString();
    const role = membershipMap.get(wsIdStr) || "MEMBER";
    const count = countMap.get(wsIdStr) || 1;
    return toWorkspaceDto(ws, role, count);
  });
}

/**
 * Retrieves details for a specific workspace including active members list.
 */
export async function getWorkspaceDetails(
  workspaceId: string,
  userId: string,
): Promise<{ workspace: WorkspaceDto; members: WorkspaceMemberDto[] }> {
  const workspaceObjId = new Types.ObjectId(workspaceId);
  const userObjId = new Types.ObjectId(userId);

  const membership = await WorkspaceMember.findOne({
    workspaceId: workspaceObjId,
    userId: userObjId,
  });

  if (!membership) {
    throw new NotFoundError("Workspace not found.");
  }

  const workspace = await Workspace.findById(workspaceObjId);
  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  const memberDocs = await WorkspaceMember.find({ workspaceId: workspaceObjId })
    .populate("userId", "name username email")
    .exec();

  const members: WorkspaceMemberDto[] = memberDocs.map((m) => {
    const userDoc = m.userId as unknown as { _id: Types.ObjectId; name: string; username: string; email: string };
    return {
      id: m._id.toString(),
      workspaceId: m.workspaceId.toString(),
      userId: userDoc._id.toString(),
      user: {
        id: userDoc._id.toString(),
        name: userDoc.name,
        username: userDoc.username,
        email: userDoc.email,
      },
      role: m.role,
      joinedAt: m.joinedAt,
    };
  });

  return {
    workspace: toWorkspaceDto(workspace, membership.role, members.length),
    members,
  };
}

/**
 * Applies updates to workspace name or slug (OWNER permission required).
 */
export async function updateCustomWorkspace(
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceDto,
): Promise<WorkspaceDto> {
  const workspaceObjId = new Types.ObjectId(workspaceId);
  const userObjId = new Types.ObjectId(userId);

  const member = await WorkspaceMember.findOne({
    workspaceId: workspaceObjId,
    userId: userObjId,
  });

  if (!member) {
    throw new NotFoundError("Workspace not found.");
  }

  if (member.role !== "OWNER") {
    throw new ForbiddenError("Workspace owner permission required.");
  }

  const workspace = await Workspace.findById(workspaceObjId);
  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  if (data.name !== undefined && data.name.trim().length > 0) {
    workspace.name = data.name.trim();
  }

  if (data.slug !== undefined && data.slug.trim().length > 0) {
    const newSlug = slugify(data.slug);
    if (newSlug !== workspace.slug) {
      const existingSlug = await Workspace.findOne({ slug: newSlug, _id: { $ne: workspace._id } });
      if (existingSlug) {
        throw new ConflictError("Workspace slug is already taken.");
      }
      workspace.slug = newSlug;
    }
  }

  await workspace.save();
  return toWorkspaceDto(workspace, "OWNER");
}

/**
 * Deletes a non-personal workspace if empty of active projects.
 */
export async function deleteCustomWorkspace(workspaceId: string, userId: string): Promise<void> {
  const workspaceObjId = new Types.ObjectId(workspaceId);
  const userObjId = new Types.ObjectId(userId);

  const member = await WorkspaceMember.findOne({
    workspaceId: workspaceObjId,
    userId: userObjId,
  });

  if (!member) {
    throw new NotFoundError("Workspace not found.");
  }

  if (member.role !== "OWNER") {
    throw new ForbiddenError("Workspace owner permission required.");
  }

  const workspace = await Workspace.findById(workspaceObjId);
  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  if (workspace.isPersonal) {
    throw new ForbiddenError("Personal workspaces cannot be deleted.");
  }

  const activeProjectsCount = await Project.countDocuments({
    workspaceId: workspaceObjId,
    isDeleted: false,
  });

  if (activeProjectsCount > 0) {
    throw new ConflictError("Cannot delete workspace containing active projects.");
  }

  await WorkspaceMember.deleteMany({ workspaceId: workspaceObjId });
  await Workspace.deleteOne({ _id: workspaceObjId });
}

/**
 * Lists member records for a workspace.
 */
export async function listWorkspaceMembers(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMemberDto[]> {
  const details = await getWorkspaceDetails(workspaceId, userId);
  return details.members;
}

/**
 * Removes a member from a workspace or allows a member to self-leave.
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  targetUserId: string,
  requestingUserId: string,
): Promise<void> {
  const workspaceObjId = new Types.ObjectId(workspaceId);
  const targetObjId = new Types.ObjectId(targetUserId);
  const requestingObjId = new Types.ObjectId(requestingUserId);

  const requestingMember = await WorkspaceMember.findOne({
    workspaceId: workspaceObjId,
    userId: requestingObjId,
  });

  if (!requestingMember) {
    throw new NotFoundError("Workspace not found.");
  }

  const targetMember = await WorkspaceMember.findOne({
    workspaceId: workspaceObjId,
    userId: targetObjId,
  });

  if (!targetMember) {
    throw new NotFoundError("Member not found in workspace.");
  }

  const isSelfLeaving = targetUserId === requestingUserId;

  if (!isSelfLeaving && requestingMember.role !== "OWNER") {
    throw new ForbiddenError("Workspace owner permission required.");
  }

  if (targetMember.role === "OWNER") {
    const ownerCount = await WorkspaceMember.countDocuments({
      workspaceId: workspaceObjId,
      role: "OWNER",
    });

    if (ownerCount <= 1) {
      if (isSelfLeaving) {
        throw new ForbiddenError("Cannot leave workspace as sole OWNER.");
      } else {
        throw new ForbiddenError("Workspace owner cannot be removed.");
      }
    }
  }

  await WorkspaceMember.deleteOne({ _id: targetMember._id });
}
