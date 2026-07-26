# Phase 29 — Project Memory & Retrieval
## Gate 1 Architecture Contract

> Status: FROZEN FOR IMPLEMENTATION REVIEW  
> Scope: Phase 29 V1 only  
> Production implementation: Not authorized by this document

This contract freezes the architecture for explicit, user-controlled, project-scoped memory. It governs WP-01 through WP-05. Later work must not reopen these decisions without an explicit architecture change review.

## 1. Repository Re-Verification

Verified before contract creation:

- Repository: /home/rehan/Developer/ai-project-manager
- Branch: fix/phase-28-ci-alignment
- HEAD: 95ab55a — test(ai): align copilot prompt tests with phase 28
- Working tree: clean before documentation creation
- git diff --check: clean before documentation creation
- Live Gemini calls: 0
- Live Anthropic calls: 0

Inspected current implementation:

- Project, Task, Milestone, Activity, and PlanDraft models and services.
- Project/task/milestone routes, controllers, validators, archive/delete conventions.
- server/src/domain/copilot-context-builder.ts
- server/src/domain/copilot-reference-resolver.ts
- server/src/services/project-copilot-ai.service.ts
- server/src/ai/schemas/project-copilot.schema.ts
- server/src/ai/actions/
- server/src/services/copilot-action.service.ts
- server/src/ai/evaluation/
- client/src/features/projects/pages/ProjectDetailPage.tsx
- client/src/features/ai/

Current code takes precedence over older documents. Relevant drift: older documentation describes Anthropic-only AI and five core models, while current code includes Gemini, routing, fallback, Milestone, and PlanDraft. Older Phase 27 material also uses names and response fields that differ from the current Copilot implementation.

## 2. Final V1 Scope

V1 includes:

1. Explicit user-created project memory.
2. Project-scoped MongoDB persistence.
3. Secure CRUD API.
4. Strict authenticated-owner and project isolation.
5. Deterministic bounded Project Copilot retrieval.
6. User-visible inspection, creation, editing, and deletion UX.
7. Stored prompt-injection defenses.
8. Phase 26 offline evaluation fixtures and regression tests.
9. Compatibility with Phase 28 Controlled Actions.

V1 excludes automatic conversation memory, AI persistence authority, embeddings, vector databases, semantic search, document ingestion/RAG, cross-project retrieval, shared-workspace permissions, and proactive Phase 30 intelligence.

Fundamental rule:

> MEMORY MAY INFORM REASONING. MEMORY MUST NEVER GRANT AUTHORITY.

## 3. Resolved Architecture Decisions

### 3.1 Deletion: hard delete

ProjectMemory uses hard deletion in V1.

Project and Task use soft deletion because they are durable domain records referenced by history and recovery behavior. Memory is user-managed contextual configuration, not an activity ledger or authoritative execution record. Hard deletion guarantees that a deleted memory is absent from future retrieval without adding isDeleted filters to every query. There is no vector/chunk index in V1.

Behavior:

- Successful deletion removes the MongoDB document.
- Future list and Copilot retrieval cannot return it.
- Repeated deletion returns 404 Not Found.
- Edit after deletion returns 404 Not Found.
- Deleted content is not preserved in logs or evaluation output.
- Future audit requirements require a dedicated audit design rather than retaining content in Activity metadata.

### 3.2 Activity logging: no Activity records in V1

Memory create, edit, and delete do not create Activity records.

Current Activity is constrained to project/task entities and existing activity types. Adding memory activity would expand the Activity schema, constants, timeline semantics, and UI for low-value configuration events. Raw memory must never enter Activity metadata. Safe operation metadata may be logged through normal application diagnostics where required.

### 3.3 Duplicate memory: duplicates are permitted

V1 does not prevent exact, case-insensitive, or semantically equivalent duplicates.

Semantic deduplication requires embeddings or another similarity strategy. Exact deduplication introduces normalization and concurrency races without a demonstrated need. No unique content index is permitted. Users can remove duplicates through CRUD.

### 3.4 Archived projects: memory remains manageable and retrievable

Archived projects remain readable and writable. The current authorization pattern excludes isDeleted but does not exclude archived, and archived projects remain available in the Project Detail workspace.

| Operation | Archived project | Deleted/nonexistent project |
|---|---:|---:|
| List | Allowed | 404 |
| Create | Allowed | 404 |
| Edit | Allowed | 404 |
| Delete | Allowed | 404 |
| Copilot retrieval | Allowed if Copilot can access project | 404 |

