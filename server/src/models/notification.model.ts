import { Document, Model, Schema, Types, model } from "mongoose";
import { NOTIFICATION_TYPES, NotificationType } from "@/constants/notification.js";

export interface INotification {
  recipientId: Types.ObjectId;
  actorId: Types.ObjectId | null;
  type: NotificationType;
  entityType: "project" | "task" | "system" | null;
  entityId: Types.ObjectId | null;

  title: string;
  message: string;

  metadata: Record<string, unknown>;

  // dedupeKey: Guarantees idempotency for background schedulers
  dedupeKey?: string | null;

  readAt: Date | null;
  createdAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    entityType: { type: String, enum: ["project", "task", "system"], default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },

    title: { type: String, required: true },
    message: { type: String, required: true },

    metadata: { type: Schema.Types.Mixed, default: {} },

    dedupeKey: { type: String, unique: true, sparse: true },

    readAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const { _id: _, __v: __, ...safe } = ret as Record<string, unknown>;
        return safe;
      },
    },
  },
);

// Indexes
// For cursor-paginated full feed retrieval
notificationSchema.index({ recipientId: 1, _id: -1 });

// For unread counts, unread-filtered feeds, and mark-all-read operations
notificationSchema.index({ recipientId: 1, readAt: 1, _id: -1 });

const Notification: Model<INotificationDocument> = model<INotificationDocument>(
  "Notification",
  notificationSchema,
);

export default Notification;
