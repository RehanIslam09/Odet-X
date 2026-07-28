# Phase 30 — Proactive Project Intelligence
## Repository-Grounded Architectural Investigation

---

### 1. Executive Summary

This document presents the repository-grounded architectural investigation for **Phase 30 — Proactive Project Intelligence** of Odet-X / AI Project Manager.

Up to Phase 29, the system's interaction model has been strictly reactive: the user asks a question or triggers an action, and the system responds. Phase 30 introduces **proactive system-driven analysis**: the system periodically inspects project state, deterministically detects meaningful conditions, invokes AI reasoning *only when strictly justified*, generates grounded recommendations, and presents them for user review without executing autonomous mutations.

**Key Findings:**
1. **Existing Background Infrastructure:** The repository ALREADY possesses an active background worker process ([server/src/worker.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/worker.ts)) running a `node-cron` scheduler connected to MongoDB with graceful shutdown handling and single-process concurrency control (`isJobRunning`). It currently executes `processTaskReminders` ([server/src/jobs/notification.jobs.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/jobs/notification.jobs.ts)).
2. **Deterministic-First Funnel:** Sufficient structured data exists across `Task`, `Milestone`, `Activity`, and `Project` domain models to support 100% deterministic candidate selection and signal detection *before* any AI service invocation.
3. **Zero Autonomous Mutation Authority:** Phase 30 recommendations will be purely advisory read-only entities. Any user action resulting from a recommendation will route strictly through the Phase 28 Controlled Action pipeline ([server/src/ai/actions/action.executor.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/actions/action.executor.ts)) requiring explicit human confirmation.
4. **Idempotency & Cost Containment:** A combination of state-version fingerprinting and unique database index constraints will prevent duplicate LLM calls and redundant recommendations.

---

### 2. Existing System Baseline

The codebase is built on an established multi-phase foundation:

