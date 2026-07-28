# Phase 30 — Proactive Project Intelligence
## Gate 1B — Canonical Architecture Contract (Revised)

> **Phase**: Phase 30 — Proactive Project Intelligence  
> **Gate**: Gate 1B — Architecture Contract (Revised)  
> **Status**: FROZEN / APPROVED FOR IMPLEMENTATION  
> **Author**: Senior Staff Software Architect & AI Platform Architect  
> **Branch**: `feat/phase-30-proactive-intelligence`  
> **Environment**: Node v20.20.2 | NPM 10.8.2 | Linux WSL (Ubuntu)  

---

### 1. Executive Summary & Core Product Contract

This document forms the **Canonical Architecture Contract** for **Phase 30 — Proactive Project Intelligence** of Odet-X / AI Project Manager.

Up to Phase 29, Odet-X operates as a purely reactive application (User requests $\rightarrow$ AI responds). Phase 30 introduces **proactive intelligence**, enabling the system to background-scan project state, deterministically detect meaningful conditions, invoke AI reasoning *only when justified*, generate grounded recommendations, and present them for user review.

#### 1.1 High-Level Processing Funnel

```text
                        ALL PROJECTS IN DATABASE
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  Candidate Project Selection                     │
          │  Filter: { isDeleted: false, archived: false }   │
          └──────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  Deterministic Signal Engine                     │
          │  Pure domain calculations over DB state           │
          └──────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  SHA-256 Signal Fingerprint & Deduplication      │
          │  Atomic Claim (status: PENDING_ENRICHMENT)       │
          └──────────────────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
        Claim Collision / Active              Claim Granted
                   │                               │
                   ▼                               ▼
            [SKIP AI CALL]               ┌───────────────────┐
                                         │  AI Enrichment    │
                                         │  (FAST_JSON Tier) │
                                         └───────────────────┘
                                                   │
                                                   ▼
                                         ┌───────────────────┐
                                         │ Atomic Finalize   │
                                         │ Verify ClaimToken │
                                         │ (Set ACTIVE)      │
                                         └───────────────────┘
                                                   │
                                                   ▼
                                         ┌───────────────────┐
                                         │  User Review      │
                                         │  (Dashboard / UI) │
                                         └───────────────────┘
                                                   │
                                                   ▼
                                         ┌───────────────────┐
                                         │  Phase 28 Action  │
                                         │  (Human Confirm)  │
                                         └───────────────────┘
```

#### 1.2 Non-Negotiable System Boundary

Phase 30 owns: **DETECTION**, **ANALYSIS**, and **RECOMMENDATION**.  
Phase 30 does **NOT** own: **AUTONOMOUS EXECUTION**.

Any action resulting from a proactive recommendation MUST route through the existing Phase 28 Controlled Action pipeline ([server/src/ai/actions/action.executor.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/actions/action.executor.ts)), requiring explicit human confirmation.

---

### 2. Frozen Architectural Invariants vs. V1 Policy Constants

To ensure architectural clarity, policy thresholds are strictly separated from non-negotiable architectural invariants.

#### 2.1 Frozen Architectural Invariants (Non-Negotiable)

1. **Zero Autonomous Mutation Authority:** Recommendations are purely advisory, read-only entities containing ZERO signing tokens, ZERO nonces, and ZERO executable credentials.
2. **Deterministic-First Signal Detection:** No AI call may be used to determine whether a signal exists. Signals are detected 100% deterministically from structured database state before any LLM call.
3. **Pre-AI Deduplication & Atomic Claiming:** A SHA-256 fingerprint check and database atomic claim (`status: "PENDING_ENRICHMENT"`, `claimToken: randomUUID()`) MUST occur BEFORE calling `AIService`. Duplicate signals bypass AI calls entirely.
4. **Ownership-Verified Finalization:** Finalizing an enrichment (setting `status: "ACTIVE"`) MUST conditionally verify matching `_id`, `status: "PENDING_ENRICHMENT"`, and `claimToken`. Stolen or lost claims MUST discard AI outputs.
5. **Separation of Logical Expiration from Physical Purge:** `expiresAt` controls application lifecycle state (`ACTIVE` $\rightarrow$ `EXPIRED`/`DISMISSED`); `purgeAt` controls physical MongoDB TTL cleanup (`expireAfterSeconds: 0`). Physical TTL deletion MUST NEVER act as the transition mechanism for lifecycle states.
6. **Hard Worker Execution Rate Caps:** Background scanning MUST operate under strict hard bounds per scan cycle (max candidate projects, max AI calls).
7. **Strict Tenant Scoping Parity:** All background database queries MUST explicitly enforce `owner: candidateProject.owner` parity.
8. **Exclusion of Project Memory from Proactive Intelligence v1:** Project Memory is strictly excluded from signal detection and AI context in v1 to minimize token cost, avoid untrusted prompt injection, and preserve deterministic evaluation.
9. **100% Offline CI & Testing:** Standard CI and `npm run verify` MUST execute 0 live provider calls.

