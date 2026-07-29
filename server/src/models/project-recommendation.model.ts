import { Document, Model, Schema, Types, model } from "mongoose";

import {
  MAX_RECOMMENDATION_EXPLANATION_LENGTH,
  MAX_RECOMMENDATION_RELATED_ENTITIES,
  MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
  MAX_RECOMMENDATION_TITLE_LENGTH,
  PROJECT_RECOMMENDATION_SEVERITIES,
  PROJECT_RECOMMENDATION_STATUSES,
  PROJECT_SIGNAL_TYPES,
  RELATED_ENTITY_TYPES,
  ProjectRecommendationSeverity,
  ProjectRecommendationStatus,
  ProjectSignalType,
  RelatedEntityRef,
} from "@/constants/proactive-intelligence.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IProjectRecommendation {
  owner: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  projectId: Types.ObjectId;
  type: ProjectSignalType;
  severity: ProjectRecommendationSeverity;

  title: string;
  explanation: string;
  suggestedNextStep?: string | null;

  facts: Record<string, unknown>;
  relatedEntities: RelatedEntityRef[];

  fingerprint: string;

  claimToken?: string | null;
  claimedAt?: Date | null;

  status: ProjectRecommendationStatus;
  dismissedAt?: Date | null;
  actedOnAt?: Date | null;
  expiresAt?: Date | null;
  purgeAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface IProjectRecommendationDocument extends IProjectRecommendation, Document {}

// ---------------------------------------------------------------------------
// Embedded Related Entity Schema
// ---------------------------------------------------------------------------

const relatedEntitySchema = new Schema<RelatedEntityRef>(
  {
    type: {
      type: String,
      enum: RELATED_ENTITY_TYPES,
      required: true,
    },
    id: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Main Schema
// ---------------------------------------------------------------------------

const projectRecommendationSchema = new Schema<IProjectRecommendationDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
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
      immutable: true,
    },

    type: {
      type: String,
      enum: PROJECT_SIGNAL_TYPES,
      required: true,
      immutable: true,
    },

    severity: {
      type: String,
      enum: PROJECT_RECOMMENDATION_SEVERITIES,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_RECOMMENDATION_TITLE_LENGTH,
    },

    explanation: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_RECOMMENDATION_EXPLANATION_LENGTH,
    },

    suggestedNextStep: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
    },

    facts: {
      type: Schema.Types.Mixed,
      default: {},
    },

    relatedEntities: {
      type: [relatedEntitySchema],
      default: [],
      validate: [
        {
          validator: function (val: RelatedEntityRef[]) {
            return Array.isArray(val) && val.length <= MAX_RECOMMENDATION_RELATED_ENTITIES;
          },
          message: `Related entities count cannot exceed ${MAX_RECOMMENDATION_RELATED_ENTITIES}.`,
        },
      ],
    },

    fingerprint: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },

    claimToken: {
      type: String,
      default: null,
      trim: true,
    },

    claimedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: PROJECT_RECOMMENDATION_STATUSES,
      default: "PENDING_ENRICHMENT",
      required: true,
    },

    dismissedAt: {
      type: Date,
      default: null,
    },

    actedOnAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    purgeAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const {
          _id,
          __v,
          owner: _owner,
          projectId: rawProjectId,
          claimToken: _claimToken,
          claimedAt: _claimedAt,
          purgeAt: _purgeAt,
          ...safe
        } = ret as Record<string, unknown>;

        return {
          id: typeof _id === "object" && _id !== null ? _id.toString() : String(_id),
          projectId: typeof rawProjectId === "object" && rawProjectId !== null ? rawProjectId.toString() : String(rawProjectId),
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

// Legacy owner indexes
projectRecommendationSchema.index({ owner: 1, projectId: 1, status: 1, createdAt: -1 });
projectRecommendationSchema.index({ owner: 1, status: 1, createdAt: -1 });
projectRecommendationSchema.index(
  { projectId: 1, fingerprint: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["ACTIVE", "PENDING_ENRICHMENT"] },
    },
  },
);
projectRecommendationSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

// Phase 32 Workspace multi-tenant compound indexes
projectRecommendationSchema.index({ workspaceId: 1, projectId: 1, status: 1, createdAt: -1 });
projectRecommendationSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const ProjectRecommendation: Model<IProjectRecommendationDocument> = model<IProjectRecommendationDocument>(
  "ProjectRecommendation",
  projectRecommendationSchema,
);

export default ProjectRecommendation;