Project deletion blocks access through normal project authorization. No V1 memory cascade is added; a future project deletion policy may explicitly decide whether to cascade-delete memory records.

### 3.5 Memory content limit: 1–1000 characters

Canonical validation:

- content is a string;
- outer whitespace is trimmed;
- minimum length after trimming is 1;
- maximum length after trimming is 1000;
- whitespace-only content is rejected;
- internal whitespace is preserved.

The limit follows the current project-description scale. Task descriptions are larger, and task notes are document-like content; memory is concise durable knowledge, not document storage.

Copilot additionally limits each selected memory to 500 context characters without changing the stored record.

### 3.6 Pagination: paginated API listing, separate retrieval cap

The management API follows existing project/task pagination conventions:

- page default: 1, minimum 1;
- limit default: 25, minimum 1, maximum 50;
- fixed server ordering: updatedAt descending, then _id descending.

The API returns the existing pagination envelope. Copilot retrieval is independent and has a hard cap of 20 memories and a 10,000-character aggregate budget.

### 3.7 Provenance: USER only

V1 sourceType is the enum USER. The server assigns USER; clients cannot choose it.

No speculative COPILOT_CONFIRMED, DOCUMENT, or SYSTEM values are added without a producer. Useful provenance is authenticated owner, project scope, sourceType USER, and timestamps.

### 3.8 Retrieval: bounded all-memory retrieval

V1 uses deterministic bounded retrieval, not lexical or semantic search.

The Copilot question does not influence selection. All explicit memories for the authorized project are candidates. Candidates are sorted by updatedAt DESC, then _id DESC. The first 20 are selected. Each is limited to 500 context characters and the aggregate is limited to 10,000 characters.

All-memory retrieval avoids false negatives from keyword filtering and is appropriate for expected low memory volume. Zero memories leave Copilot behavior unchanged. More than 20 memories sets internal memoryTruncated metadata and selects the deterministic newest set.

## 4. ProjectMemory Domain Contract

### 4.1 Canonical fields

| Field | Type | Required | Default | Mutability | Client exposure | AI exposure |
|---|---|---:|---|---|---|---|
| _id | ObjectId | yes | generated | immutable | as id | never |
| owner | ObjectId ref User | yes | none | immutable/server-owned | never | never |
| projectId | ObjectId ref Project | yes | none | immutable/server-owned | never as authority | never |
| content | string | yes | none | mutable | yes | yes, untrusted |
| sourceType | enum USER | yes | USER | immutable/server-owned | yes | not needed |
| createdAt | Date | yes | timestamp | immutable | ISO string | no |
| updatedAt | Date | yes | timestamp | managed | ISO string | no |

No isDeleted, archived, embedding, vector, chunk, or source-entity fields exist in V1.

Safe client representation is { id, content, sourceType, createdAt, updatedAt, version }. Owner and projectId are never accepted from the client. AI receives only bounded content inside the untrusted memory section and no database IDs.

### 4.2 Indexes

Required index:

    { owner: 1, projectId: 1, updatedAt: -1, _id: -1 }

This supports the primary list and retrieval filter, deterministic newest-first ordering, and stable _id tie-breaking. The built-in _id index supports direct mutation lookups. No unique content index is permitted.

### 4.3 Concurrency

Memory editing uses optimistic concurrency.

- The model enables Mongoose optimistic concurrency through __v.
- PATCH requires expectedVersion, a non-negative integer.
- A Mongoose version conflict becomes the repository-standard 409 ConflictError.
- Create does not require a version.
- Delete uses the owner/project/id filter and does not require a version; an explicit delete supersedes a concurrent edit.

## 5. Authorization Contract

All routes require authenticate. Owner identity comes only from req.user._id.

Every operation first verifies:

    Project.findOne({
      _id: projectId,
      owner: ownerId,
      isDeleted: false
    })

Memory reads and mutations use compound scope filters:

    {
      _id: memoryId,
      owner: ownerId,
      projectId: projectId
    }

Cross-user, cross-project, nonexistent-project, deleted-project, and nonexistent-memory access returns 404 NotFoundError, not 403, following existing anti-enumeration behavior.

The service must never fetch a memory by _id alone and authorize afterward.

## 6. API Contract