#### 2.2 V1 Policy Constants (Centralized in `server/src/constants/proactive-intelligence.ts`)

Policy constants are default values for v1. Changing a policy constant does NOT alter system architecture.

```ts
/** Policy constants for Phase 30 Proactive Intelligence (V1 Defaults) */
export const PROACTIVE_STALLED_THRESHOLD_DAYS = 7;
export const PROACTIVE_MILESTONE_RISK_WINDOW_DAYS = 7;
export const PROACTIVE_BOTTLENECK_THRESHOLD_TASKS = 3;

/** Lifecycle Timestamps & Retention Windows */
export const PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS = 14;
export const PROACTIVE_DISMISSED_COOLDOWN_DAYS = 7;
export const PROACTIVE_RETENTION_PURGE_DAYS = 30; // retention policy for physical deletion

/** Worker Safety & Concurrency Bounds */
export const PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN = 50;
export const PROACTIVE_MAX_AI_CALLS_PER_RUN = 10;
export const PROACTIVE_MAX_AI_CALLS_PER_USER_DAY = 20;
export const PROACTIVE_AI_TIMEOUT_MS = 15000;

/** Atomic Lease Duration: Must safely exceed max provider execution budget (15,000ms) */
export const PROACTIVE_CLAIM_LEASE_MS = 30000; // 30 seconds
```

---

### 3. Canonical Terminology

- **Candidate Project:** An active, non-deleted, non-archived project (`isDeleted: false, archived: false`) evaluated during a worker scan cycle.
- **Signal:** A structured, non-AI domain condition detected by deterministic logic operating over database entities.
- **Signal Detector:** A pure, deterministic domain function that inspects project state and returns 0 or more `ProjectSignal` objects.
- **Structured Fact:** A key-value payload of empirical facts (counts, dates, IDs, titles) computed deterministically by a signal detector.
- **Signal Fingerprint:** A reproducible SHA-256 hash derived exclusively from deterministic signal attributes (`type`, `projectId`, sorted `relatedEntityIds`, `factDigest`).
- **ProjectRecommendation:** A persisted document in MongoDB representing a proactive recommendation presented to the user.
- **Claim Token:** A cryptographically random UUID assigned to an in-flight `PENDING_ENRICHMENT` document to establish exclusive worker lease ownership.
- **AI Enrichment:** Natural-language explanation and guidance text generated by `AIService` from a deterministic `ProjectSignal`.
- **Recommendation Status:** Lifecycle state: `PENDING_ENRICHMENT` | `ACTIVE` | `DISMISSED` | `ACTED_ON` | `EXPIRED`.
- **`expiresAt`:** Application lifecycle timestamp determining when a recommendation transitions out of `ACTIVE` status or completes its cooldown.
- **`purgeAt`:** Physical MongoDB TTL cleanup timestamp (`expireAfterSeconds: 0`) after which the record is physically deleted.
- **Related Entity:** A reference object (`type`: `"task"` | `"milestone"` | `"project"`, `id`: ObjectId string, `label`: string) attached to a signal or recommendation.
- **Scan Cycle:** A single periodic execution of the proactive intelligence worker job scanning eligible candidate projects.

---

### 4. Phase 30 V1 Signal Set (4 Signals)

Phase 30 v1 explicitly freezes **4 high-confidence deterministic signal types**:

#### 4.1 `OVERDUE_HIGH_PRIORITY_TASKS`
- **Eligibility:** Task has `isDeleted: false`, `archived: false`, `status NOT IN ['done', 'cancelled']`, `priority IN ['high', 'urgent']`, and `dueDate < now`.
- **Facts:** `{ overdueCount: number, urgentCount: number, highCount: number, oldestDueDate: string }`.
- **Severity Derivation:** `CRITICAL` if any overdue task has `priority: "urgent"`; `HIGH` otherwise.
- **Related Entities:** Overdue high/urgent task references.
- **Fingerprint Inputs:** `sha256("OVERDUE_HIGH_PRIORITY_TASKS:" + projectId + ":" + sortedTaskIds.join(","))`
- **Resolution Condition:** All high/urgent overdue tasks marked `done`/`cancelled` or due dates extended to future.

