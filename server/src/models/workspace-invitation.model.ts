import { Document, Model, Schema, Types, model } from "mongoose";
import { WORKSPACE_ROLES, WorkspaceRole } from "@/constants/workspace.js";

export const WORKSPACE_INVITATION_STATUSES = ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const;
export type WorkspaceInvitationStatus = (typeof WORKSPACE_INVITATION_STATUSES)[number];

export interface IWorkspaceInvitation {
  workspaceId: Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  invitedBy: Types.ObjectId;
  token: string;
  status: WorkspaceInvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
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
      trim: true,
      lowercase: true,
    },

    role: {
      type: String,
      enum: WORKSPACE_ROLES,
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
    },

    status: {
      type: String,
      enum: WORKSPACE_INVITATION_STATUSES,
      default: "PENDING",
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
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

workspaceInvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });
workspaceInvitationSchema.index({ expiresAt: 1, status: 1 });

const WorkspaceInvitation: Model<IWorkspaceInvitationDocument> = model<IWorkspaceInvitationDocument>(
  "WorkspaceInvitation",
  workspaceInvitationSchema,
);

export default WorkspaceInvitation;
