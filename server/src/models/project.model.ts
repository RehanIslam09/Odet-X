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
 *                   scoped to this field. Designed to be replaced / extended
 *                   with a `workspaceId` reference in a future phase without
 *                   changing existing indexes.
 *
 * - `name`        — Primary identifier displayed in the UI. Max 80 chars for
 *                   clean card layout.
 *
 * - `description` — Optional context. 1000 chars — users paste requirements.
 *
 * - `emoji`       — A single emoji character used as the project's avatar.
 *                   Stored as a plain string; no unicode validation — users
 *                   paste emojis, the browser handles rendering.
 *
 * - `color`       — Hex accent color for the project card. Validated as
 *                   /^#[0-9a-fA-F]{6}$/ in the Zod layer.
 *
 * - `archived`    — Soft-hide. Archived projects are excluded from the default
 *                   list view but remain fully queryable. The AI Agent can
 *                   reference archived project context indefinitely.
 *
 * - `isDeleted`   — Soft-delete. "Deleted" projects are invisible to the user
 *                   but retained in the database to preserve historical context
 *                   for the AI Agent, which depends on accumulated project
 *                   knowledge. Hard deletion is never performed.
 *
 * - `createdAt`   — Mongoose `timestamps` option injects this automatically.
 * - `updatedAt`   — Mongoose `timestamps` option injects this automatically.
 *
 * Fields deliberately absent at this phase:
 * - No `status` — Projects are either active or archived. Task completeness
 *   signals project completion, not a manually maintained field.
 * - No `visibility` — No workspace concept yet. `owner` is the access boundary.
 * - No AI fields — Reserved for Phase 10.
 * - No `members` — Reserved for Phase 11.
 */
export interface IProject {
  owner: Types.ObjectId;
  name: string;
  description: string;
  emoji: string;
  color: string;
  archived: boolean;
  isDeleted: boolean;
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
      // Indexed via the compound index below — not declared here.
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
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        // Remove internal MongoDB fields from serialized output.
        // Uses destructuring (not delete) for strict TypeScript compatibility.
        const { _id: _, __v: __, ...safe } = ret as Record<string, unknown>;
        void _, void __;
        return safe;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

/**
 * Primary compound index.
 *
 * Supports the dashboard query pattern:
 *   `{ owner, isDeleted, archived }` filtered, sorted by `updatedAt DESC`
 *
 * Field order matters:
 * 1. `owner` — always present (equality filter, highest cardinality reducer)
 * 2. `isDeleted` — always `false` in normal queries (equality filter)
 * 3. `archived` — often `false`, sometimes `true` (equality filter)
 * 4. `updatedAt` — range/sort field; last in the compound key so Mongo can
 *    use the index for both filtering AND sorting without a separate sort stage.
 *
 * This single index covers every realistic dashboard query without a
 * collection scan, regardless of total project count.
 */
projectSchema.index({ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

// Use `Model<IProjectDocument>` directly — no static methods needed yet.
const Project: Model<IProjectDocument> = model<IProjectDocument>(
  "Project",
  projectSchema,
);

export default Project;
