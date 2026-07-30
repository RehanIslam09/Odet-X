import { Types } from "mongoose";
import { Permission, ROLE_PERMISSIONS } from "@/constants/permissions.js";
import { WorkspaceRole } from "@/constants/workspace.js";
import { IUserDocument } from "@/models/user.model.js";
import { IWorkspaceDocument } from "@/models/workspace.model.js";
import { IWorkspaceMemberDocument } from "@/models/workspace-member.model.js";
import { ForbiddenError, NotFoundError } from "@/utils/app-error.js";

export interface AuthContext {
  user: IUserDocument;
  workspace: IWorkspaceDocument;
  member: IWorkspaceMemberDocument;
}

export interface ResourceContext {
  createdBy?: string | Types.ObjectId;
  assigneeId?: string | Types.ObjectId;
  workspaceId?: string | Types.ObjectId;
  isPersonalWorkspace?: boolean;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Pure domain service for evaluating Role-Based Access Control and Resource Context rules.
 */
export class PermissionEngine {
  /**
   * Fast-path capability check: returns true if the role has the baseline permission.
   */
  public static hasCapability(role: WorkspaceRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Evaluates authorization considering role capabilities AND optional resource context.
   */
  public static evaluate(
    context: AuthContext,
    permission: Permission,
    resourceContext?: ResourceContext,
  ): PermissionResult {
    const { user, workspace, member } = context;

    // 1. Anti-Enumeration & Tenant Boundary Verification
    if (resourceContext?.workspaceId) {
      const resourceWsId = resourceContext.workspaceId.toString();
      const targetWsId = workspace._id.toString();
      const memberWsId =
        typeof member.workspaceId === "object" &&
        member.workspaceId !== null &&
        "_id" in (member.workspaceId as object)
          ? (member.workspaceId as unknown as { _id: Types.ObjectId })._id.toString()
          : member.workspaceId.toString();

      if (resourceWsId !== targetWsId || resourceWsId !== memberWsId) {
        return {
          allowed: false,
          reason: "Workspace not found.",
        };
      }
    }

    // 2. Base Capability Matrix Check
    const role = member.role;
    if (!this.hasCapability(role, permission)) {
      return {
        allowed: false,
        reason: `Role '${role}' lacks capability '${permission}'.`,
      };
    }

    // 3. Viewer Read-Only Invariant
    if (role === "VIEWER") {
      const isMutation =
        permission.includes(":create") ||
        permission.includes(":update") ||
        permission.includes(":delete") ||
        permission.includes(":archive") ||
        permission.includes(":assign") ||
        permission === Permission.AI_ACTION_EXECUTE;

      if (isMutation) {
        return {
          allowed: false,
          reason: "Read-only viewers cannot execute mutations.",
        };
      }
    }

    // 4. Personal Workspace Invariants
    const isPersonal = resourceContext?.isPersonalWorkspace ?? workspace.isPersonal;
    if (isPersonal) {
      if (
        permission === Permission.MEMBER_INVITE ||
        permission === Permission.MEMBER_ROLE_UPDATE ||
        permission === Permission.MEMBER_REMOVE
      ) {
        return {
          allowed: false,
          reason: "Member management is prohibited in personal workspaces.",
        };
      }
    }

    // 5. Resource Context Refinements for MEMBER role
    if (role === "MEMBER") {
      // Task Delete Refinement: Members can only delete tasks if they are creator (owner) or assignee
      if (permission === Permission.TASK_DELETE && resourceContext) {
        const userIdStr = user._id.toString();
        const createdByStr = resourceContext.createdBy?.toString();
        const assigneeStr = resourceContext.assigneeId?.toString();

        const isCreator = createdByStr === userIdStr;
        const isAssignee = assigneeStr === userIdStr;

        if (!isCreator && !isAssignee) {
          return {
            allowed: false,
            reason: "Members may only delete tasks created by or assigned to them.",
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Asserts authorization. Throws AppError (ForbiddenError or NotFoundError) if denied.
   */
  public static authorize(
    context: AuthContext,
    permission: Permission,
    resourceContext?: ResourceContext,
  ): void {
    const result = this.evaluate(context, permission, resourceContext);

    if (!result.allowed) {
      if (result.reason === "Workspace not found.") {
        throw new NotFoundError("Workspace not found.");
      }
      throw new ForbiddenError(result.reason || "Permission denied.");
    }
  }
}
