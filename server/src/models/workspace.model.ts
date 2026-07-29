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
 *
 * Field rationale:
 * - `name`       — Primary display identifier in the UI (1–80 characters).
 * - `slug`       — Unique URL-safe identifier (e.g., /w/:workspaceSlug).
 * - `ownerId`    — The creator/primary owner user who owns the workspace (immutable).
 * - `isPersonal` — Flag indicating whether this is the user's auto-provisioned
 *                  personal workspace. Uniqueness partial index guarantees at
 *                  most ONE personal workspace per owner user.
 * - `createdAt`  — Mongoose timestamps option injects this automatically.
 * - `updatedAt`  — Mongoose timestamps option injects this automatically.
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
      immutable: true,
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

/**
 * Unique partial index: Guarantees at most ONE personal workspace (`isPersonal: true`)
 * per owner user. Allows an owner user to own multiple custom workspaces (`isPersonal: false`).
 */
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
