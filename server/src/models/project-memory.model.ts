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
 *                   Required, immutable, server-controlled.
 *
 * - `projectId`   — The project this memory belongs to.
 *                   Required, immutable, server-controlled.
 *
 * - `content`     — The stored memory text. 1–1000 characters after trimming.
 *                   Internal whitespace preserved.
 *
 * - `sourceType`  — Provenance enum. In V1, contains strictly "USER".
 *                   Required, immutable, server-controlled.
 *
 * - `createdAt`   — Injected automatically by Mongoose timestamps.
 * - `updatedAt`   — Injected automatically by Mongoose timestamps.
 * - `__v`         — Mongoose version key for Optimistic Concurrency Control (OCC).
 */
export interface IProjectMemory {
  owner: Types.ObjectId;
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

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
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
        const { _id, __v, owner: _owner, projectId: _projectId, ...safe } = ret as Record<string, unknown>;
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
 * Frozen compound index for ProjectMemory.
 *
 * Order: owner (1), projectId (1), updatedAt (-1), _id (-1)
 *
 * Supports:
 * - Strict owner isolation
 * - Strict project isolation
 * - Deterministic newest-first listing
 * - Stable _id tie-breaking for pagination and retrieval
 */
projectMemorySchema.index({ owner: 1, projectId: 1, updatedAt: -1, _id: -1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const ProjectMemory: Model<IProjectMemoryDocument> = model<IProjectMemoryDocument>(
  "ProjectMemory",
  projectMemorySchema,
);

export default ProjectMemory;
