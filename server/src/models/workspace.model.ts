import { Document, Model, Schema, Types, model } from "mongoose";

import {
  MAX_WORKSPACE_NAME_LENGTH,
  MAX_WORKSPACE_SLUG_LENGTH,
  MIN_WORKSPACE_NAME_LENGTH,
  MIN_WORKSPACE_SLUG_LENGTH,
  WORKSPACE_SLUG_REGEX,
} from "@/constants/workspace.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Canonical shape of a Workspace document in MongoDB.
 */
export interface IWorkspace {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  isPersonal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceDocument extends IWorkspace, Document {}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const workspaceSchema = new Schema<IWorkspaceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: MIN_WORKSPACE_NAME_LENGTH,
      maxlength: MAX_WORKSPACE_NAME_LENGTH,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: MIN_WORKSPACE_SLUG_LENGTH,
      maxlength: MAX_WORKSPACE_SLUG_LENGTH,
      validate: {
        validator: (v: string) => WORKSPACE_SLUG_REGEX.test(v),
        message: "{VALUE} is not a valid URL-safe workspace slug.",
      },
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isPersonal: {
      type: Boolean,
      default: false,
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

workspaceSchema.index({ slug: 1 }, { unique: true });

workspaceSchema.index(
  { ownerId: 1, isPersonal: 1 },
  {
    unique: true,
    partialFilterExpression: { isPersonal: true },
  },
);

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const Workspace: Model<IWorkspaceDocument> = model<IWorkspaceDocument>(
  "Workspace",
  workspaceSchema,
);

export default Workspace;
