---
title: "MongoDB Schema & Database Architecture"
description: "Authoritative specification for MongoDB schemas, compound indexes, soft-delete mechanics, and optimistic concurrency locking."
status: "active"
owner: "Database Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 4"
related_documents:
  - "docs/architecture.md"
  - "docs/architecture/backend-architecture.md"
  - "docs/api/rest-api-reference.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [Architecture](README.md) > Database Design

# MongoDB Schema & Database Architecture

This document defines the database design, collection schemas, indexes, soft-delete/archive mechanics, and optimistic concurrency controls enforced across the **AI Project Manager** MongoDB database.

---

## 📋 Table of Contents
1. [Mongoose Models Overview](#1-mongoose-models-overview)
2. [Schema Specifications & Indexes](#2-schema-specifications--indexes)
3. [Core Database Design Mechanics](#3-core-database-design-mechanics)

---

## 1. Mongoose Models Overview

The database contains 5 core Mongoose models:

```
┌──────────────┐        1:N         ┌─────────────────┐
│     User     ├───────────────────►│     Project     │
└──────┬───────┘                    └────────┬────────┘
       │                                     │
       │ 1:N                                 │ 1:N
       ▼                                     ▼
┌──────────────┐                    ┌─────────────────┐
│ Notification │                    │      Task       │
└──────────────┘                    └────────┬────────┘
                                             │
                                             │ 1:N
                                             ▼
                                    ┌─────────────────┐
                                    │    Activity     │
                                    └─────────────────┘
```

---

## 2. Schema Specifications & Indexes

### A. User Model (`server/src/models/user.model.ts`)
- **Fields**:
  - `name`: String (2–50 chars, required)
  - `email`: String (lowercase, unique, indexed, required)
  - `username`: String (lowercase, unique, indexed, required)
  - `password`: String (bcrypt hash, `select: false`, required)
  - `avatar`: String (default: `""`)
  - `bio`: String (max 500 chars)
  - `refreshTokenHash`: String (SHA-256 hash, `select: false`, default: `null`)
  - `isEmailVerified`: Boolean (default: `false`)
  - `isActive`: Boolean (default: `true`)
  - `preferences`: Nested object (`appearance`, `locale`, `notifications`)
- **Indexes**:
  - `{ email: 1 }` (unique)
  - `{ username: 1 }` (unique)

### B. Project Model (`server/src/models/project.model.ts`)
- **Fields**:
  - `owner`: ObjectId (ref: `User`, indexed, required)
  - `name`: String (trim, 1–100 chars, required)
  - `description`: String (max 500 chars, default: `""`)
  - `emoji`: String (default: `"📁"`)
  - `color`: String (hex code, default: `"#6366f1"`)
  - `status`: String (`active`, `completed`, `on_hold`, default: `active`)
  - `visibility`: String (`private`, `workspace`, default: `private`)
  - `archived`: Boolean (indexed, default: `false`)
  - `isDeleted`: Boolean (indexed, default: `false`)
  - `aiSummary`: Nested object (status summary, highlights, risks, generatedAt)
- **Indexes**:
  - `{ owner: 1, archived: 1, isDeleted: 1 }` (Primary dashboard list index)

### C. Task Model (`server/src/models/task.model.ts`)
- **Fields**:
  - `owner`: ObjectId (ref: `User`, indexed, required)
  - `projectId`: ObjectId (ref: `Project`, indexed, nullable)
  - `title`: String (trim, 1–150 chars, required)
  - `description`: String (max 2,000 chars, default: `""`)
  - `notes`: String (max 250,000 chars Markdown notes, default: `""`, `select: false`)
  - `status`: String (`todo`, `in_progress`, `done`, `cancelled`, default: `todo`)
  - `priority`: String (`low`, `medium`, `high`, `urgent`, default: `medium`)
  - `dueDate`: Date (nullable, indexed)
  - `completedAt`: Date (nullable, auto-managed by status hook)
  - `estimatedTime`: String (max 50 chars, default: `""`)
  - `labels`: Array of Strings (max 10 items)
  - `archived`: Boolean (indexed, default: `false`)
  - `isDeleted`: Boolean (indexed, default: `false`)
  - `__v`: Number (Mongoose version key, used for optimistic concurrency)
- **Indexes**:
  - `{ owner: 1, projectId: 1, archived: 1, isDeleted: 1 }`
  - `{ owner: 1, dueDate: 1, status: 1 }`

### D. Activity Model (`server/src/models/activity.model.ts`)
- **Fields**:
  - `owner`: ObjectId (ref: `User`, indexed, required)
  - `actorId`: ObjectId (ref: `User`, required)
  - `type`: String (enum of `ACTIVITY_TYPES`, required)
  - `entityType`: String (`project`, `task`, required)
  - `entityId`: ObjectId (required)
  - `metadata`: Schema.Types.Mixed
  - `createdAt`: Date (immutable timestamp)
- **Indexes**:
  - `{ owner: 1, _id: -1 }` (Cursor pagination index)
  - `{ owner: 1, entityId: 1, _id: -1 }` (Entity timeline index)

### E. Notification Model (`server/src/models/notification.model.ts`)
- **Fields**:
  - `recipientId`: ObjectId (ref: `User`, indexed, required)
  - `actorId`: ObjectId (ref: `User`, nullable)
  - `type`: String (enum of `NOTIFICATION_TYPES`, required)
  - `title`: String (required)
  - `message`: String (required)
  - `readAt`: Date (default: `null`)
  - `dedupeKey`: String (indexed, unique, sparse, nullable)
  - `metadata`: Schema.Types.Mixed
- **Indexes**:
  - `{ recipientId: 1, _id: -1 }` (Feed retrieval)
  - `{ recipientId: 1, readAt: 1 }` (Unread count aggregation)
  - `{ dedupeKey: 1 }` (Unique sparse index for worker idempotency)

---

## 3. Core Database Design Mechanics

### Soft-Delete (`isDeleted`) vs Archiving (`archived`)
- **Soft-Delete (`isDeleted: true`)**: Hides entities from user views and lists while preserving historical data integrity for audit timelines and AI context recovery.
- **Archiving (`archived: true`)**: Removes entities from active workspace listings while keeping them accessible in dedicated "Archived" view filters.

### Optimistic Concurrency Control (`__v`)
- `Task.notes` updates (`PATCH /api/v1/tasks/:id/notes`) enforce version checking. The query condition combines `_id`, `owner`, and `__v: expectedVersion` in an atomic `findOneAndUpdate` call. Concurrent edits trigger a `409 Conflict` error.

### Worker Idempotency (`dedupeKey`)
- The background cron worker calculates a deterministic `dedupeKey` (e.g. `task:<id>:due_soon:<timestamp>`) before inserting reminder notifications. The unique sparse index on `dedupeKey` prevents duplicate notifications across concurrent worker executions.
