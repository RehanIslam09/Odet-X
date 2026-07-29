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
  workspaceId?: Types.ObjectId;
  projectId: Types.ObjectId | null;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  estimatedTime: string | null;
  labels: string[];
  dependencies: Types.ObjectId[];
  position: number;
  milestoneId: Types.ObjectId | null;
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

    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: false,
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

    notes: {
      type: String,
      default: "",
      maxlength: 250000,
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

    dependencies: {
      type: [Schema.Types.ObjectId],
      ref: "Task",
      default: [],
    },

    position: {
      type: Number,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer position.",
      },
    },

    milestoneId: {
      type: Schema.Types.ObjectId,
      ref: "Milestone",
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
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id: _, __v, ...safe } = ret as Record<string, unknown>;
        return { ...safe, version: __v };
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Middleware Hooks
// ---------------------------------------------------------------------------

taskSchema.pre("save", async function () {
  if (this.isModified("status")) {
    if (this.status === "done") {
      this.completedAt = new Date();
    } else {
      this.completedAt = null;
    }
  }

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

// Legacy owner compound indexes
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 });
taskSchema.index({ owner: 1, dependencies: 1 });
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 });
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, status: 1, updatedAt: -1 });
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, priority: 1, updatedAt: -1 });
taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, dueDate: 1, updatedAt: -1 });
taskSchema.index({ owner: 1, isDeleted: 1, labels: 1 });

// Phase 32 Workspace multi-tenant compound indexes
taskSchema.index({ workspaceId: 1, isDeleted: 1, archived: 1, updatedAt: -1 });
taskSchema.index({ workspaceId: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 });
taskSchema.index({ workspaceId: 1, dependencies: 1 });

// Global scheduler index
taskSchema.index({ isDeleted: 1, archived: 1, status: 1, dueDate: 1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const Task: Model<ITaskDocument> = model<ITaskDocument>("Task", taskSchema);

export default Task;
