import { Document, Model, Schema, Types, model } from "mongoose";
import {
  PLAN_DRAFT_STATUSES,
  PLAN_MAX_PROMPT_LENGTH,
  PLAN_MAX_TASKS,
  PLAN_MAX_MILESTONES,
  PlanDraftStatus,
} from "@/constants/planning.js";
import { TASK_PRIORITIES, TaskPriority } from "@/constants/task.js";

export interface IPlanDraftTask {
  tempId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  estimatedTime: string | null;
  position: number;
  dependencies: string[];
  milestoneTempId: string | null;
}

export interface IPlanDraftMilestone {
  tempId: string;
  title: string;
  description: string;
  targetDate: Date | null;
  position: number;
}

export interface IPlanDraft {
  owner: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  projectId: Types.ObjectId;
  status: PlanDraftStatus;
  promptDescription: string;
  tasks: IPlanDraftTask[];
  milestones: IPlanDraftMilestone[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanDraftDocument extends IPlanDraft, Document {}

const planDraftTaskSchema = new Schema<IPlanDraftTask>(
  {
    tempId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "none",
      required: true,
    },
    estimatedTime: {
      type: String,
      default: null,
      trim: true,
      maxlength: 50,
    },
    position: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer position.",
      },
    },
    dependencies: {
      type: [String],
      default: [],
    },
    milestoneTempId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const planDraftMilestoneSchema = new Schema<IPlanDraftMilestone>(
  {
    tempId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    position: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer position.",
      },
    },
  },
  { _id: false }
);

const planDraftSchema = new Schema<IPlanDraftDocument>(
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
    status: {
      type: String,
      enum: PLAN_DRAFT_STATUSES,
      default: "draft",
      required: true,
    },
    promptDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: PLAN_MAX_PROMPT_LENGTH,
    },
    tasks: {
      type: [planDraftTaskSchema],
      default: [],
      validate: [
        {
          validator: function (val: IPlanDraftTask[]) {
            return val.length <= PLAN_MAX_TASKS;
          },
          message: `Plan task count cannot exceed ${PLAN_MAX_TASKS}.`,
        },
      ],
    },
    milestones: {
      type: [planDraftMilestoneSchema],
      default: [],
      validate: [
        {
          validator: function (val: IPlanDraftMilestone[]) {
            return val.length <= PLAN_MAX_MILESTONES;
          },
          message: `Plan milestone count cannot exceed ${PLAN_MAX_MILESTONES}.`,
        },
      ],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id: _, __v, ...safe } = ret as Record<string, unknown>;
        return { ...safe, version: __v };
      },
    },
  }
);

// TTL Index: Automatically expire drafts based on expiresAt date
planDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Legacy owner indexes
planDraftSchema.index({ owner: 1, projectId: 1, status: 1 });
planDraftSchema.index(
  { owner: 1, projectId: 1 },
  { unique: true, partialFilterExpression: { status: "draft" } }
);

// Phase 32 Workspace multi-tenant indexes
planDraftSchema.index({ workspaceId: 1, projectId: 1, status: 1 });
planDraftSchema.index(
  { workspaceId: 1, projectId: 1 },
  { unique: true, partialFilterExpression: { status: "draft" } }
);

const PlanDraft: Model<IPlanDraftDocument> = model<IPlanDraftDocument>("PlanDraft", planDraftSchema);

export default PlanDraft;