#### 4.2 `MILESTONE_AT_RISK`
- **Eligibility:** Milestone has `isDeleted: false`, `targetDate != null`, `targetDate <= now + 7 days` (or passed), having attached tasks (`milestoneId = ms._id`) where `status NOT IN ['done', 'cancelled']`.
- **Facts:** `{ milestoneTitle: string, targetDate: string, totalAttachedTasks: number, incompleteTasksCount: number, overdueTasksCount: number }`.
- **Severity Derivation:** `CRITICAL` if `targetDate < now` and incomplete tasks exist; `HIGH` if `targetDate <= now + 3 days`; `MEDIUM` otherwise.
- **Related Entities:** Milestone reference + incomplete attached task references.
- **Fingerprint Inputs:** `sha256("MILESTONE_AT_RISK:" + milestoneId + ":" + targetDate.toISOString() + ":" + incompleteTaskIds.sort().join(","))`
- **Resolution Condition:** Milestone target date extended or all attached tasks completed/cancelled.

#### 4.3 `DEPENDENCY_BOTTLENECK`
- **Eligibility:** Task has `isDeleted: false`, `archived: false`, `status NOT IN ['done', 'cancelled']`, and is listed in `dependencies` array of $\ge 3$ active incomplete downstream tasks (or $\ge 1$ urgent task).
- **Facts:** `{ blockingTaskId: string, blockingTaskTitle: string, downstreamCount: number, downstreamUrgentCount: number }`.
- **Severity Derivation:** `HIGH` if blocking an urgent task or `downstreamCount >= 5`; `MEDIUM` otherwise.
- **Related Entities:** Blocking task reference + downstream task references.
- **Fingerprint Inputs:** `sha256("DEPENDENCY_BOTTLENECK:" + blockingTaskId + ":" + downstreamTaskIds.sort().join(","))`
- **Resolution Condition:** Blocking task marked `done`/`cancelled` or dependencies removed.

#### 4.4 `PROJECT_STALLED`
- **Eligibility:** Project is active (`isDeleted: false, archived: false`), total tasks $\ge 3$, incomplete tasks exist (`status NOT IN ['done', 'cancelled']`), AND zero task updates (`Task.updatedAt`), zero task completions, and zero activity (`Activity.createdAt`) in the last 7 days (`now - 7 days`).
- **Facts:** `{ stalledDays: number, incompleteTaskCount: number, lastActivityDate: string | null }`.
- **Severity Derivation:** `MEDIUM` if `stalledDays >= 7`; `HIGH` if `stalledDays >= 14`.
- **Related Entities:** Project reference.
- **Fingerprint Inputs:** `sha256("PROJECT_STALLED:" + projectId + ":" + Math.floor(stalledDays / 7))`
- **Resolution Condition:** Any task update, completion, or project activity recorded.

---

### 5. Deterministic Signal & Severity Contracts

```ts
export interface RelatedEntityRef {
  type: 'task' | 'milestone' | 'project';
  id: string;
  label: string;
}

export interface ProjectSignal {
  type: 'OVERDUE_HIGH_PRIORITY_TASKS' | 'MILESTONE_AT_RISK' | 'DEPENDENCY_BOTTLENECK' | 'PROJECT_STALLED';
  ownerId: string;
  projectId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
  relatedEntities: RelatedEntityRef[];
  facts: Record<string, unknown>;
  fingerprint: string;
}
```

**FROZEN SEVERITY INVARIANT:** Severity is assigned 100% deterministically by signal detector code. The AI model has ZERO authority to alter or override severity.

---

### 6. Atomic Claiming, Stale Lease Recovery, & Ownership-Verified Finalization

To guarantee multi-worker safety across concurrent processes without external dependencies (e.g. Redis), Phase 30 enforces a strict 3-phase **Atomic Lease Ownership Protocol**.

#### 6.1 Phase 1 — Initial Atomic Claim

When a worker detects a signal with fingerprint $F$:
1. It generates a unique `myClaimToken = crypto.randomUUID()`.
2. It attempts to insert a new `ProjectRecommendation` document:
   ```ts
   {
     owner: new Types.ObjectId(signal.ownerId),
     projectId: new Types.ObjectId(signal.projectId),
     type: signal.type,
     severity: signal.severity,
     title: generateDeterministicTitle(signal),
     facts: signal.facts,
     relatedEntities: signal.relatedEntities,
     fingerprint: signal.fingerprint,
     status: "PENDING_ENRICHMENT",
     claimToken: myClaimToken,
     claimedAt: new Date(),
   }
   ```
