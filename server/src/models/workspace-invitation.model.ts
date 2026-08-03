import { Document, Model, Schema, Types, model } from "mongoose";
import { WORKSPACE_ROLES, WorkspaceRole } from "@/constants/workspace.js";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface IWorkspaceInvitation {
  workspaceId: Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  invitedBy: Types.ObjectId;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceInvitationDocument extends IWorkspaceInvitation, Document {}

const workspaceInvitationSchema = new Schema<IWorkspaceInvitationDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      default: "MEMBER",
      required: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"],
      default: "PENDING",
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

// Compound index for fast lookup of pending invites per workspace & email
workspaceInvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

const WorkspaceInvitation: Model<IWorkspaceInvitationDocument> =
  model<IWorkspaceInvitationDocument>("WorkspaceInvitation", workspaceInvitationSchema);

export default WorkspaceInvitation;
