import { Document, Model, Schema, Types, model } from "mongoose";
import { ACTIVITY_TYPES, ActivityType } from "@/constants/activity.js";

export interface IActivity {
  owner: Types.ObjectId;
  actorId: Types.ObjectId;
  type: ActivityType;
  entityType: "project" | "task";
  entityId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  taskId?: Types.ObjectId | null;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface IActivityDocument extends IActivity, Document {}

const activitySchema = new Schema<IActivityDocument>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(ACTIVITY_TYPES), required: true },
    entityType: { type: String, enum: ["project", "task"], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Activities are append-only
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

// Indexes
// Dashboard activity feed
activitySchema.index({ owner: 1, _id: -1 });
// Project activity feed
activitySchema.index({ owner: 1, projectId: 1, _id: -1 });
// Task activity feed
activitySchema.index({ owner: 1, taskId: 1, _id: -1 });

const Activity: Model<IActivityDocument> = model<IActivityDocument>("Activity", activitySchema);

export default Activity;
