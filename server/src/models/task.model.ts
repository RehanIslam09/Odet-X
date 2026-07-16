import { Document, Model, Schema, Types, model } from "mongoose";

import {
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_ESTIMATED_TIME_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
} from "@/constants/task.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ITask {
  owner: Types.ObjectId;
  projectId: Types.ObjectId | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  estimatedTime: string | null;
  labels: string[];
  completedAt: Date | null;
  archived: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document {}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const taskSchema = new Schema<ITaskDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_TASK_TITLE_LENGTH,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_TASK_DESCRIPTION_LENGTH,
    },

    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "todo",
      required: true,
    },

    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "none",
      required: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    estimatedTime: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_TASK_ESTIMATED_TIME_LENGTH,
    },

    labels: {
      type: [String],
      default: [],
    },

    completedAt: {
      type: Date,
      default: null,
    },

    archived: {
      type: Boolean,
      default: false,
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
    // Enable optimistic concurrency control to prevent concurrent lost updates
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id: _, __v: __, ...safe } = ret as Record<string, unknown>;
        void _, void __;
        return safe;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Middleware Hooks
// ---------------------------------------------------------------------------

/**
 * Pre-save hooks:
 * 1. Automatically manages `completedAt` state based on `status`.
 * 2. Normalizes labels by trimming whitespace, removing duplicates, and ignoring empty strings.
 */
taskSchema.pre("save", async function () {
  // 1. completedAt State Sync
  if (this.isModified("status")) {
    if (this.status === "done") {
      this.completedAt = new Date();
    } else {
      this.completedAt = null;
    }
  }

  // 2. Labels Normalization
  if (this.isModified("labels") && this.labels) {
    this.labels = Array.from(
      new Set(
        this.labels
          .map((label) => label.trim())
          .filter((label) => label.length > 0),
      ),
    );
  }
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

/**
 * Database index strategy:
 * Scoped compound keys prevent collection scans when searching, filtering, and sorting.
 *
 * `owner` and `isDeleted` are the primary filters applied to every query.
 */

// 1. Dashboard queries: filtered by owner + isDeleted + archived, sorted by updatedAt
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 });

// 2. Project views: filtered by owner + isDeleted + archived + projectId, sorted by updatedAt
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 });

// 3. Status filter views: filtered by owner + isDeleted + archived + status, sorted by updatedAt
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, status: 1, updatedAt: -1 });

// 4. Priority filter views: filtered by owner + isDeleted + archived + priority, sorted by updatedAt
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, priority: 1, updatedAt: -1 });

// 5. Due date filters/sorts: filtered by owner + isDeleted + archived, sorted/filtered by dueDate
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, dueDate: 1, updatedAt: -1 });

// 6. Support text-like queries on label lists inside task filtering
taskSchema.index({ owner: 1, isDeleted: 1, labels: 1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const Task: Model<ITaskDocument> = model<ITaskDocument>("Task", taskSchema);

export default Task;