Routes:

    GET    /api/v1/projects/:projectId/memories
    POST   /api/v1/projects/:projectId/memories
    PATCH  /api/v1/projects/:projectId/memories/:memoryId
    DELETE /api/v1/projects/:projectId/memories/:memoryId

GET query:

    page: integer, default 1, minimum 1
    limit: integer, default 25, minimum 1, maximum 50

GET response data:

    {
      items: [
        {
          id,
          content,
          sourceType: "USER",
          createdAt,
          updatedAt,
          version
        }
      ],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    }

POST request:

    { "content": "Production deployments happen on Fridays." }

Owner, projectId, and sourceType are not accepted. Response is 201 Created with { memory: ... }.

PATCH request:

    {
      "content": "Production deployments happen on Thursdays.",
      "expectedVersion": 0
    }

Response is 200 OK with { memory: ... }.

DELETE has no body and returns 200 OK with the existing success envelope and no data.

Errors use existing repository semantics:

- malformed ID: BadRequestError;
- invalid body/query: existing validation middleware response;
- unauthorized or missing project/memory: 404 NotFoundError;
- stale PATCH version: 409 ConflictError;
- unexpected errors: existing global error middleware.

## 7. Service, Controller, and Route Responsibilities

    Route
      ↓
    Zod validation
      ↓
    authenticate
      ↓
    thin controller
      ↓
    ProjectMemoryService
      ↓
    ProjectMemory model

Routes own URL composition, middleware ordering, and validation wiring.

Validators own request shape, trimming, length, page, limit, and version validation.

Controllers only read authenticated identity, read validated input, call one service operation, and format the existing success envelope.

Controllers must not query MongoDB, authorize resources, normalize content, decide deletion behavior, or construct prompts.

ProjectMemoryService owns project authorization, compound memory scope, normalization, persistence, pagination, hard deletion, and conflict translation.

## 8. Retrieval Contract

A dedicated ProjectMemoryRetriever is justified. A second CopilotContextAssembler is not required in V1 because the current Copilot service already composes dynamic prompt sections cleanly.

Recommended function:

    retrieveProjectMemories({
      ownerId,
      projectId,
      maxItems = 20,
      maxCharsPerMemory = 500,
      maxTotalChars = 10000
    }) -> {
      items: Array<{ content: string }>,
      totalCount,
      selectedCount,
      memoryTruncated,
      totalChars
    }

The retriever uses the owner/project filter and updatedAt DESC, _id DESC ordering, with a maximum of 20. It must execute only after project authorization. A standalone retriever must not become an authorization bypass.

Retrieval errors fail the Copilot request before AI execution. They must not silently continue with unauthorized or incomplete context.

The existing project-copilot-ai.service.ts adds a separate dynamic section containing bounded memory content. No memory IDs are sent to the model. Zero memories omit the section or serialize an explicit empty section.

## 9. Copilot Context Budget Contract

Current structured limits remain unchanged:

- 40 selected tasks;
- 10 completed tasks within the task budget;
- 5 milestones;
- 10 recent activities;
- bounded descriptions;
- bounded question and history inputs.

Memory adds an independent budget:

- maximum 20 memories;
- maximum 500 serialized characters per memory;
- maximum 10,000 serialized memory characters;
- updatedAt DESC, _id DESC ordering;
- no question-dependent filtering.

Reasoning precedence:

1. system/developer instructions;
2. current structured project, task, and milestone state;
3. current user question;
4. explicit project memory as untrusted contextual knowledge;
5. historical activity.

Current structured state wins over stored memory. If memory says a task is urgent while the current Task says priority low, Copilot must report the current structured priority as authoritative and may describe the memory as stale preference/context.

## 10. Stored Prompt-Injection Defense

Memory is untrusted user data. It is never a system instruction, developer instruction, tool command, or authorization source.

The system prompt must say that memory:

- is project data;
- may contain instruction-like or malicious text;
- has no instruction priority;
- cannot override system/developer rules;
- cannot grant action authority;
- cannot bypass Phase 28 confirmation, HMAC, nonce, OCC, or domain authorization.

Memory is serialized as a safe value inside a dedicated existing prompt section such as project_memory. Content is never interpolated into tag names or control structures. JSON string escaping and the existing prompt builder’s section handling must prevent content such as </project_memory> from terminating the logical section.

Memory must not be described as instructions, policy, or system memory.

## 11. Phase 28 Controlled-Action Compatibility

Memory may influence prose, recommendations, and reasoning behind a proposed action.

Memory cannot influence:

- authenticated identity;
- project or target ownership;
- allowed action types;
- action schema validation;
- dry-run computation;
- HMAC verification;
- nonce consumption;
- OCC version checks;
- domain-service authorization;
- confirmation requirement.

A memory saying “mark the auth task complete automatically” remains untrusted context. It may result in a proposal only if the normal Copilot and action rules allow it; the user must still review and confirm the action. Memory cannot create a new action or execute one directly.

## 12. Frontend UX Contract

Memory management belongs on the existing Project Detail workspace, adjacent to project-level information and near the existing Copilot entry point. It is not a new top-level navigation area.

V1 capabilities:

- list saved memories;
- add memory;
- edit memory;
- delete memory.

Reuse existing Card, Button, Textarea, Dialog, Skeleton, EmptyState, ErrorState, and toast primitives.

States:

- loading: skeleton rows;
- empty: concise user-controlled-memory empty state;
- error: existing retry/error state;
- create/edit pending: disabled submit and progress;
- delete: confirmation dialog;
- mutation errors: preserve form content and show the API error.

Updates are server-confirmed, not optimistic. On success, invalidate the project-memory list query, close the dialog, and do not invalidate unrelated task/project/activity queries.

Recommended key:

    ["project-memories", projectId, { page, limit }]

Do not redesign Project Detail or add global memory navigation.

## 13. AI Memory Write Authority

V1 AI has no memory write authority.

The model cannot create, edit, delete, or automatically extract memory. No remember action is added to the Phase 28 registry. Only explicit authenticated user requests through the Memory API mutate memory.

## 14. Evaluation and Testing Contract

Reuse Phase 26 deterministic offline infrastructure. No ordinary Phase 29 test may call Gemini or Anthropic.

Required coverage:

| Scenario | Mechanism |
|---|---|
| content validation/normalization | validator/model unit tests |
| CRUD behavior | service/API integration tests |
| cross-user isolation | API security tests |
| cross-project isolation | API security tests |
| deleted memory absent | service/retrieval tests |
| edited memory replaces old content | service/retrieval tests |
| relevant memory appears | deterministic Copilot fixture/evaluator |
| malicious memory remains non-authoritative | prompt-injection fixture/evaluator |
| structured state overrides memory | Copilot fixture/evaluator |
| memory informs recommendation | Copilot fixture/evaluator |
| memory cannot grant action authority | Phase 28 tests/evaluator |
| zero-memory behavior | regression test |
| budget truncation | retriever unit test |
| Phase 27/28 compatibility | existing regression suites |

Minimum fixtures cover relevant memory, other-project exclusion, other-user exclusion, deletion, edit replacement, prompt injection, contradictory structured state, recommendation, authority escalation, zero memories, budget truncation, and Phase 27/28 compatibility.

Use existing tagged metrics and static evaluator composition. Do not create a second evaluation framework.

## 15. Observability and Privacy Contract

Raw memory content must not appear in:

- application logs;
- AI telemetry;
- error logs;
- evaluation reports;
- provider diagnostics.

Safe metadata may include operation type, selected count, total candidate count, truncation flag, aggregate character count, retrieval duration, and sanitized error category.

Do not add a new telemetry event solely for memory in V1 unless an existing instrumentation boundary requires it. Existing AI telemetry remains content-free.

## 16. Work Package Plan

### WP-01 — Project Memory Domain Foundation

Objective: implement the model, validators, service contract, and core tests after Gate 1 approval.

Likely created:

- server/src/models/project-memory.model.ts
- server/src/validators/project-memory.validator.ts
- server/src/services/project-memory.service.ts
- server/src/tests/project-memory.test.ts

Tests: limits, normalization, timestamps, indexes, duplicates, OCC conflict, hard deletion.

Dependencies: Gate 1. Non-goals: routes, Copilot, Activity, UI, embeddings.

### WP-02 — Secure Memory CRUD API

Objective: expose authenticated project-nested CRUD.

Likely created:

- server/src/controllers/project-memory.controller.ts
- server/src/routes/project-memory.routes.ts
- server/src/tests/project-memory-api.test.ts
- server/src/tests/project-memory-security.test.ts

Likely modified:

- route registration and query-validation wiring as required.

Tests: envelopes, validation, 404 anti-enumeration, cross-user/project attacks, archived project behavior, repeated delete, stale update conflict.

Dependencies: WP-01. Non-goals: AI persistence, retrieval, UI, Activity.

