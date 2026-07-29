import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import Workspace, { IWorkspaceDocument } from "@/models/workspace.model.js";
import WorkspaceMember from "@/models/workspace-member.model.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/utils/app-error.js";
import { asyncHandler } from "@/utils/async-handler.js";

/**
 * Middleware: Locates and attaches the target Workspace document to `req.workspace`.
 *
 * Identity sources (in priority order):
 * 1. Route parameters: `req.params.workspaceId` or `req.params.workspaceSlug`
 * 2. Request headers: `x-workspace-id` or `x-workspace-slug`
 *
 * Throws 404 NotFoundError ("Workspace not found.") if missing or non-existent.
 */
export const resolveWorkspace = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const rawIdentifier =
      req.params.workspaceId ||
      req.params.workspaceSlug ||
      (req.headers["x-workspace-id"] as string | undefined) ||
      (req.headers["x-workspace-slug"] as string | undefined);

    if (!rawIdentifier || typeof rawIdentifier !== "string" || rawIdentifier.trim().length === 0) {
      throw new NotFoundError("Workspace not found.");
    }

    const trimmed = rawIdentifier.trim();
    let workspace: IWorkspaceDocument | null = null;

    if (Types.ObjectId.isValid(trimmed)) {
      workspace = await Workspace.findById(trimmed);
    }

    if (!workspace) {
      workspace = await Workspace.findOne({ slug: trimmed.toLowerCase() });
    }

    if (!workspace) {
      throw new NotFoundError("Workspace not found.");
    }

    req.workspace = workspace;
    next();
  },
);

/**
 * Middleware: Locates and attaches target Workspace to `req.workspace` IF workspace header or route param is present.
 * Does NOT throw 404 if no workspace header/param is provided; allows controllers/services to fall back to user's default/personal workspace.
 * If header or param IS provided, verifies user is a valid WorkspaceMember of that workspace (throws 404 anti-enumeration if non-member).
 */
export const resolveOptionalWorkspace = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const rawIdentifier =
      req.params.workspaceId ||
      req.params.workspaceSlug ||
      (req.headers["x-workspace-id"] as string | undefined) ||
      (req.headers["x-workspace-slug"] as string | undefined);

    if (!rawIdentifier || typeof rawIdentifier !== "string" || rawIdentifier.trim().length === 0) {
      return next();
    }

    const trimmed = rawIdentifier.trim();
    let workspace: IWorkspaceDocument | null = null;

    if (Types.ObjectId.isValid(trimmed)) {
      workspace = await Workspace.findById(trimmed);
    }

    if (!workspace) {
      workspace = await Workspace.findOne({ slug: trimmed.toLowerCase() });
    }

    if (!workspace) {
      throw new NotFoundError("Workspace not found.");
    }

    if (req.user) {
      const member = await WorkspaceMember.findOne({
        workspaceId: workspace._id,
        userId: req.user._id,
      });

      if (!member) {
        throw new NotFoundError("Workspace not found.");
      }

      req.workspaceMember = member;
    }

    req.workspace = workspace;
    next();
  },
);

/**
 * Middleware: Verifies that the authenticated user is an active member of `req.workspace`.
 */
export const requireWorkspaceMember = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required.");
    }

    if (!req.workspace) {
      await resolveWorkspace(req, res, async () => {});
    }

    if (!req.workspace) {
      throw new NotFoundError("Workspace not found.");
    }

    const member = await WorkspaceMember.findOne({
      workspaceId: req.workspace._id,
      userId: req.user._id,
    });

    if (!member) {
      throw new NotFoundError("Workspace not found.");
    }

    req.workspaceMember = member;
    next();
  },
);

/**
 * Middleware: Verifies that the authenticated member has the "OWNER" role in `req.workspace`.
 */
export const requireWorkspaceOwner = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.workspaceMember) {
      await requireWorkspaceMember(req, res, async () => {});
    }

    if (!req.workspaceMember) {
      throw new NotFoundError("Workspace not found.");
    }

    if (req.workspaceMember.role !== "OWNER") {
      throw new ForbiddenError("Workspace owner permission required.");
    }

    next();
  },
);
