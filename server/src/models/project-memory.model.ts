import { Document, Model, Schema, Types, model } from "mongoose";

import {
  MAX_MEMORY_CONTENT_LENGTH,
  MEMORY_SOURCE_TYPES,
  MemorySourceType,
} from "@/constants/project-memory.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Canonical shape of a ProjectMemory document in MongoDB.
 *
 * Field rationale:
 *
 * - `owner`       — The authenticated user who created/owns this memory.
 * - `workspaceId` — The tenant workspace boundary key. Inherited from parent Project.
 * - `projectId`   — The project this memory belongs to.
 * - `content`     — The stored memory text.
 * - `sourceType`  — Provenance enum ("USER").
 * - `createdAt`   — Injected automatically by Mongoose timestamps.
 * - `updatedAt`   — Injected automatically by Mongoose timestamps.
 */
export interface IProjectMemory {
  owner: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  projectId: Types.ObjectId;
  content: string;
  sourceType: MemorySourceType;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface IProjectMemoryDocument extends IProjectMemory, Document {}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const projectMemorySchema = new Schema<IProjectMemoryDocument>(
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

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_MEMORY_CONTENT_LENGTH,
    },

    sourceType: {
      type: String,
      enum: MEMORY_SOURCE_TYPES,
      default: "USER",
      required: true,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id: _, __v, ...safe } = ret as Record<string, unknown>;
        return { ...safe, version: typeof __v === "number" ? __v : 0 };
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
projectMemorySchema.index({ owner: 1, projectId: 1, updatedAt: -1, _id: -1 });

/**
 * Phase 32 Workspace multi-tenant compound index.
 */
projectMemorySchema.index({ workspaceId: 1, projectId: 1, updatedAt: -1, _id: -1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const ProjectMemory: Model<IProjectMemoryDocument> = model<IProjectMemoryDocument>(
  "ProjectMemory",
  projectMemorySchema,
);

export default ProjectMemory;