### WP-03 — Deterministic Retrieval and Copilot Integration

Objective: retrieve bounded memory and expose it as untrusted Copilot data.

Likely created:

- server/src/domain/project-memory-retriever.ts
- server/src/tests/project-memory-retrieval.test.ts

Likely modified:

- server/src/services/project-copilot-ai.service.ts
- current Project Copilot prompt definition
- Copilot prompt/API tests

Tests: ordering, limits, truncation, zero memories, isolation, delimiter safety, structured-state precedence, retrieval failure, Phase 28 compatibility.

Dependencies: WP-01 and WP-02. Non-goals: semantic search, embeddings, vector DB, extraction, memory actions.

### WP-04 — Frontend Project Memory UX

Objective: provide native Project Detail CRUD UX.

Likely created:

- client/src/features/projects/services/project-memory.api.ts
- client/src/features/projects/hooks/useProjectMemories.ts
- client/src/features/projects/hooks/useCreateProjectMemory.ts
- client/src/features/projects/hooks/useUpdateProjectMemory.ts
- client/src/features/projects/hooks/useDeleteProjectMemory.ts
- client/src/features/projects/components/ProjectMemoryPanel.tsx
- client/src/features/projects/components/ProjectMemoryDialog.tsx
- corresponding tests

Likely modified:

- client/src/features/projects/pages/ProjectDetailPage.tsx
- project feature barrels/types as required

Tests: loading, empty, error, CRUD, pending state, invalidation, confirmation, accessibility.

Dependencies: WP-02. Non-goals: global navigation, workspace permissions, optimistic mutation, Copilot redesign.

### WP-05 — Evaluation, Security Audit, and Phase Verification

Objective: prove invariants and complete documentation/manual verification.

Likely created:

- Phase 29 Copilot fixtures under server/src/ai/evaluation/fixtures/copilot/
- server/src/tests/project-memory-quality-eval.test.ts
- final Phase 29 review/manual verification documents

Likely modified only if required:

- Copilot fixture schema/evaluator barrels
- static evaluation runner registration

Tests: full security/retrieval regression, prompt injection, budget, cross-tenant isolation, Phase 27/28 regressions, offline verification.

Dependencies: WP-01 through WP-04. Non-goals: live-model benchmarking, vector prototype, proactive intelligence.

## 17. File-Level Blueprint

Files likely to be created:

- server/src/models/project-memory.model.ts — schema, timestamps, OCC, index.
- server/src/validators/project-memory.validator.ts — body/query/version contracts.
- server/src/services/project-memory.service.ts — authorization, CRUD, normalization, pagination, deletion, conflict translation.
- server/src/controllers/project-memory.controller.ts — thin HTTP adapters.
- server/src/routes/project-memory.routes.ts — authenticated nested routes.
- server/src/domain/project-memory-retriever.ts — deterministic bounded retrieval.
- client/src/features/projects/services/project-memory.api.ts — Axios functions.
- client/src/features/projects/hooks/useProjectMemories.ts and mutation hooks — TanStack Query.
- client/src/features/projects/components/ProjectMemoryPanel.tsx — list and actions.
- client/src/features/projects/components/ProjectMemoryDialog.tsx — create/edit form.
- Phase 29 evaluation fixtures/tests — retrieval and security quality coverage.

Files likely to be modified:

- server/src/routes/project.routes.ts or server/src/routes/index.ts — route registration.
- server/src/services/project-copilot-ai.service.ts — memory retrieval and prompt section.
- current Copilot prompt definition — memory data rules.
- Copilot prompt/schema tests — memory cases.
- client/src/features/projects/pages/ProjectDetailPage.tsx — render memory UI.
- client feature barrels/types as required.
- Phase 26 evaluation barrels/fixtures only where static composition requires registration.

No existing task, activity, action, authentication, or project schema may be changed for V1 without a concrete compatibility defect.

## 18. Canonical Phase 29 Invariants