- **Phase 20 (Multi-Provider AI):** Bounded provider factory supporting Anthropic and Gemini ([server/src/ai/providers/provider.factory.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/providers/provider.factory.ts)).
- **Phase 21 (AI Observability):** Structured JSON telemetry and event listener pipeline ([server/src/ai/utils/logger.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/utils/logger.ts)).
- **Phase 22 (Provider Fallback):** Monotonic latency budget and max two-attempt fallback policy ([server/src/ai/utils/fallback-policy.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/utils/fallback-policy.ts)).
- **Phase 23 (Intelligent Provider Routing):** Static tier-based routing (`FAST_JSON` vs `DEEP_CONTEXT`) ([server/src/ai/routing/ai.router.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/routing/ai.router.ts)).
- **Phase 25 (AI Project Planning Engine):** Milestones and PlanDraft schemas ([server/src/models/milestone.model.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/models/milestone.model.ts), [server/src/models/plan-draft.model.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/models/plan-draft.model.ts)).
- **Phase 26 (AI Evaluation Infrastructure):** Offline evaluation runners and deterministic evaluators ([server/src/ai/evaluation/runners/evaluation.runner.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/evaluation/runners/evaluation.runner.ts)).
- **Phase 27 (Read-Only Project Copilot):** Symbolic reference resolution and context building ([server/src/domain/copilot-context-builder.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/domain/copilot-context-builder.ts)).
- **Phase 28 (Controlled AI Actions):** Action dry-run, HMAC token signing, single-use nonces, and human confirmation ([server/src/ai/actions/action.executor.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/ai/actions/action.executor.ts)).
- **Phase 29 (Project Memory & Retrieval):** Explicit memory schema with strict context budgeting ([server/src/models/project-memory.model.ts](file:///Ubuntu/home/rehan/Developer/ai-project-manager/server/src/models/project-memory.model.ts)).

---

### 3. Worker / Background Infrastructure

`[CONFIRMED]`

- **Entrypoint:** `server/src/worker.ts`
- **Bootstrapping & Connection:** Invokes `connectDatabase()` from `server/src/config/database.ts`.
- **Process Controls:** Listens for `SIGTERM` and `SIGINT` to trigger `gracefulShutdown()`, which sets `isShuttingDown = true` and closes `mongoose.connection`. Global `unhandledRejection` and `uncaughtException` exit process with code 1.
- **Execution Model:** On startup, runs `runJobs()` immediately, then registers `node-cron.schedule("0 * * * *", ...)` (hourly on minute 0).
- **Concurrency Control:** Employs an in-memory boolean flag `isJobRunning`. If a scheduled tick fires while `isJobRunning === true`, the run is safely skipped with a log warning.
- **Distributed Locking:** `[CONFIRMED]` No distributed lock (e.g. Redis Redlock) currently exists. If multiple worker instances are deployed, both will execute `runJobs()` concurrently. Idempotency is enforced at the MongoDB document layer via unique indexes (e.g. `dedupeKey` in `Notification`).
- **Scripts:** `server/package.json` contains `"worker:dev": "tsx watch --require tsconfig-paths/register src/worker.ts"` and `"worker:start": "node dist/worker.js"`. Root `package.json` includes `npm run worker:dev --prefix server` inside `dev` via `concurrently`.

---

### 4. Project Domain Findings

`[CONFIRMED]`

- **Model File:** `server/src/models/project.model.ts`
- **Relevant Fields:** `owner` (ObjectId), `name` (String), `description` (String), `emoji` (String), `color` (String), `archived` (Boolean, default `false`), `isDeleted` (Boolean, default `false`), `aiSummary` (Object), `createdAt` (Date), `updatedAt` (Date).
- **Deletion & Archive Conventions:**
  - Soft-deleted projects (`isDeleted: true`) are strictly hidden from users and must never enter proactive candidate selection.
  - Archived projects (`archived: true`) represent paused or closed projects. In `server/src/services/project.service.ts`, `getProjectOptions` and `getProjectSummary` explicitly filter `{ isDeleted: false, archived: false }`.
- **Candidate Selection Pattern:** Candidate active projects for Phase 30 scanning will be queried using:
  ```ts
  Project.find({ isDeleted: false, archived: false }).select("_id owner name description updatedAt").lean();
  ```

---

### 5. Task Domain Model & Signals

`[CONFIRMED]`

- **Model File:** `server/src/models/task.model.ts`
- **Relevant Fields:** `owner`, `projectId`, `title`, `description`, `notes`, `status` (`backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`), `priority` (`none`, `low`, `medium`, `high`, `urgent`), `dueDate` (Date | null), `estimatedTime`, `labels`, `dependencies` (array of Task ObjectIds), `position`, `milestoneId`, `completedAt` (Date | null), `archived`, `isDeleted`, `createdAt`, `updatedAt`, `__v` (OCC version).
- **Existing Indexes:**
  - `taskSchema.index({ owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 })`
  - `taskSchema.index({ owner: 1, dependencies: 1 })`
  - `taskSchema.index({ isDeleted: 1, archived: 1, status: 1, dueDate: 1 })`
- **Derivable Signals (Without AI):**
  - *Overdue High Priority:* `dueDate < now` AND `priority IN ['high', 'urgent']` AND `status NOT IN ['done', 'cancelled']`.
  - *Dependency Bottleneck:* Task is incomplete AND referenced in `dependencies` array of $\ge 3$ active tasks.
  - *Stalled Progress:* Project has incomplete tasks but zero `Task.updatedAt` or completions in $\ge 7$ days.

---

### 6. Milestone & Planning Architecture

`[CONFIRMED]`

- **Model Files:** `server/src/models/milestone.model.ts`, `server/src/models/plan-draft.model.ts`
- **Milestone Fields:** `owner`, `projectId`, `title`, `description`, `targetDate`, `position`, `isDeleted`.
- **PlanDraft Fields:** `owner`, `projectId`, `status` (`draft`, `committed`, `discarded`), `promptDescription`, `tasks`, `milestones`, `expiresAt`.
- **Derivable Planning Signals:**
  - *Milestone at Risk:* Milestone has `targetDate` within $N$ days (or passed) while connected tasks (`milestoneId = ms._id`) remain incomplete or overdue.
  - *Prerequisite Chain Delay:* An incomplete task blocking a chain of tasks attached to an upcoming milestone.

---

### 7. Activity Infrastructure

`[CONFIRMED]`

- **Model & Service:** `server/src/models/activity.model.ts`, `server/src/services/activity.service.ts`
- **Schema Fields:** `owner`, `actorId`, `type` (`ActivityType`), `entityType` (`"project" | "task"`), `entityId`, `projectId`, `contextProjectIds`, `metadata`, `createdAt`.
- **Scope & Conventions:** Activity records are append-only (`timestamps: { createdAt: true, updatedAt: false }`). `entityType` is restricted to `"project" | "task"`.
- **Analysis:** Recommendation creation should **NOT** generate Activity records. Activity reflects user and core workspace domain changes; internal recommendation engine execution is tracked via telemetry.

---

### 8. Notification Infrastructure

`[CONFIRMED]`

- **Model & Service:** `server/src/models/notification.model.ts`, `server/src/services/notification.service.ts`
- **Deduplication:** `dedupeKey` has a unique sparse index (`{ dedupeKey: 1 }, { unique: true, sparse: true }`). `createNotificationStrict` catches MongoDB duplicate key error (code 11000) and returns `false` idempotently.
- **Analysis:** High/Critical severity recommendations can optionally trigger an in-app `Notification` using `dedupeKey: "rec:${recommendationId}"`.

---

### 9. Copilot Architecture Reuse Analysis

`[CONFIRMED]`

- **Files:** `server/src/domain/copilot-context-builder.ts`, `server/src/domain/copilot-reference-resolver.ts`, `server/src/services/project-copilot-ai.service.ts`
- **Analysis:**
  - `buildCopilotContext` is tuned for interactive conversational chat, pulling up to 35 tasks, 15 milestones, 10 activities, and 20 memories into a large context DTO.
  - Proactive intelligence **must NOT** reuse `buildCopilotContext` directly. Doing so would consume unnecessary tokens and inject noisy, irrelevant data into proactive analysis.
  - Instead, Phase 30 should reuse the **symbolic reference mapping pattern** (`task_1`, `ms_1`) and `resolveCopilotReferences` while building a dedicated, minimal `buildRecommendationContext` function focused strictly on the entities associated with the detected deterministic signal.

---

### 10. Project Memory Integration Analysis

`[CONFIRMED]`

- **Service:** `server/src/services/project-memory.service.ts` (`getProjectMemoriesForCopilot`)
- **Analysis:**
  - Deterministic signal detection MUST NOT inspect `ProjectMemory` text to avoid false positives and adversarial prompt injection.
  - During the AI explanation phase, relevant memories MAY be optionally included in the context, but MUST be wrapped in `<untrusted_user_memory>` tags and explicitly overridden by structured database state.

---

### 11. Controlled Action Boundaries

`[CONFIRMED]`

- **Files:** `server/src/ai/actions/action.registry.ts`, `server/src/ai/actions/action.executor.ts`, `server/src/services/copilot-action.service.ts`, `server/src/utils/copilot-action-token.ts`
- **Safety Guarantee:** Phase 30 recommendation persistence carries ZERO direct mutation authority. If a recommendation suggests a corrective action (e.g., updating a due date or status), the UI action button routes the user into Phase 28's existing `ActionExecutor.dryRun` flow, generating a signed HMAC token and requiring explicit human confirmation.

---

### 12. AI Platform / Routing / Telemetry Analysis

`[CONFIRMED]`

- **AIService & Router:** `server/src/ai/ai.service.ts`, `server/src/ai/routing/ai.router.ts`
- **Execution Target:** Proactive recommendation generation will target `AIModelTier.FAST_JSON` (Gemini-preferred fast tier) with strict timeouts (15,000ms).
- **Telemetry:** `aiLogger.logExecution` in `server/src/ai/utils/logger.ts` logs structured JSON telemetry containing `executionId`, `promptId`, `provider`, `model`, `durationMs`, `tokens`, `attempt`, and `isFallback`.

---

### 13. Evaluation Infrastructure Analysis

`[CONFIRMED]`

- **Files:** `server/src/ai/evaluation/runners/evaluation.runner.ts`, `server/src/ai/evaluation/evaluators/`
- **Analysis:** Phase 30 will add golden recommendation fixtures under `server/src/ai/evaluation/fixtures/proactive/` and evaluators checking:
  1. *Groundedness:* AI explanation references only facts supplied in the deterministic signal.
  2. *Reference Validity:* Related entity references map strictly to valid project entities.
  3. *Absence of Forbidden/Untrusted Claims:* Ensures AI does not hallucinate false dates or unverified task states.

---

### 14. Frontend Surface Analysis

`[CONFIRMED]`

- **Pages:** `client/src/features/projects/pages/ProjectDetailPage.tsx`, `client/src/features/dashboard/`
- **Surfaces:**
  - `ProjectDetailPage`: Place a new `ProjectRecommendationsCard` or banner directly above `ProjectTasks`.
  - `Dashboard`: Integrate recommendation items into `AIDailyBrief` or a `ProjectInsightsCard`.

---

### 15. Deterministic Signal Candidates

`[PROPOSED]`

| Signal Candidate | Required Structured Fields | Deterministic Calculation | AI Role |
| :--- | :--- | :--- | :--- |
| `OVERDUE_HIGH_PRIORITY_TASKS` | `dueDate`, `priority`, `status` | `dueDate < now && priority IN ['high', 'urgent'] && status NOT IN ['done', 'cancelled']` | Synthesize impact summary |
| `MILESTONE_AT_RISK` | `targetDate`, `milestoneId`, `status` | Milestone `targetDate` approaching while attached tasks remain incomplete/overdue | Explain bottleneck & risk |
| `DEPENDENCY_BOTTLENECK` | `dependencies`, `status` | Incomplete task listed as dependency for $\ge 3$ active tasks | Explain downstream impact |
| `PROJECT_STALLED` | `Task.updatedAt`, `completedAt`, `Activity` | Active project with zero task updates or activity in $\ge 7$ days | Summarize dormancy state |

---

### 16. Recommended Phase 30 v1 Signal Set

`[PROPOSED]`

For Phase 30 v1, we select **4 high-confidence deterministic signal types**:
1. `OVERDUE_HIGH_PRIORITY_TASKS`
2. `MILESTONE_AT_RISK`
3. `DEPENDENCY_BOTTLENECK`
4. `PROJECT_STALLED`

*Deferred for future phases:* `MEMORY_STATE_CONFLICT`, `UNRESOLVED_PROJECT_RISKS`, `PLAN_EXECUTION_DRIFT`.

---

### 17. Recommendation Persistence Analysis

`[PROPOSED]`

Recommendations will be persisted in MongoDB as a dedicated `AIRecommendation` collection:

```ts
export interface IAIRecommendation {
  owner: Types.ObjectId;
  projectId: Types.ObjectId;
  type: string; // e.g. 'OVERDUE_HIGH_PRIORITY_TASKS'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  explanation: string;
  facts: Record<string, unknown>;
  relatedEntities: { type: 'task' | 'milestone' | 'project'; id: Types.ObjectId; label: string }[];
  fingerprint: string;
  status: 'ACTIVE' | 'DISMISSED' | 'ACTED_ON' | 'EXPIRED';
  dismissedAt?: Date | null;
  actedOnAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 18. Recommendation Lifecycle Analysis

`[PROPOSED]`

State Transitions:
- `ACTIVE`: Created, visible to user.
- `DISMISSED`: User manually dismisses recommendation. Suppresses generation of same fingerprint during cooldown.
- `ACTED_ON`: User executes suggested action or resolves condition.
- `EXPIRED`: System automatically marks expired when underlying signal is no longer detected during subsequent scan.

---

### 19. Deduplication Strategy Analysis

`[PROPOSED]`

- **Fingerprint Formula:**
  `fingerprint = sha256(type + ":" + projectId + ":" + sortedRelatedEntityIds.join(",") + ":" + factDigest)`
- **Pre-AI Deduplication Check:**
  Before invoking `AIService`, the worker queries:
  ```ts
  const existing = await AIRecommendation.findOne({ projectId, fingerprint, status: "ACTIVE" });
  if (existing) return; // Skip AI call entirely
  ```
- **Database Constraint:** Partial unique index on `{ projectId: 1, fingerprint: 1 }` where `status: "ACTIVE"`.

---

### 20. Scheduling / Worker Execution Analysis

`[PROPOSED]`

- Worker adds a new job module `server/src/jobs/proactive-intelligence.jobs.ts`.
- `runJobs()` in `server/src/worker.ts` executes `processProactiveIntelligence()`.
- Runs on the hourly cron schedule (`0 * * * *`).

---

### 21. Cost & Rate Boundary Analysis

`[PROPOSED]`

Hard safety limits per worker scan cycle:
- **Max Candidate Projects / Run:** 50
- **Max AI Invocations / Run:** 10
- **Max AI Invocations / User / Day:** 20
- **AI Timeout:** 15,000ms
- **Model Tier:** `AIModelTier.FAST_JSON`

---

### 22. Failure & Resilience Analysis

`[PROPOSED]`

- **Project Scan Isolation:** Errors during signal detection or AI generation for one project log an error and continue to the next candidate project.
- **Provider Fallback:** Reuses Phase 22 `AIService` fallback policy (Attempt 1 -> Attempt 2 max).

---

### 23. Privacy & Logging Analysis

`[CONFIRMED]`

- Telemetry strictly adheres to Phase 21/23 privacy rules.
- Logs include `executionId`, `recommendationType`, `projectId`, `candidateCount`, `aiInvocationCount`, `durationMs`, `success`.
- Logs **NEVER** include task titles, descriptions, memory content, or prompt text.

---

### 24. Tenant Isolation Analysis

`[CONFIRMED]`

- Background execution does NOT alter tenant isolation.
- Every candidate project retrieved contains `owner`. All downstream queries (`Task`, `Milestone`, `Activity`, `AIRecommendation`) MUST explicitly filter by `owner: candidateProject.owner`.

---

### 25. Recommendation → Copilot / Action Boundary

`[CONFIRMED]`

- Recommendations carry ZERO mutation credentials.
- Recommendation UI components display action options (e.g. "Postpone Due Date" or "Ask Copilot"). Clicking an action opens the Phase 28 Action Confirmation Modal or Phase 27 Copilot Sheet.

---

### 26. Testing Strategy

`[PROPOSED]`

- **Deterministic Signal Tests:** Unit test signal engine with synthetic project/task matrices.
- **Deduplication Tests:** Verify fingerprint suppression and index constraints.
- **Worker Bounding Tests:** Verify project scan limits and AI call caps.
- **API & Tenant Isolation Tests:** Verify list/dismiss endpoints enforce owner security.

---

### 27. Live Provider Testing Policy

`[CONFIRMED]`

- **CI Policy:** Standard CI and `npm run verify` execute 100% offline with zero live API calls.
- **Optional Live Smoke Test:** Isolated in `server/src/tests/proactive-recommendation-live-smoke.test.ts` (opt-in via environment flag).

---

### 28. CI / Verification Requirements

`[CONFIRMED]`

Before Phase 30 closure, `npm run verify` must pass cleanly:
`npm run lint && npm run typecheck && npm test && npm run build && npm run smoke`

---

### 29. Architectural Risks

`[CONFIRMED]`

1. **AI Cost Explosion Risk:** Mitigated by pre-AI deterministic filtering, active fingerprint lookup, and hard worker rate caps.
2. **Hallucination Risk:** Mitigated by enforcing deterministic state precedence in prompts and verifying outputs against schema.
3. **Tenant Isolation Risk:** Mitigated by passing `owner` explicitly to every worker sub-query.

---

### 30. Required Blockades / Experiments

`[CONFIRMED]` None required. Existing infrastructure provides all necessary primitives.

---

### 31. Recommended Work Package Breakdown

`[PROPOSED]`

- **WP-01:** Recommendation Data Model, Schemas, & Database Indexes
- **WP-02:** Deterministic Signal Engine & Detection Algorithms
- **WP-03:** Proactive AI Context Builder & Bounded Recommendation Prompting
- **WP-04:** Recommendation Deduplication, Lifecycle, & Expiration Engine
- **WP-05:** Background Worker Job Integration & Rate Bounding
- **WP-06:** Recommendation REST APIs & Tenant Authorization
- **WP-07:** Evaluation Fixtures & Grounding Evaluators for Recommendations
- **WP-08:** Frontend Recommendation Components & Integration (Dashboard & Project Detail)
- **WP-09:** Verification, E2E Tests, & Documentation

---

### 32. Explicit Non-Goals

- NO autonomous mutations without human confirmation.
- NO real-time WebSocket push notifications for recommendations in v1.
- NO AI-driven candidate project selection (must be 100% deterministic).
- NO user-configurable custom cron schedules or threshold settings UI in v1.
- NO live LLM calls during standard `npm run verify`.

---

### 33. Proposed Frozen Invariants

1. **Zero Autonomous Mutation Authority:** Recommendations are purely advisory.
2. **Deterministic Detection First:** Candidates and signals are detected 100% deterministically before any AI call.
3. **Pre-AI Deduplication:** Active recommendations and active fingerprints suppress AI calls entirely.
4. **Hard Execution Rate Caps:** Max 50 projects/run, max 10 AI calls/run.
5. **Tenant Scoping Parity:** Worker queries explicitly enforce `owner` scoping.
6. **100% Offline CI:** Zero live AI calls during `npm run verify`.

---

### 34. Answers to Mandatory Questions

1. **What exact existing worker/background infrastructure can Phase 30 reuse?**
   `[CONFIRMED]` `server/src/worker.ts` (entrypoint, `node-cron`, database connection, graceful shutdown, single-process `isJobRunning` lock) and `server/src/jobs/` (job modules).

2. **How should candidate projects be selected?**
   `[CONFIRMED]` Query MongoDB using `Project.find({ isDeleted: false, archived: false })`.

3. **Should archived projects participate?**
   `[CONFIRMED]` No. Archived projects represent paused/frozen projects and must be excluded (`archived: false`).

4. **How are deleted projects excluded?**
   `[CONFIRMED]` Soft-deleted projects set `isDeleted: true` and are excluded via `isDeleted: false`.

5. **What deterministic signals are possible using current structured project data?**
   `[CONFIRMED]` Overdue high-priority tasks, approaching milestones with incomplete tasks, dependency bottlenecks ($\ge 3$ dependent tasks), and stalled project progress (no updates in $\ge 7$ days).

6. **Which 2–4 recommendation types should Phase 30 v1 actually support?**
   `[PROPOSED]` `OVERDUE_HIGH_PRIORITY_TASKS`, `MILESTONE_AT_RISK`, `DEPENDENCY_BOTTLENECK`, `PROJECT_STALLED`.

7. **Which candidate recommendation types should be deferred?**
   `[PROPOSED]` `MEMORY_STATE_CONFLICT`, `UNRESOLVED_PROJECT_RISKS`, `PLAN_EXECUTION_DRIFT`, `UPCOMING_DEADLINE_RISK`.

8. **Should Phase 30 introduce a dedicated deterministic signal engine?**
   `[PROPOSED]` Yes. A pure domain module `server/src/domain/signal-detector.ts` executing prior to any AI call.

9. **What should a structured signal contract contain?**
   `[PROPOSED]` `signalType`, `projectId`, `severity`, `relatedEntityIds`, `facts`, `fingerprint`.

10. **When should AI be invoked?**
    `[PROPOSED]` Only after a deterministic signal is detected, passes pre-AI deduplication, and requires natural-language explanation.

11. **Which recommendations need NO AI at all?**
    `[PROPOSED]` Signal detection and raw alert facts require zero AI. AI is used solely for natural-language synthesis.

12. **What should AI contribute that deterministic logic cannot?**
    `[PROPOSED]` Natural-language explanation, context synthesis, and actionable guidance for the user.

13. **Should proactive AI reuse the Copilot context builder directly?**
    `[CONFIRMED]` No. Copilot context builder is too broad. Proactive AI requires a dedicated, bounded recommendation context builder.

14. **Should Phase 29 memories participate in proactive reasoning?**
    `[CONFIRMED]` Excluded from signal detection. Optionally included as `<untrusted_user_memory>` during AI explanation phase only.

15. **How is structured-state precedence preserved?**
    `[CONFIRMED]` Deterministic facts are injected as authoritative ground truth in system prompts.

16. **How do we prevent memory prompt injection from creating false recommendations?**
    `[CONFIRMED]` Candidate signal detection is 100% deterministic and does not inspect memory text. Memory text cannot trigger a recommendation.

17. **Should recommendations be persisted?**
    `[PROPOSED]` Yes, in a dedicated `AIRecommendation` collection in MongoDB.

18. **What should the recommendation lifecycle be?**
    `[PROPOSED]` `ACTIVE` -> `DISMISSED` | `ACTED_ON` | `EXPIRED`.

19. **What should recommendation severity semantics be?**
    `[PROPOSED]` `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` determined objectively by the signal engine.

20. **How should related entities be represented?**
    `[CONFIRMED]` Structured objects containing `type`, `id` (ObjectId string), and `label` (title snapshot).

21. **How should recommendations be deduplicated?**
    `[PROPOSED]` SHA-256 fingerprinting based on signal type, project ID, related entity IDs, and fact digest, coupled with database lookup.

22. **What deterministic fingerprint/key strategy is safest?**
    `[PROPOSED]` SHA-256 hash of structured state data (excluding AI-generated text).

23. **How should dismissed recommendations behave?**
    `[PROPOSED]` Preserved with `status: DISMISSED` and `dismissedAt`, enforcing a cooldown window against identical fingerprints.

24. **When can a previously dismissed condition legitimately generate a new recommendation?**
    `[PROPOSED]` When the cooldown window expires OR the underlying state materially changes (new fingerprint).

25. **Should recommendations expire?**
    `[PROPOSED]` Yes, automatically when underlying conditions are resolved or after a maximum active TTL (14 days).

26. **Should expiration be logical or TTL-based?**
    `[PROPOSED]` Logical status transition (`EXPIRED`) during background scanning with optional background MongoDB TTL cleanup.

27. **Should recommendation creation generate Activity?**
    `[CONFIRMED]` No. Activity tracks user workspace actions. Recommendation processing is tracked via telemetry.

28. **Should recommendation creation generate Notification?**
    `[CONFIRMED]` High/Critical recommendations may optionally trigger notifications using `createNotificationStrict` with a `dedupeKey`.

29. **What happens if notification creation fails after recommendation persistence succeeds?**
    `[CONFIRMED]` Recommendation remains persisted and queryable. Worker logs error and continues.

30. **How do we prevent duplicate notifications?**
    `[CONFIRMED]` Unique sparse index on `Notification.dedupeKey`.

31. **What hard limits should exist on background AI execution?**
    `[PROPOSED]` Max 50 projects/run, max 10 AI calls/run, max 20 AI calls/user/day, 15s timeout.

32. **How do we prevent concurrent workers from generating duplicates?**
    `[CONFIRMED]` Single-process `isJobRunning` flag and partial unique database index on `{ projectId: 1, fingerprint: 1, status: "ACTIVE" }`.

33. **Do we need locking in Phase 30 v1?**
    `[PROPOSED]` Distributed locking is not required due to unique database index guarantees.

34. **What happens when a scan partially fails?**
    `[CONFIRMED]` Per-project try/catch logs error and proceeds to next project.

35. **What telemetry is needed?**
    `[CONFIRMED]` `aiLogger` logging `executionId`, `type`, `projectId`, `candidateCount`, `aiInvocations`, `durationMs`, `success`.

36. **What private data must never enter logs/telemetry?**
    `[CONFIRMED]` Project descriptions, task titles/descriptions, memory text, raw prompts, raw AI outputs.

37. **How does worker execution preserve tenant isolation without an HTTP authentication context?**
    `[CONFIRMED]` All worker queries explicitly require and filter by `owner: candidateProject.owner`.

38. **What APIs will eventually be required?**
    `[PROPOSED]`
    - `GET /api/v1/projects/:projectId/recommendations`
    - `GET /api/v1/recommendations`
    - `PATCH /api/v1/recommendations/:id/dismiss`
    - `PATCH /api/v1/recommendations/:id/act`

39. **What frontend surfaces should eventually display recommendations?**
    `[CONFIRMED]` `ProjectDetailPage` (`ProjectRecommendationsCard`) and `Dashboard` (`AIDailyBrief` / `ProjectInsightsCard`).

40. **How can recommendations route into Copilot or Controlled Actions without bypassing Phase 28?**
    `[CONFIRMED]` Action buttons trigger existing Phase 28 dry-run and confirmation dialogs requiring explicit human approval.

41. **What evaluation fixtures should be added?**
    `[CONFIRMED]` Golden recommendation fixtures in `server/src/ai/evaluation/fixtures/proactive/`.

42. **Which tests can remain completely deterministic/offline?**
    `[CONFIRMED]` 100% of unit, detector, service, API, and worker tests run offline using `mongodb-memory-server` and mock providers.

43. **Is an optional live-provider smoke test justified?**
    `[CONFIRMED]` Yes, isolated in `server/src/tests/proactive-recommendation-live-smoke.test.ts`.

44. **What indexes will likely be required?**
    `[PROPOSED]`
    - `{ owner: 1, projectId: 1, status: 1, createdAt: -1 }`
    - `{ projectId: 1, fingerprint: 1, status: 1 }` (unique for active)
    - `{ owner: 1, status: 1, createdAt: -1 }`

45. **What architectural risks could BLOCK implementation?**
    `[CONFIRMED]` Unbounded AI cost loops, false recommendations/hallucinations, and tenant isolation leakage in background queries.

46. **Are any experiments/blockades required before implementation?**
    `[CONFIRMED]` None. Repository primitives fully support Phase 30 requirements.

47. **What is the recommended WP breakdown?**
    `[PROPOSED]` WP-01 through WP-09 as detailed in Section 31.

48. **What should explicitly remain NON-GOALS for Phase 30?**
    `[PROPOSED]` No autonomous mutations, no WebSocket push notifications, no AI candidate selection, no custom user cron UI, no live LLM calls in CI.

49. **What exact invariants must be frozen in the Phase 30 architecture contract?**
    `[PROPOSED]` Zero autonomous mutations, deterministic detection first, pre-AI deduplication, hard execution rate caps, strict owner scoping, 100% offline CI.

50. **Is Phase 30 safe to proceed to architecture-contract design?**
    `[PROPOSED]` **VERDICT: PASS** — Safe to proceed to Phase 30 Architecture Contract design.

---

### 35. Gate Recommendation

**FINAL VERDICT: PASS**

The repository investigation is complete. The existing codebase possesses all necessary primitives (worker, database schemas, AI router/telemetry, evaluation engine, action executor, notification deduplication) to build Phase 30 safely.

**Recommendation:** Proceed to Gate 1B — Architecture Contract Design for Phase 30.
