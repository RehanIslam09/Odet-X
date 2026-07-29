import { Document, Model, Schema, Types, model } from "mongoose";

import { WORKSPACE_ROLES, WorkspaceRole } from "@/constants/workspace.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Canonical shape of a WorkspaceMember document in MongoDB.
 *
 * Field rationale:
 * - `workspaceId` — The workspace this membership belongs to.
 * - `userId`      — The user who holds this membership.
 * - `role`        — Phase 32 minimal membership role ("OWNER" | "MEMBER").
 * - `joinedAt`    — Timestamp when the user joined or was added to the workspace.
 * - `createdAt`   — Mongoose timestamps option injects this automatically.
 * - `updatedAt`   — Mongoose timestamps option injects this automatically.
 */
export interface IWorkspaceMember {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceMemberDocument extends IWorkspaceMember, Document {}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const workspaceMemberSchema = new Schema<IWorkspaceMemberDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      default: "MEMBER",
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id, __v, ...safe } = ret as Record<string, unknown>;
        return {
          id: typeof _id === "object" && _id !== null ? _id.toString() : String(_id),
          ...safe,
          version: typeof __v === "number" ? __v : 0,
        };
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

/**
 * Unique index 1: Guarantees a user cannot hold duplicate memberships in the same workspace.
 */
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

/**
 * Lookup index 2: Fast user-first workspace listing query support (`find({ userId })`).
 */
workspaceMemberSchema.index({ userId: 1, workspaceId: 1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const WorkspaceMember: Model<IWorkspaceMemberDocument> = model<IWorkspaceMemberDocument>(
  "WorkspaceMember",
  workspaceMemberSchema,
);

export default WorkspaceMember;