1. Memory is explicit and user-controlled.
2. Memory is project-scoped.
3. Memory is owner-scoped.
4. Cross-project retrieval is forbidden.
5. Cross-user retrieval is forbidden.
6. AI cannot create, update, or delete memory.
7. Memory is untrusted prompt data.
8. Current structured state overrides memory.
9. Memory cannot grant mutation authority.
10. Phase 28 confirmation remains mandatory.
11. Retrieval is deterministic and bounded.
12. No embeddings or vector infrastructure exist in V1.
13. Hard-deleted memory cannot be retrieved.
14. Archived-project memory remains available while the project is not deleted.
15. Duplicate memory is permitted.
16. Content is 1–1000 normalized characters.
17. API pagination is independent from Copilot retrieval limits.
18. Only sourceType USER exists.
19. Owner identity comes from authenticated server state.
20. Unauthorized resources return anti-enumeration 404 responses.
21. Memory edits use OCC and stale updates return 409.
22. Raw memory is never logged or emitted in AI telemetry.
23. Provider credentials remain server-side.
24. Ordinary tests remain offline.
25. Symbolic reference safety is preserved.
26. Controlled Action registry and confirmation are preserved.
27. Retrieval failure cannot bypass authorization or silently call the model with unauthorized context.

## 19. Explicit Out-of-Scope Items

Phase 29 V1 will not build:

- vector databases;
- embeddings;
- semantic similarity search;
- automatic conversation extraction;
- autonomous memory writes;
- AI memory proposals;
- document ingestion;
- document RAG;
- cross-project memory;
- shared-workspace memory permissions;
- memory-driven automation;
- long-term behavioral user profiling;
- proactive Phase 30 intelligence;
- memory-based authorization;
- a parallel evaluation framework;
- a new Activity/audit subsystem.

## 20. Risk Register

| Risk | Severity | Frozen mitigation |
|---|---|---|
| cross-user leakage | CRITICAL | owner + project filters and adversarial tests |
| cross-project leakage | CRITICAL | nested routes and compound scope filters |
| memory grants action authority | CRITICAL | independent Phase 28 authorization and confirmation |
| stale memory | HIGH | edit/delete UX, timestamps, structured precedence |
| contradictory memory | HIGH | structured state wins, explicit replacement editing |
| stored prompt injection | HIGH | untrusted delimiters and fixtures |
| prompt inflation | HIGH | 20/500/10,000 retrieval budget |
| memory overriding structured state | HIGH | prompt rules and evaluator |
| automatic extraction errors | HIGH | automatic persistence excluded |
| deleted content lingering in indexes | HIGH | hard delete and no secondary vector index |
| AI claims memory was saved when it was not | HIGH | no AI memory action or write path |
| sensitive data persistence | HIGH | concise limit, explicit control, no raw logging |
| duplicate memory | MEDIUM | duplicates explicitly allowed and user-managed |
| embedding/vendor lock-in | MEDIUM | embeddings and vector infrastructure deferred |
| excess retrieval complexity | MEDIUM | bounded MongoDB retrieval only |

Counts: CRITICAL 3, HIGH 9, MEDIUM 3, LOW 0.

## 21. Documentation Created/Modified

Created:

- docs/phases/phase-29-project-memory-retrieval/00-architecture-contract.md

No production or test files are modified by Gate 1.

## 22. Verification Results

After documentation creation, verify:

    git diff --check
    git status --short
    git diff --stat

This is documentation-only work. No live provider calls are required. Full npm verification is reserved for implementation work-package gates.

## 23. Gate Decision

GATE STATUS: PASS

No architectural blockade remains. WP-01 may begin after human review and approval of this contract.

============================================================
PHASE 29 — GATE 1
ARCHITECTURE CONTRACT
============================================================

GATE STATUS:
PASS

PRODUCTION FILES MODIFIED:
0

TEST FILES MODIFIED:
0

DOCUMENTATION FILES MODIFIED:
1

VECTOR DATABASE:
NO

EMBEDDINGS:
NO

AUTOMATIC MEMORY EXTRACTION:
NO

AI MEMORY WRITE AUTHORITY:
NO

MEMORY OWNERSHIP:
Authenticated owner plus owned project; every query and mutation is scoped by both.

MEMORY DELETION:
Hard delete; future retrieval cannot return the record; repeated or post-delete operations return 404.

COPILOT RETRIEVAL:
Deterministic newest-first retrieval of up to 20 explicit memories, capped at 500 characters each and 10,000 aggregate characters.

STRUCTURED STATE PRECEDENCE:
Current structured project/task/milestone state overrides stored memory.

PHASE 28 AUTHORITY BOUNDARY:
PRESERVED

LIVE GEMINI CALLS:
0

LIVE ANTHROPIC CALLS:
0

BLOCKADE REQUIRED:
NO

NEXT AUTHORIZED WORK:
WP-01 — Project Memory Domain Foundation