3. Compound partial unique index enforces uniqueness:
   - If `save()` succeeds: Worker owns the lease and proceeds to AI Enrichment.
   - If `save()` throws duplicate key error (code 11000): Signal is ALREADY active or being enriched. Worker skips AI call immediately.

#### 6.2 Phase 2 — Atomic Stale Claim Recovery

If a previous `PENDING_ENRICHMENT` claim stalls (e.g. worker process crash), subsequent workers MAY attempt recovery if:
`claimedAt < now - PROACTIVE_CLAIM_LEASE_MS` (where `PROACTIVE_CLAIM_LEASE_MS = 30000ms`).

Recovery MUST execute as a single atomic `findOneAndUpdate`:

```ts
const staleThreshold = new Date(Date.now() - PROACTIVE_CLAIM_LEASE_MS);
const recoveredDoc = await ProjectRecommendation.findOneAndUpdate(
  {
    projectId: new Types.ObjectId(signal.projectId),
    fingerprint: signal.fingerprint,
    status: "PENDING_ENRICHMENT",
    claimedAt: { $lt: staleThreshold },
  },
  {
    $set: {
      claimToken: myClaimToken,
      claimedAt: new Date(),
    },
  },
  { new: true }
);
```

- If `recoveredDoc !== null`: Worker has atomically stolen the stale lease and owns `myClaimToken`.
- If `recoveredDoc === null`: Another worker won the recovery race or the claim was finalized. Worker skips AI call.

#### 6.3 Phase 3 — Ownership-Verified Finalization

After `AIService` finishes (or deterministic fallback triggers), the worker MUST finalize the document conditionally by verifying claim token ownership:

```ts
const finalizationResult = await ProjectRecommendation.updateOne(
  {
    _id: claimedDoc._id,
    status: "PENDING_ENRICHMENT",
    claimToken: myClaimToken, // Must match worker's active claim token
  },
  {
    $set: {
      status: "ACTIVE",
      explanation: enrichmentResult.explanation,
      suggestedNextStep: enrichmentResult.suggestedNextStep,
      expiresAt: new Date(Date.now() + PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS * 86400000),
    },
    $unset: {
      claimToken: "",
      claimedAt: "",
    },
  }
);

if (finalizationResult.matchedCount === 0) {
  // Claim was stolen by another worker during AI execution!
  console.warn(`[Worker] Lost claim ownership for recommendation ${claimedDoc._id}. Discarding AI result.`);
}
```

If `matchedCount === 0`, the worker lost ownership during execution. The AI result is safely discarded, preventing overwrites by stalled processes.

#### 6.4 AI Failure Deterministic Fallback Ownership

If `AIService` fails (primary and fallback fail or timeout), deterministic fallback finalization ALSO requires `status: "PENDING_ENRICHMENT"` and `claimToken: myClaimToken`. If ownership is lost, fallback updates are discarded.

---

### 7. Expiration, Cooldown, and Retention Semantics

Logical application lifecycle (`expiresAt`) is strictly decoupled from physical database deletion (`purgeAt`).

```text
                               RECOMMENDATION LIFECYCLE
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [USER DISMISSES]                                [SYSTEM SCAN]
                  │                                               │
  status = DISMISSED                               status = EXPIRED
  dismissedAt = now                                expiresAt = now
  expiresAt = now + 7 days (cooldown)              purgeAt = now + 30 days (retention)
  purgeAt = now + 30 days (retention)                             │
                  │                                               ▼
                  │                                     [Physical TTL Cleanup]
                  ▼                                     purgeAt index deletes document
       [Physical TTL Cleanup]                           after retention period
       purgeAt index deletes document
```

#### 7.1 Lifecycle Rules & Timestamps

1. **`ACTIVE` Recommendations:**
   - `status: "ACTIVE"`
   - `expiresAt`: Set to `now + PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS` (14 days).
   - `purgeAt`: `null` (not eligible for physical cleanup while active).
   - **Reconciliation:** Application scan or on-query logic checks if underlying signal facts resolved. If resolved, transitions `status` $\rightarrow$ `"EXPIRED"`, `expiresAt = now`, `purgeAt = now + PROACTIVE_RETENTION_PURGE_DAYS`.

