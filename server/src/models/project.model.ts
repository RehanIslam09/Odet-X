import { Document, Model, Schema, Types, model } from "mongoose";

import {
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
} from "@/constants/project.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Canonical shape of a Project document in MongoDB.
 *
 * Field rationale:
 *
 * - `owner`       — The user who created the project. Every query must be
 *                   scoped to this field for creator attribution.
 *
 * - `workspaceId` — The tenant workspace boundary key. Newly created/updated
 *                   projects reference `Workspace`. Optional in Stage A for legacy
 *                   compatibility prior to full backfill enforcement.
 *
 * - `name`        — Primary identifier displayed in the UI. Max 80 chars for
 *                   clean card layout.
 *
 * - `description` — Optional context. 1000 chars — users paste requirements.
 *
 * - `emoji`       — A single emoji character used as the project's avatar.
 *
 * - `color`       — Hex accent color for the project card.
 *
 * - `archived`    — Soft-hide. Archived projects are excluded from default views.
 *
 * - `isDeleted`   — Soft-delete. "Deleted" projects are invisible to the user.
 *
 * - `createdAt`   — Mongoose `timestamps` option injects this automatically.
 * - `updatedAt`   — Mongoose `timestamps` option injects this automatically.
 */
export interface IProject {
  owner: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  name: string;
  description: string;
  emoji: string;
  color: string;
  archived: boolean;
  isDeleted: boolean;
  aiSummary?: {
    summary: string;
    highlights: string[];
    risks: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDocument extends IProject, Document {}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const projectSchema = new Schema<IProjectDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: false,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_PROJECT_NAME_LENGTH,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_PROJECT_DESCRIPTION_LENGTH,
    },

    emoji: {
      type: String,
      default: "📁",
    },

    color: {
      type: String,
      default: "#6366f1",
    },

    archived: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    aiSummary: {
      type: {
        summary: { type: String, required: true },
        highlights: { type: [String], default: [] },
        risks: { type: [String], default: [] }
      },
      required: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id: _, __v: __, ...safe } = ret as Record<string, unknown>;
        return safe;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

/**
 * Legacy owner compound index.
 */
projectSchema.index({ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 });

/**
 * Phase 32 Workspace multi-tenant compound index.
 */
projectSchema.index({ workspaceId: 1, isDeleted: 1, archived: 1, updatedAt: -1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const Project: Model<IProjectDocument> = model<IProjectDocument>(
  "Project",
  projectSchema,
);

export default Project;
