import { Document, Model, Schema, Types, model } from "mongoose";

export interface IMilestone {
  owner: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description: string;
  targetDate: Date | null;
  position: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMilestoneDocument extends IMilestone, Document {}

const milestoneSchema = new Schema<IMilestoneDocument>(
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
    title: {
      type: String,
      required: true,
      trim: true,
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
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer position.",
      },
    },
    isDeleted: {
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
        const { _id: _, __v, ...safe } = ret as Record<string, unknown>;
        return { ...safe, version: __v };
      },
    },
  }
);

// Legacy owner index
milestoneSchema.index({ owner: 1, projectId: 1, isDeleted: 1, position: 1 });

// Phase 32 Workspace multi-tenant index
milestoneSchema.index({ workspaceId: 1, projectId: 1, isDeleted: 1, position: 1 });

const Milestone: Model<IMilestoneDocument> = model<IMilestoneDocument>("Milestone", milestoneSchema);

export default Milestone;