2. **`DISMISSED` Recommendations:**
   - User clicks Dismiss $\rightarrow$ `status: "DISMISSED"`, `dismissedAt = now`.
   - `expiresAt`: Set to `now + PROACTIVE_DISMISSED_COOLDOWN_DAYS` (7 days cooldown). The partial unique index continues to include `{ fingerprint, status: { $in: ["ACTIVE", "PENDING_ENRICHMENT"] } }`, but application deduplication queries check if a `DISMISSED` recommendation with the same fingerprint exists and `expiresAt > now` to suppress duplicate alerts during cooldown.
   - `purgeAt`: Set to `now + PROACTIVE_RETENTION_PURGE_DAYS` (30 days) to allow historical retention and auditability before physical deletion.

3. **`EXPIRED` Recommendations:**
   - System reconciliation detects condition resolved $\rightarrow$ `status: "EXPIRED"`, `expiresAt = now`.
   - `purgeAt`: Set to `now + PROACTIVE_RETENTION_PURGE_DAYS` (30 days).

#### 7.2 Physical MongoDB TTL Cleanup Index

```ts
// Physical deletion index: Exact-date expiration based on purgeAt
projectRecommendationSchema.index(
  { purgeAt: 1 },
  { expireAfterSeconds: 0 }
);
```

Physical deletion is performed ONLY by MongoDB TTL monitor against `purgeAt`. Application code handles all `status` transitions.

---

### 8. Recommendation Data Model Contract

`ProjectRecommendation` is persisted in MongoDB (`server/src/models/project-recommendation.model.ts`).

```ts
export interface IProjectRecommendation {
  owner: Types.ObjectId;
  projectId: Types.ObjectId;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  explanation: string;
  suggestedNextStep?: string | null;
  facts: Record<string, unknown>;
  relatedEntities: RelatedEntityRef[];
  fingerprint: string;
  claimToken?: string | null;
  claimedAt?: Date | null;
  status: 'PENDING_ENRICHMENT' | 'ACTIVE' | 'DISMISSED' | 'ACTED_ON' | 'EXPIRED';
  dismissedAt?: Date | null;
  actedOnAt?: Date | null;
  expiresAt?: Date | null;
  purgeAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}
```

#### 8.1 Database Indexes

```ts
// 1. Primary lookup for active recommendations per project
projectRecommendationSchema.index({ owner: 1, projectId: 1, status: 1, createdAt: -1 });

// 2. Dashboard active recommendations across all projects
projectRecommendationSchema.index({ owner: 1, status: 1, createdAt: -1 });

// 3. Unique active/pending fingerprint enforcement for deduplication & atomic claims
projectRecommendationSchema.index(
  { projectId: 1, fingerprint: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["ACTIVE", "PENDING_ENRICHMENT"] } } }
);

// 4. Physical TTL index for retention-policy cleanup
projectRecommendationSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
```

---

### 9. AI Enrichment Contract & Output Schema

AI is invoked strictly to enrich natural-language explanations from deterministic facts.

#### 9.1 Zod Output Schema (`server/src/ai/schemas/project-recommendation.schema.ts`)

```ts
import { z } from "zod";

export const ProjectRecommendationOutputSchema = z.object({
  explanation: z.string().min(10).max(1000).describe("Concise natural language explanation of the detected condition and risk."),
  suggestedNextStep: z.string().min(5).max(300).nullable().describe("Suggested non-binding next action for the user."),
});

export type ProjectRecommendationOutput = z.infer<typeof ProjectRecommendationOutputSchema>;
```

#### 9.2 Deterministic Fallback on AI Failure

If `AIService` fails (both primary and fallback providers fail or timeout), Phase 30 executes a **Deterministic Fallback**:
`ProjectRecommendation` is finalized to `status: "ACTIVE"` verifying `claimToken` using a pre-formatted deterministic fallback string derived from `facts`.

*Example Fallback:* `"System alert: 3 high-priority tasks in this project are overdue as of July 27, 2026."`

---

### 10. Dedicated Bounded Recommendation Context Builder

Proactive intelligence MUST NOT reuse `buildCopilotContext()`. A lightweight context builder `buildRecommendationContext()` is used:

```ts
export interface RecommendationContextDTO {
  project: { id: string; name: string; description: string };
  signalType: string;
  severity: string;
  facts: Record<string, unknown>;
  relatedEntities: RelatedEntityRef[];
}
```

*Context Budget:* Max 1,500 tokens / ~6,000 characters. Project Memory is EXCLUDED.

---

### 11. REST API Specifications

All endpoints require JWT authentication (`authenticateJwt`) and enforce strict tenant isolation.

#### 11.1 `GET /api/v1/projects/:projectId/recommendations`
- **Response:** `{ recommendations: ProjectRecommendationDto[] }`
- **Behavior:** Returns active recommendations (`status: "ACTIVE"`) for the project owned by `req.user.id`.

#### 11.2 `GET /api/v1/recommendations`
- **Response:** `{ recommendations: ProjectRecommendationDto[] }`
- **Behavior:** Returns active recommendations across all projects owned by `req.user.id` for Dashboard display.

#### 11.3 `PATCH /api/v1/recommendations/:id/dismiss`
- **Response:** `{ success: true, recommendation: ProjectRecommendationDto }`
- **Behavior:** Sets `status: "DISMISSED"`, `dismissedAt: now`, `expiresAt: now + 7 days` (cooldown), and `purgeAt: now + 30 days` (retention). Suppresses duplicate fingerprint generation during cooldown.

---

### 12. Frontend Integration Specifications

- **`ProjectDetailPage`:** Renders `<ProjectRecommendationsCard projectId={project.id} />` directly above task views.
- **`Dashboard`:** Renders proactive insights inside `<AIDailyBrief />` or `<ProjectInsightsCard />`.
- **Controlled Action Integration:** Recommendation cards feature non-executable suggestion UI. Clicking "Review Action" opens Phase 28 Controlled Action Dialog or Phase 27 Copilot Sheet. Zero direct mutation endpoints.

---

### 13. Mandatory Concurrency Test Requirements

Implementation MUST include deterministic unit/integration tests covering all 9 concurrency & claim safety rules:

1. **Simultaneous Initial Claim:** Two workers attempt initial claim on fingerprint $F$ simultaneously $\rightarrow$ Exactly one worker receives claim; second receives E11000 duplicate key error.
2. **Zero AI Calls for Losing Worker:** The worker failing initial claim executes 0 calls to `AIService`.
3. **Stale Claim Recoverability:** A `PENDING_ENRICHMENT` claim with `claimedAt < now - 30s` is successfully updated via `findOneAndUpdate`.
4. **Simultaneous Recovery Race:** Two workers race to recover a stale claim $\rightarrow$ Exactly one receives updated document with new `claimToken`; losing worker receives `null`.
5. **Stolen Lease Isolation:** Old worker completing AI call after lease was stolen attempts `updateOne` with old `claimToken` $\rightarrow$ `matchedCount === 0`, AI result discarded.
6. **Lease Owner Finalization:** Current lease owner completing AI call attempts `updateOne` with active `claimToken` $\rightarrow$ `matchedCount === 1`, status set to `ACTIVE`.
7. **Fallback Ownership Verification:** Deterministic fallback update after AI failure also requires matching `claimToken` $\rightarrow$ Stolen lease discards fallback update.
8. **ACTIVE Recommendation Suppression:** Existing `ACTIVE` recommendation prevents new claim on identical fingerprint.
9. **Duplicate ACTIVE Prevention:** Database unique index prevents creation of multiple `ACTIVE` recommendations for identical `{ projectId, fingerprint }`.

---

### 14. Work Package Breakdown

- **WP-01:** Recommendation Data Model, Schemas, & Database Indexes
- **WP-02:** Deterministic Signal Engine & Detection Algorithms
- **WP-03:** Proactive AI Context Builder & Bounded Recommendation Prompting
- **WP-04:** Recommendation Deduplication, Lifecycle, & Atomic Claiming Engine
- **WP-05:** Background Worker Job Integration & Rate Bounding
- **WP-06:** Recommendation REST APIs & Tenant Authorization
- **WP-07:** Evaluation Fixtures & Grounding Evaluators for Recommendations
- **WP-08:** Frontend Recommendation Components & Integration (Dashboard & Project Detail)
- **WP-09:** Verification, E2E Tests, & Documentation

---

### 15. Explicit Non-Goals

- NO autonomous workspace mutations without human confirmation.
- NO real-time WebSocket push notifications for recommendations in v1.
- NO AI-driven candidate project selection (100% deterministic).
- NO user-configurable custom cron schedules or threshold settings UI in v1.
- NO inclusion of Project Memory in proactive signal detection or AI context in v1.
- NO live LLM calls during standard `npm run verify`.

---

### 16. Verification Command

Phase 30 completion requires clean execution of:
```bash
npm run verify
```
(Executing lint, typecheck, client tests, server tests, build, and smoke).
