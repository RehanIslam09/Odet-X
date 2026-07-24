# Odet-X — AI Project Manager
# Product & Engineering Roadmap

> **Document Status:** Canonical Roadmap
> **Roadmap Scope:** Phase 25 onward
> **Last Completed Phase:** Phase 24 — Frontend Foundation & AI Integration
> **Next Phase:** Phase 25 — AI Project Planning Engine
> **Architecture:** React + TypeScript + Express + MongoDB + Multi-Provider AI Platform

---

# 1. Purpose

This document defines the canonical engineering roadmap for the next major evolution of **Odet-X / AI Project Manager**.

Phases 20–24 established the foundational AI platform and connected its first capabilities to the product.

The next phases move the system from:

> **AI-assisted project management**

toward:

> **an intelligent project operating system capable of planning, reasoning over project state, assisting users conversationally, proposing controlled actions, remembering useful context, and proactively identifying risks and opportunities.**

This roadmap intentionally prioritizes architectural safety and capability layering over rapid accumulation of disconnected AI features.

Each phase should create infrastructure that the following phase can reuse.

The intended progression is:

```text
Structured AI
      ↓
Reliable AI
      ↓
Observable AI
      ↓
Routed AI
      ↓
Product-integrated AI
      ↓
Planning
      ↓
Evaluation
      ↓
Reasoning / Copilot
      ↓
Controlled Actions
      ↓
Memory / Retrieval
      ↓
Proactive Intelligence
      ↓
Collaboration
      ↓
Production Hardening
```

---

# 2. Current System Baseline

At the completion of Phase 24, Odet-X already contains a mature foundation across the frontend, backend, domain layer, and AI subsystem.

## 2.1 Completed AI Platform

The backend currently supports:

- Google Gemini
- Anthropic Claude
- provider abstraction
- structured generation
- Zod response validation
- model tiers
- deterministic provider routing
- infrastructure fallback
- AI error taxonomy
- execution telemetry
- token usage normalization
- privacy-safe logging
- prompt registry
- prompt versioning
- offline AI testing

The central architecture is:

```text
Domain AI Service
       ↓
AIService
       ↓
AIRouter
       ↓
AIProviderFactory
       ↓
Provider
       ↓
Gemini / Anthropic
```

The AI subsystem does not directly own domain persistence.

That boundary must remain intact.

---

# 3. Completed Phase History

## Phase 20 — Multi-Provider AI Foundation + Gemini

Established the provider-independent AI architecture.

Major outcomes:

- `AIProvider`
- `GeminiProvider`
- `AnthropicProvider`
- `AIProviderFactory`
- `AIService`
- model tiers
- structured generation
- Zod response validation
- prompt registry
- prompt versioning
- Gemini schema adaptation

### Durable invariant

```text
AI provider output
      ↓
schema validation
      ↓
domain service
      ↓
database
```

Raw model output must never directly reach persistence.

---

## Phase 21 — AI Observability & Usage Intelligence

Introduced operational visibility into AI execution.

Major outcomes:

- AI telemetry
- execution duration
- provider/model tracking
- token usage
- structured error taxonomy
- privacy boundaries
- telemetry observers

### Durable invariant

Telemetry must never contain:

- raw prompts
- raw model responses
- API keys
- credentials
- secret values

Unknown token usage must remain unknown.

```text
UNKNOWN ≠ ZERO
```

---

## Phase 22 — Provider Fallback & Resilience

Introduced bounded provider failover.

Execution model:

```text
Primary Provider
      │
      ├── success → return
      │
      └── eligible infrastructure failure
                    ↓
             Alternate Provider
```

Maximum execution attempts:

```text
2
```

One primary attempt and one fallback attempt.

### Durable invariant

Only explicit infrastructure failures may trigger fallback.

Validation errors, safety refusals, malformed AI output, and application errors must fail fast.

---

## Phase 23 — Intelligent AI Provider Routing

Introduced deterministic provider selection.

Major outcomes:

- `AIRouter`
- routing decisions
- capability-aware provider selection
- routing telemetry
- degraded routing strategies
- lazy provider construction

Provider choice remains a backend responsibility.

The frontend never chooses:

- Gemini
- Anthropic
- concrete models

---

## Phase 24 — Frontend Foundation & AI Integration

Connected the established backend AI capabilities to the product.

Implemented frontend AI workflows:

### Generate Project Tasks

```text
GenerateTasksDialog
      ↓
useGenerateTasks
      ↓
aiApi
      ↓
ProjectAIService
      ↓
AIService
```

### Generate Project Summary

```text
ProjectAISummaryCard
      ↓
useGenerateProjectSummary
      ↓
ProjectSummaryAIService
```

### Generate Task Labels

```text
TaskPropertiesPanel
      ↓
useGenerateTaskLabels
      ↓
TaskAIService
```

Phase 24 also established the frontend AI architecture:

```text
Component
   ↓
TanStack Query Mutation
   ↓
AI API Module
   ↓
Shared apiClient
   ↓
Backend
```

Generic AI assistant controls intentionally remain disabled.

Those placeholders are reserved for the future Copilot.

---

# 4. Roadmap Philosophy

The next phases must follow several principles.

## 4.1 Capability Before Interface

A UI should not be activated merely because a button already exists.

The underlying architecture must first support the capability safely.

For example:

```text
Ask AI button
```

does not justify immediately implementing a chat interface.

The system first needs:

- context assembly
- grounding
- evaluation
- authorization boundaries
- response contracts

---

## 4.2 Human Approval Before High-Risk Mutation

AI-generated suggestions and AI-executed actions are fundamentally different.

```text
Suggestion
```

is low risk.

```text
Mutation
```

changes project state.

Future AI actions must therefore follow:

```text
AI
 ↓
Proposal
 ↓
Validation
 ↓
Authorization
 ↓
Human Confirmation
 ↓
Domain Service
 ↓
Database
```

Never:

```text
AI → Database
```

---

## 4.3 Structured Retrieval Before Vector Infrastructure

Odet-X already owns structured project data.

Projects, tasks, status, priority, labels, due dates, activities, and summaries can be queried directly from MongoDB.

Therefore Copilot v1 should initially use deterministic structured retrieval.

Vector retrieval should only be introduced when semantic retrieval provides measurable value.

---

## 4.4 Evaluation Before Broad AI Expansion

Unit tests can prove that AI output conforms to a schema.

They cannot prove that an answer is useful.

Before introducing a broad Copilot capability, Odet-X should establish an AI evaluation foundation.

---

# 5. Canonical Phase Sequence

```text
PHASE 25
AI Project Planning Engine
        │
        ▼
PHASE 26
AI Evaluation & Quality Foundation
        │
        ▼
PHASE 27
Read-Only Project Copilot
        │
        ▼
PHASE 28
Controlled AI Actions
        │
        ▼
PHASE 29
Project Memory & Retrieval
        │
        ▼
PHASE 30
Proactive Project Intelligence
        │
        ▼
PHASE 31
Global Search & Command Palette
        │
        ▼
PHASE 32
Workspaces & Memberships
        │
        ▼
PHASE 33
RBAC & Collaboration
        │
        ▼
PHASE 34
Real-Time Collaboration
        │
        ▼
PHASE 35
Production Hardening
        │
        ▼
PHASE 36
Deployment & Release Engineering
```

---

# 6. Phase Dependency Graph

```text
20 ── Multi-Provider Foundation
 │
21 ── Observability
 │
22 ── Fallback
 │
23 ── Routing
 │
24 ── Frontend Integration
 │
25 ── Planning Engine
 │
26 ── Evaluation Foundation
 │
27 ── Read-Only Copilot
 │
28 ── Controlled Actions
 │
29 ── Memory & Retrieval
 │
30 ── Proactive Intelligence
 │
31 ── Search / Command Infrastructure
 │
32 ── Workspaces
 │
33 ── RBAC / Collaboration
 │
34 ── Real-Time Collaboration
 │
35 ── Production Hardening
 │
36 ── Deployment / Release
```

Phases are intentionally ordered so that later systems reuse earlier safety boundaries.

---

# 7. Phase 25 — AI Project Planning Engine

## Objective

Transform AI task generation from immediate task creation into a genuine project planning workflow.

Current behavior:

```text
User Prompt
    ↓
AI Generates Tasks
    ↓
Tasks Immediately Persist
```

Target behavior:

```text
Project Context
      ↓
Planning Request
      ↓
AI Generates Structured Plan
      ↓
Plan Validation
      ↓
Dependency Validation
      ↓
Plan Preview
      ↓
Human Review / Editing
      ↓
Explicit Approval
      ↓
Atomic Commit
      ↓
Tasks + Planning Metadata
```

---

## Why Phase 25 Comes Next

The current task generator already proves that the system can produce structured task breakdowns.

However, the current domain model cannot represent a serious project plan.

Missing capabilities include:

- task dependencies
- task ordering
- milestones
- planning metadata
- draft plans
- plan versions
- dependency validation
- cycle detection
- approval workflow

These are domain-model problems rather than provider problems.

They should therefore be solved before introducing a conversational assistant capable of reasoning about project structure.

---

# 8. Phase 25 Architectural Decisions

Phase 25 must resolve several questions before implementation begins.

## Decision 1 — Draft Plan Persistence

Recommended direction:

Introduce a first-class draft planning representation.

Potential model:

```typescript
PlanDraft {
  owner
  projectId
  status
  source
  objective
  tasks
  milestones
  createdAt
  updatedAt
}
```

Possible lifecycle:

```text
GENERATED
   ↓
DRAFT
   ↓
EDITED
   ↓
APPROVED
   ↓
COMMITTED
```

Rejected lifecycle:

```text
AI output → Task.create()
```

for full project planning.

---

## Decision 2 — Dependency Representation

Recommended initial approach:

```typescript
Task {
  dependencies: ObjectId[]
}
```

This is likely sufficient for the current single-user project scale.

A dedicated graph-edge collection should only be introduced if future query requirements justify it.

---

## Decision 3 — Dependency Safety

The planning engine must treat dependencies as a Directed Acyclic Graph.

Example:

```text
Research
   ↓
Design
   ↓
Implementation
   ↓
Testing
   ↓
Deployment
```

Invalid:

```text
A → B → C
↑       ↓
└───────┘
```

Any dependency cycle must be rejected before persistence.

---

## Decision 4 — Task Ordering

Introduce explicit deterministic ordering.

Potential field:

```typescript
position: number
```

Ordering must not depend on:

```text
createdAt
updatedAt
```

because timestamps are not planning semantics.

---

## Decision 5 — Milestones

Phase 25 should determine whether milestones are first-class entities.

Recommended direction:

```typescript
Milestone {
  owner
  projectId
  title
  description
  targetDate
  position
}
```

Tasks may optionally reference:

```typescript
milestoneId
```

Milestones should not be implemented as labels.

---

# 9. Phase 25 Work Packages

Recommended structure:

```text
Gate 1
Planning Domain Design

Blockade A
Plan Schema Prototype

Gate 2
Architecture Approval

WP-01
Planning Domain Foundation

WP-02
AI Planning Generation

WP-03
Draft Validation & Dependency Graph

WP-04
Plan Commit / Persistence

WP-05
Frontend Plan Review Experience

Blockade B
Manual End-to-End Planning Verification

Gate 3
Implementation Review

Gate 4
Final Verification & Phase Closure
```

---

## WP-01 — Planning Domain Foundation

Expected work:

- planning types
- draft plan schema
- dependency representation
- milestone representation
- ordering semantics
- validators
- ownership rules

No AI generation should be implemented until these contracts are stable.

---

## WP-02 — AI Planning Generation

Introduce a dedicated planning prompt rather than extending the existing simple task generator indefinitely.

Potential registry entry:

```text
project-plan
```

Potential output:

```typescript
{
  objective: string;
  assumptions: string[];
  milestones: [
    {
      temporaryId: string;
      title: string;
      description: string;
      position: number;
    }
  ];
  tasks: [
    {
      temporaryId: string;
      title: string;
      description: string;
      priority: Priority;
      estimatedTime?: string;
      labels: string[];
      dependencies: string[];
      milestoneId?: string;
      position: number;
    }
  ];
}
```

Temporary IDs allow generated entities to reference each other before MongoDB IDs exist.

---

## WP-03 — Draft Validation & Dependency Graph

Introduce deterministic validation independent of AI.

Validation should include:

- duplicate temporary IDs
- missing dependency targets
- self-dependencies
- cycles
- invalid milestone references
- invalid positions
- task limits
- milestone limits

AI must not be trusted to guarantee graph correctness.

---

## WP-04 — Plan Commit

The commit layer transforms validated draft entities into persistent domain entities.

Conceptually:

```text
Validated Draft
      ↓
Authorization
      ↓
Commit Service
      ↓
Create Milestones
      ↓
Create Tasks
      ↓
Resolve temporary dependency IDs
      ↓
Persist dependency references
      ↓
Activity
```

Atomicity must be explicitly investigated.

If MongoDB transactions are unavailable in the current environment, a safe alternative commit/rollback strategy must be documented.

---

## WP-05 — Frontend Planning Experience

Potential UX:

```text
Project Workspace
      ↓
Plan Project
      ↓
Planning Dialog / Workspace
      ↓
AI generates draft
      ↓
Editable Plan Preview
      ↓
Milestones
      ↓
Ordered Tasks
      ↓
Dependencies
      ↓
Approve Plan
```

The user must be able to inspect the generated plan before persistence.

---

# 10. Phase 25 Non-Goals

Phase 25 does NOT implement:

- generic chat
- workspace Copilot
- vector search
- embeddings
- autonomous task modification
- background AI agents
- multi-user collaboration
- streaming chat
- proactive recommendations

Keep planning focused.

---

# 11. Phase 25 Exit Criteria

Phase 25 is complete when:

- AI can generate a structured project plan.
- Plans can exist independently from persisted tasks.
- Generated plans can be reviewed before persistence.
- Dependencies are validated.
- Cycles cannot enter persisted project state.
- Ordering is deterministic.
- Milestones have explicit semantics if approved during design.
- Plan commit respects ownership.
- Invalid AI output cannot corrupt domain state.
- Frontend supports plan review and approval.
- Automated tests perform zero live AI calls.
- `npm run verify` passes.
- Manual browser verification passes.

---

# 12. Phase 25 Product Polish & Architectural Invariants

During final browser testing of Phase 25, a focused product-polish pass was performed to ensure optimal visual sizing, component responsiveness, and seamless draft resumption.

## 12.1 Durable Front-End Invariant
> **NEW FRONTEND SURFACES MUST BE RESPONSIVE-BY-CONSTRUCTION**
> All new frontend components, dialogs, modals, workspaces, cards, and forms created from Phase 25 onward MUST be designed and implemented to adapt gracefully to varying screen sizes.
>
> Specifically:
> - Dialogs must use viewport-aware max-widths (`sm:max-w-4xl lg:max-w-6xl w-[94vw]`) rather than narrow desktop-only defaults.
> - Horizontal overflow under normal desktop and laptop usage MUST be strictly eliminated.
> - Scrolling MUST be bounded to intuitive inner content areas while shell headers and action bars remain fixed and reachable.
> - Form controls, metadata selectors, and prerequisite chips MUST wrap or truncate gracefully.

## 12.2 Active Draft Resume UX & Invariant Preservation
- **Single Active Draft Invariant**: Phase 25 preserves the strict invariant of **exactly ONE active draft plan per project** (`status: "draft"`).
- **Resume Draft Workflow**: When an active draft exists for a project, the project workspace exposes a `Resume Draft` action that opens the active draft directly in the `PlanReviewWorkspace` without calling AI.
- **Unified Review Workspace**: `PlanReviewWorkspace` remains the single canonical editor/reviewer for both newly generated plans and resumed active drafts.
- **Cancelled Commit Safety**: Cancelling a commit confirmation modal MUST NOT mutate, discard, or invalidate the draft state.

---

# 13. Deferred Feature Specification — Saved Planning Drafts & Plan History

> **Status**: DEFERRED FROM PHASE 25 — INTENTIONAL FUTURE CAPABILITY
> **Roadmap Placement**: Phase 28.5 (Checkpoint following Controlled AI Actions & Project Memory)

## 13.1 Feature Overview & User Problem
Currently in Phase 25, generating a new plan replaces the existing active draft for that project. In future complex project planning workflows, users will want to:
- Compare alternative AI-generated planning proposals for the same project.
- Save named draft versions (e.g., *"Option A: Microservices Architecture"*, *"Option B: Monolithic MVP"*).
- Retain historical plan drafts and restore or rebase older proposals.

## 13.2 Architectural Changes Required for Saved Drafts
To support multiple saved drafts per project in the future, the following architectural assumptions from Phase 25 must be explicitly updated:
1. **Cardinality & Constraints**: Relax the Mongoose partial unique index (`{ owner: 1, projectId: 1, status: "draft" }`) to allow multiple saved draft documents per project.
2. **Draft Schema Extensions**: Add `name: string`, `version: number`, and extended `status` enum (`"draft"`, `"saved"`, `"archived"`, `"committed"`, `"discarded"`).
3. **API Expansion**: Introduce `GET /api/v1/projects/:projectId/plans` (list all saved drafts), `POST /api/v1/projects/:projectId/plans/:draftId/duplicate`, and `PATCH /api/v1/projects/:projectId/plans/:draftId/name`.
4. **UI Draft Library**: Introduce a `Saved Planning Drafts` drawer/gallery component within the project workspace.

---

# 14. Dedicated Future Phase — Full Responsive UI / Mobile UX Overhaul

> **Status**: PLANNED ROADMAP PHASE
> **Roadmap Placement**: Phase 34.5 (Dedicated Checkpoint preceding Production Hardening & Release Engineering)

## 14.1 Phase Objective
While Phase 25 enforces that new UI components are responsive-by-construction, the wider application contains legacy desktop-oriented layouts across dashboard, tasks, activity, settings, and navigation.

Phase 34.5 is a dedicated, first-class engineering and product phase designed to systematically audit, redesign, and polish the application's mobile and multi-device experience.

## 14.2 Mandatory Phase Requirements & Checkpoints
1. **Full Application Responsive Audit**: Comprehensive review across all application routes (`/login`, `/dashboard`, `/projects`, `/projects/:id`, `/tasks`, `/tasks/:id`, `/notifications`, `/settings`), navigation drawers, modals, forms, tables, and AI surfaces.
2. **Viewport / Device Matrix**: Define and validate against representative viewport classes:
   - Compact Mobile (< 380px)
   - Standard Mobile (380px – 430px)
   - Large Mobile / Small Tablet (430px – 768px)
   - Tablet Landscape / Small Laptop (768px – 1024px)
   - Desktop (1024px – 1440px)
   - Wide Desktop (> 1440px)
3. **Responsive Design System Review**: Standardize Tailwind breakpoints, container max-widths, dynamic font scaling, spacing scales, and modal dialog behavior across all features.
4. **Mobile Navigation Architecture**: Replace or adapt desktop sidebar navigation with evidence-based mobile navigation patterns (e.g. mobile navigation drawer or bottom navigation bar).
5. **Touch UX & Target Sizing**: Ensure all interactive controls meet minimum 44×44px touch target guidelines, optimize drag-and-drop fallback behaviors on touch screens, and adjust touch dropdown menus.
6. **Complex Workspace Adaptation**: Transform complex information-dense surfaces (Project Detail, Planning Workspace, Task Kanban Board, Notes Workspace) into device-aware mobile layouts.
7. **Responsive Automated Testing**: Add Playwright E2E tests verifying responsive viewport classes, layout rendering, touch target visibility, and zero horizontal viewport overflow.
8. **Manual Device Verification**: Perform real manual testing across physical mobile and tablet devices with screenshot evidence.
9. **Accessibility & Reduced Motion**: Validate screen reader navigation, focus ring visibility, color contrast, and reduced-motion compatibility on mobile viewports.
10. **Definition of Done**: The phase is complete ONLY when the product provides an intentionally tailored, polished mobile user experience across all core workflows.

---

# 12. Phase 26 — AI Evaluation & Quality Foundation

## Objective

Create infrastructure for measuring AI quality rather than only structural correctness.

Current tests answer:

```text
Did the function work?
Did the schema validate?
Did fallback happen correctly?
```

Phase 26 begins answering:

```text
Was the AI answer actually useful?
```

---

# 13. Why Evaluation Comes Before Copilot

A project Copilot dramatically increases the number of acceptable outputs.

Traditional unit tests cannot determine whether:

```text
"Your project is progressing well."
```

is better than:

```text
"Three urgent tasks are overdue and the deployment task is blocked by unfinished API integration."
```

Both are valid strings.

Only one is useful.

Before Copilot becomes a major product surface, Odet-X needs repeatable quality measurement.

---

# 14. Phase 26 Capabilities

Potential architecture:

```text
server/src/ai/evaluation/
├── types.ts
├── fixtures/
├── evaluators/
├── metrics/
├── runners/
└── reports/
```

Evaluation dimensions may include:

- schema correctness
- grounding
- relevance
- completeness
- unsupported claims
- planning quality
- dependency correctness
- instruction adherence

---

# 15. Golden Fixtures

Create deterministic project scenarios.

Example:

```text
Project:
Launch SaaS MVP

Tasks:
- Build authentication [done]
- Build billing [in progress]
- Deploy production [todo]
- Configure monitoring [todo]

Dependencies:
Deploy production → Build billing
```

Expected facts can be encoded separately.

This allows future Copilot answers to be evaluated against known project truth.

---

# 16. Evaluation Layers

Use multiple layers rather than depending entirely on LLM-as-judge.

## Layer 1 — Deterministic Assertions

Examples:

```text
Does the answer mention the actual overdue task?
Does it reference a nonexistent project?
Does generated planning contain cycles?
```

## Layer 2 — Structured Quality Metrics

Examples:

```text
groundedFactCoverage
unsupportedClaimCount
requiredItemCoverage
```

## Layer 3 — Optional Model-Based Evaluation

An LLM evaluator may later assess:

- clarity
- usefulness
- prioritization
- explanation quality

Model-based evaluation must supplement deterministic checks, not replace them.

---

# 17. Phase 26 Non-Goals

Do not build:

- production chat
- vector DB
- autonomous agents
- user-facing evaluation UI
- huge benchmark infrastructure

The goal is a lightweight reusable evaluation foundation.

---

# 18. Phase 26 Exit Criteria

Phase 26 is complete when:

- golden AI fixtures exist
- deterministic quality evaluators exist
- planning output can be regression-tested
- evaluation reports are reproducible
- evaluation does not require production data
- evaluation never leaks secrets
- live AI evaluation is optional and isolated from CI
- standard CI remains fully offline
- future prompts can be compared against previous versions

---

# 19. Phase 27 — Read-Only Project Copilot

## Objective

Activate the first true conversational AI experience.

The initial Copilot should reason about project state but should not modify it.

Core rule:

```text
READ
YES

WRITE
NO
```

---

# 20. Initial Copilot Scope

Start project-scoped.

Example questions:

```text
What should I work on next?

What tasks are blocking the project?

What are the biggest risks?

Which urgent tasks are overdue?

Summarize progress this week.

Why is this project behind schedule?

What can I realistically finish today?
```

This scope is significantly safer than workspace-wide autonomous reasoning.

---

# 21. Copilot Context Architecture

Copilot v1 should use structured MongoDB context.

Example:

```text
Copilot Request
      ↓
Authorization
      ↓
Project Context Builder
      ↓
Project
Tasks
Milestones
Dependencies
Recent Activity
AI Summary
      ↓
Context Budgeting
      ↓
Prompt
      ↓
AIService
      ↓
Validated Answer
```

No vector database is required initially.

---

# 22. Context Builder

Introduce a dedicated boundary such as:

```text
server/src/ai/context/
```

Potential components:

```text
project-context.builder.ts
context-budget.ts
context.types.ts
```

The Copilot must not query arbitrary MongoDB data itself.

Context retrieval remains deterministic application logic.

---

# 23. Copilot Response Contract

Prefer structured output even when rendering conversational text.

Example:

```typescript
{
  answer: string;
  references: [
    {
      type: "task" | "milestone" | "project";
      id: string;
      label: string;
    }
  ];
  suggestedQuestions?: string[];
}
```

This allows the frontend to display grounded entity references.

---

# 24. Frontend Copilot

Phase 27 is the appropriate point to activate the existing AI placeholders.

Potential UX:

```text
Ask AI
  ↓
Copilot Panel
  ↓
Question
  ↓
Loading
  ↓
Answer
  ↓
Referenced Tasks / Milestones
```

The existing:

```text
QuickActions.tsx
AIDailyBrief.tsx
```

placeholders may become Copilot entry points.

---

# 25. Streaming Decision

Phase 27 must explicitly evaluate whether SSE is justified.

Preferred progression:

```text
v1
Synchronous JSON

↓ evidence of UX need

v2
SSE Streaming
```

Do not introduce WebSockets solely for AI chat.

If one-way server-to-client token streaming becomes necessary, SSE is likely simpler.

---

# 26. Phase 27 Safety Boundary

Copilot cannot:

- create tasks
- delete tasks
- update tasks
- archive projects
- change due dates
- modify labels
- commit plans

It may recommend those actions in natural language.

Execution belongs to Phase 28.

---

# 27. Phase 27 Exit Criteria

- project-scoped Q&A works
- responses are grounded in authorized project context
- references point to real entities
- cross-user data leakage tests exist
- context budgets are enforced
- Copilot cannot mutate domain state
- existing Ask AI placeholders are activated appropriately
- quality fixtures cover common Copilot questions
- offline tests pass
- manual browser verification passes

---

# 28. Phase 28 — Controlled AI Actions

## Objective

Allow Copilot to propose domain mutations without giving the LLM direct mutation authority.

This is one of the highest-risk phases in the roadmap.

---

# 29. Fundamental Action Architecture

Required architecture:

```text
User
 ↓
Copilot
 ↓
AI proposes typed action
 ↓
Action schema validation
 ↓
Authorization
 ↓
Dry-run preview
 ↓
Human confirmation
 ↓
Action executor
 ↓
Existing domain service
 ↓
Database
 ↓
Activity log
```

Forbidden:

```text
LLM
 ↓
MongoDB
```

---

# 30. Action Proposal Contract

Example:

```typescript
{
  action: "UPDATE_TASK_PRIORITY",
  target: {
    type: "task",
    id: "..."
  },
  arguments: {
    priority: "high"
  },
  explanation: "This task blocks deployment."
}
```

The LLM may propose the action.

The application determines whether it is legal.

---

# 31. Initial Controlled Actions

Begin with low-risk operations.

Potential first actions:

```text
UPDATE_TASK_PRIORITY
UPDATE_TASK_STATUS
UPDATE_TASK_DUE_DATE
ADD_TASK_LABEL
CREATE_TASK
```

Avoid initially:

```text
DELETE_PROJECT
DELETE_TASK
BULK_DELETE
ACCOUNT_CHANGES
SECURITY_CHANGES
```

---

# 32. Dry-Run UX

Example:

```text
AI suggests:

Change "Deploy API" priority

Current:
Medium

Proposed:
High

Reason:
This task blocks production deployment.

[Cancel] [Apply Change]
```

Nothing changes until the user confirms.

---

# 33. Action Registry

Potential backend architecture:

```text
server/src/ai/actions/
├── action.types.ts
├── action.registry.ts
├── action.validator.ts
├── action.executor.ts
└── handlers/
```

Handlers must delegate to existing domain services.

They should not duplicate mutation logic.

---

# 34. Phase 28 Exit Criteria

- AI actions are typed
- all actions are schema validated
- authorization is checked independently from the model
- every mutation requires confirmation
- execution uses existing domain services
- actions generate activity records
- stale task versions are handled
- destructive actions remain excluded
- AI cannot bypass confirmation
- adversarial action tests exist

---

# 35. Phase 29 — Project Memory & Retrieval

## Objective

Allow Odet-X to retain and retrieve project knowledge beyond immediate structured state.

Phase 29 introduces memory only after Copilot usefulness has been established.

---

# 36. Memory Types

Do not treat all memory identically.

Potential categories:

## Explicit Project Memory

User-controlled information such as:

```text
Project uses PostgreSQL.

Production deployment occurs on Fridays.

Never schedule releases during exam week.

The frontend uses React.

Customer launch deadline is October 10.
```

## Conversation Memory

Useful information discovered through Copilot interactions.

## Document Knowledge

Large unstructured notes or future attached documents.

---

# 37. Retrieval Strategy

Use a staged architecture.

```text
Structured Query
      ↓
Explicit Project Memory
      ↓
Semantic Retrieval
```

Vector search should complement structured queries rather than replace them.

---

# 38. Vector Infrastructure Decision

Phase 29 must evaluate actual requirements before selecting infrastructure.

Possible choices include:

```text
MongoDB Atlas Vector Search
external vector database
```

The decision should consider:

- deployment complexity
- scale
- latency
- cost
- operational burden
- local development
- backup requirements

No vendor should be chosen merely because it is popular.

---

# 39. Embedding Pipeline

If semantic retrieval is justified:

```text
Source Content
      ↓
Normalization
      ↓
Chunking
      ↓
Embedding
      ↓
Vector Index
      ↓
Metadata
```

Metadata must retain ownership boundaries:

```text
ownerId
projectId
entityType
entityId
```

Retrieval must never cross user authorization boundaries.

---

# 40. Phase 29 Exit Criteria

- explicit project memory exists
- users can inspect/edit/delete memory where applicable
- retrieval preserves ownership
- structured retrieval remains primary for structured facts
- semantic retrieval is introduced only where justified
- embeddings cannot expose cross-user data
- retrieval quality has evaluation fixtures
- memory deletion propagates correctly

---

# 41. Phase 30 — Proactive Project Intelligence

## Objective

Move Odet-X from reactive assistance toward proactive assistance.

Before this phase:

```text
User asks
AI answers
```

After this phase:

```text
System observes project state
        ↓
Detects meaningful condition
        ↓
Produces recommendation
        ↓
User decides
```

---

# 42. Potential Intelligence Capabilities

Examples:

```text
Task X is likely to delay milestone Y.

Three urgent tasks have been untouched for five days.

The project has no remaining tasks assigned before its deadline.

Task A blocks four downstream tasks.

Your current workload makes Friday's milestone unrealistic.

This project has accumulated several unresolved risks.
```

---

# 43. Proactive Intelligence Architecture

Use the existing worker process.

Potential architecture:

```text
Worker
 ↓
Candidate Project Selection
 ↓
Deterministic Pre-Checks
 ↓
AI Analysis when justified
 ↓
Recommendation
 ↓
Notification
```

Do not call an LLM for every project on every cron tick.

Use deterministic filters first.

---

# 44. Recommendation Persistence

Potential entity:

```typescript
AIRecommendation {
  owner
  projectId
  type
  severity
  title
  explanation
  relatedEntities
  status
  generatedAt
  expiresAt
}
```

Possible statuses:

```text
ACTIVE
DISMISSED
ACTED_ON
EXPIRED
```

This prevents the same recommendation from repeatedly bothering the user.

---

# 45. Phase 30 Exit Criteria

- proactive analysis is bounded
- deterministic filtering occurs before expensive AI execution
- recommendations are explainable
- recommendations reference real project state
- duplicate recommendations are controlled
- users can dismiss recommendations
- background AI execution has rate/cost limits
- recommendations cannot autonomously mutate state

---

# 46. Phase 31 — Global Search & Command Palette

## Objective

Create a unified navigation and command layer across the application.

Potential UX:

```text
Ctrl / Cmd + K
```

Search:

```text
Projects
Tasks
Milestones
Commands
AI Actions
```

---

# 47. Search Architecture

Start with deterministic search.

```text
Query
 ↓
Projects
Tasks
Milestones
 ↓
Rank
 ↓
Results
```

Semantic search from Phase 29 may augment this later.

---

# 48. Command Architecture

Potential commands:

```text
Create Project
Create Task
Open Project
Open Task
Ask AI
Plan Project
Generate Summary
```

The command palette should reuse existing actions rather than creating duplicate business logic.

---

# 49. Phase 31 Exit Criteria

- keyboard-first global navigation works
- search respects ownership
- commands reuse existing product workflows
- AI entry points integrate naturally
- semantic retrieval remains optional
- accessibility requirements are met

---

# 50. Phase 32 — Workspaces & Memberships

## Objective

Evolve the current single-user ownership model toward collaborative workspaces.

This is a major domain transition.

Current model:

```text
User
 ↓
owns
 ↓
Project
```

Future model:

```text
Workspace
 ├── Members
 ├── Projects
 ├── Tasks
 └── Roles
```

---

# 51. Workspace Domain

Potential entities:

```typescript
Workspace
WorkspaceMember
```

Possible structure:

```typescript
Workspace {
  name
  slug
  ownerId
}

WorkspaceMember {
  workspaceId
  userId
  role
}
```

Projects would transition toward:

```typescript
workspaceId
```

rather than relying exclusively on:

```typescript
owner
```

---

# 52. Migration Requirements

This phase must preserve existing users.

Potential migration:

```text
Existing User
      ↓
Personal Workspace
      ↓
Existing Projects migrated
```

No existing project should become inaccessible.

---

# 53. AI Authorization Impact

Every AI capability must become workspace-aware.

Context retrieval must enforce:

```text
workspace membership
        +
project authorization
```

This affects:

- planning
- Copilot
- actions
- memory
- retrieval
- recommendations

---

# 54. Phase 32 Exit Criteria

- workspaces exist
- existing users receive compatible personal workspaces
- membership model exists
- project ownership migration succeeds
- AI context is workspace-safe
- cross-workspace leakage tests exist
- frontend workspace switching works

---

# 55. Phase 33 — RBAC & Collaboration

## Objective

Introduce explicit permissions and collaborative project workflows.

Potential roles:

```text
OWNER
ADMIN
MEMBER
VIEWER
```

---

# 56. Authorization Architecture

Avoid scattered role checks.

Introduce centralized permission evaluation.

Conceptually:

```typescript
can(user, "task:update", task)
can(user, "project:delete", project)
can(user, "ai:execute-action", project)
```

AI actions must use exactly the same permission engine as human actions.

---

# 57. Collaboration Capabilities

Potential features:

- task assignees
- project members
- mentions
- collaborative activity
- member-aware notifications
- assignment notifications

The exact collaboration scope should be decided during Phase 33 design.

---

# 58. Phase 33 Exit Criteria

- centralized permissions exist
- roles have documented capabilities
- domain services enforce permissions
- AI cannot bypass RBAC
- task assignment exists if approved
- collaboration events appear in activity
- permission tests cover cross-role behavior

---

# 59. Phase 34 — Real-Time Collaboration

## Objective

Add real-time synchronization only after multi-user collaboration exists.

Potential capabilities:

```text
Task updated
      ↓
Other clients update immediately

New activity
      ↓
Activity feed updates

Notification
      ↓
Unread count updates
```

---

# 60. Transport Decision

Phase 34 should evaluate:

```text
SSE
WebSockets
```

based on actual requirements.

If communication remains mostly server → client, SSE may remain sufficient.

If bidirectional collaboration becomes necessary, WebSockets may be justified.

Transport must follow requirements rather than fashion.

---

# 61. Conflict Handling

Real-time synchronization does not eliminate concurrency problems.

Existing task optimistic concurrency should remain important.

Potential flow:

```text
Client A edits Task v5
Client B edits Task v5

A saves
→ Task v6

B saves stale v5
→ conflict
```

The frontend should surface meaningful conflict recovery.

---

# 62. Phase 34 Exit Criteria

- meaningful domain updates propagate in real time
- authorization applies to subscriptions
- reconnect behavior works
- duplicate events are handled
- stale writes remain protected
- AI-generated changes propagate normally through the same event system

---

# 63. Phase 35 — Production Hardening

## Objective

Prepare the system for sustained real-world operation.

This phase focuses less on product features and more on reliability.

---

# 64. Reliability

Audit:

- graceful shutdown
- database reconnection
- worker failures
- request timeouts
- AI provider outages
- malformed external responses
- background job crashes
- partial failures

---

# 65. Security

Perform a full security review covering:

```text
authentication
authorization
JWT lifecycle
refresh tokens
rate limiting
CORS
security headers
input validation
NoSQL injection
XSS
secret handling
AI prompt injection boundaries
AI action authorization
workspace isolation
```

---

# 66. AI Cost Controls

Introduce appropriate operational limits.

Potential dimensions:

```text
per-user AI requests
per-workspace AI requests
planning frequency
Copilot frequency
background intelligence budget
token budgets
```

Cost controls should exist above provider-level rate limits.

---

# 67. Observability Expansion

Current AI telemetry should eventually integrate into broader operational observability.

Potential metrics:

```text
request latency
error rates
AI latency
fallback frequency
provider distribution
token usage
background job failures
database latency
```

Avoid leaking user content into observability systems.

---

# 68. Performance

Profile:

- dashboard queries
- project task queries
- activity queries
- Copilot context construction
- search
- dependency graph calculations
- memory retrieval

Add indexes based on measured query patterns.

---

# 69. Phase 35 Exit Criteria

- security audit completed
- rate limits documented
- AI cost controls exist
- production errors are observable
- background workers recover safely
- database indexes reflect real query patterns
- load tests cover critical endpoints
- backup/restore expectations are documented

---

# 70. Phase 36 — Deployment & Release Engineering

## Objective

Create a reproducible production deployment and release workflow.

---

# 71. Deployment Architecture

Final infrastructure should support:

```text
Frontend
Backend API
Worker
MongoDB
Secrets
Logs
Monitoring
```

Production topology must keep AI credentials exclusively on server infrastructure.

---

# 72. CI/CD

Target pipeline:

```text
Pull Request
 ↓
Lint
 ↓
Typecheck
 ↓
Unit Tests
 ↓
Integration Tests
 ↓
AI Offline Tests
 ↓
Build
 ↓
Security Checks
 ↓
Deploy Preview / Staging
 ↓
Production Approval
 ↓
Production
```

---

# 73. Environment Strategy

At minimum:

```text
development
test
production
```

Potentially:

```text
staging
```

Secrets must never live in Git.

---

# 74. Database Migration Strategy

By Phase 36, schema evolution must have a formal process.

This becomes particularly important after:

- planning entities
- dependencies
- milestones
- memory
- workspaces
- membership
- RBAC

Migration scripts must be:

```text
repeatable
observable
recoverable
```

---

# 75. Release Strategy

Establish:

- semantic versioning strategy if appropriate
- changelog process
- migration documentation
- rollback procedures
- environment verification
- release checklist

---

# 76. Phase 36 Exit Criteria

- production deployment is reproducible
- CI/CD gates releases
- secrets are externally managed
- migrations have a formal workflow
- worker deployment is supported
- health checks exist
- rollback procedure exists
- staging/prod environment differences are documented
- release verification is automated where possible

---

# 77. Cross-Phase Architectural Invariants

The following rules apply to every future phase.

## AI Invariant 1 — Provider Credentials Stay Server-Side

Never expose:

```text
GEMINI_API_KEY
ANTHROPIC_API_KEY
```

to the browser.

---

## AI Invariant 2 — Client Does Not Select Providers

Forbidden client payload:

```json
{
  "provider": "gemini",
  "model": "gemini-..."
}
```

The client requests capability.

The backend determines execution.

---

## AI Invariant 3 — Structured Output Before Persistence

Required:

```text
Provider
 ↓
Structured Response
 ↓
Zod
 ↓
Domain Validation
 ↓
Persistence
```

---

## AI Invariant 4 — AIService Does Not Own Domain Persistence

Maintain:

```text
AIService
    ↓
validated data

Domain Service
    ↓
database
```

---

## AI Invariant 5 — Bounded Provider Fallback

Maximum:

```text
Primary + one fallback
```

unless a future phase explicitly redesigns and re-approves the policy.

---

## AI Invariant 6 — Telemetry Privacy

Never log:

- prompts
- raw responses
- credentials
- secrets
- private project content

unless a future explicitly designed secure debugging system defines an approved mechanism.

---

## AI Invariant 7 — No Fabricated Metrics

Unknown telemetry values remain unknown.

---

## AI Invariant 8 — Offline CI

Normal CI must perform:

```text
0 live Gemini calls
0 live Anthropic calls
```

Live-provider tests must remain explicit and separately invoked.

---

# 78. Frontend Invariants

## Frontend Invariant 1 — TanStack Query Owns Server State

Do not place:

```text
projects
tasks
AI responses
plans
chat history from server
notifications
```

inside Zustand merely for convenience.

---

## Frontend Invariant 2 — Zustand Remains Client-State Focused

Appropriate examples:

```text
authentication/session state
purely client-side preferences if needed
```

---

## Frontend Invariant 3 — Centralized HTTP Layer

All standard HTTP requests must flow through:

```text
apiClient
```

Feature-specific APIs wrap it.

Components should never contain random raw Axios calls.

---

## Frontend Invariant 4 — Feature Ownership

Prefer:

```text
features/
  planning/
  ai/
  projects/
  tasks/
```

over accumulating unrelated logic inside generic component directories.

---

# 79. Domain Invariants

## Domain Invariant 1 — Authorization Happens Outside AI

The model cannot determine whether a user is authorized.

Authorization belongs to application code.

---

## Domain Invariant 2 — Domain Services Own Mutations

AI actions must reuse existing domain services or deliberately designed command handlers.

---

## Domain Invariant 3 — Audit Important Mutations

Meaningful project/task changes should remain visible through activity/audit infrastructure.

---

## Domain Invariant 4 — Preserve Optimistic Concurrency

Task OCC must not be silently bypassed by AI actions or future collaboration infrastructure.

---

# 80. AI Safety Boundary

The most important future architecture boundary is:

```text
┌────────────────────┐
│        LLM         │
└─────────┬──────────┘
          │
          │ proposes
          ▼
┌────────────────────┐
│ Structured Output  │
└─────────┬──────────┘
          │
          │ validate
          ▼
┌────────────────────┐
│ Application Rules  │
└─────────┬──────────┘
          │
          │ authorize
          ▼
┌────────────────────┐
│ Human Confirmation │
│ where required     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Domain Service   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│      Database      │
└────────────────────┘
```

The LLM remains an untrusted reasoning component.

It is not the authorization system.

It is not the database layer.

It is not the domain layer.

---

# 81. Phase Governance Strategy

Not every phase requires the same governance complexity.

Governance should scale with architectural risk.

---

# 82. Governance Level A — High-Risk Architecture Phase

Use approximately:

```text
Investigation
 ↓
Contract
 ↓
Specification
 ↓
Gate 1
 ↓
Prototype / Blockade if needed
 ↓
Gate 2
 ↓
Work Packages
 ↓
Gate 3
 ↓
Manual Verification
 ↓
Gate 4
```

Recommended for:

```text
Phase 25 — Planning
Phase 28 — Controlled Actions
Phase 32 — Workspaces
Phase 33 — RBAC
```

---

# 83. Governance Level B — Medium-Risk Capability Phase

Use approximately:

```text
Investigation
 ↓
Contract
 ↓
Gate 1
 ↓
Work Packages
 ↓
Gate 2
 ↓
Final Verification
```

Recommended for:

```text
Phase 26 — Evaluation
Phase 27 — Copilot
Phase 29 — Memory
Phase 30 — Proactive Intelligence
Phase 34 — Real-Time
```

---

# 84. Governance Level C — Product / Infrastructure Phase

A lighter flow may be appropriate:

```text
Audit
 ↓
Implementation Plan
 ↓
Implementation
 ↓
Verification
```

Possible candidates:

```text
Phase 31 — Search
Phase 35 — Hardening
Phase 36 — Deployment
```

This is not a rule.

If investigation exposes major architectural uncertainty, governance may increase.

---

# 85. Blockade Policy

A blockade exists only when implementation cannot safely proceed without resolving an uncertainty experimentally.

Good blockade:

```text
Can our MongoDB deployment support the transaction semantics required for atomic plan commits?
```

Good blockade:

```text
Can the proposed context budget support realistic project sizes without exceeding model constraints?
```

Bad blockade:

```text
Let's prototype because prototypes sound rigorous.
```

Experiments must answer a decision.

---

# 86. Definition of Done for Every AI Phase

An AI phase cannot close merely because the feature works once.

At minimum:

### Architecture

- ownership boundaries documented
- scope boundaries documented
- data flow understood

### Implementation

- typed contracts
- validation
- error handling
- authorization where relevant

### Testing

- happy path
- malformed output
- unauthorized access
- provider failures where relevant
- regression tests
- zero live AI calls during normal CI

### Repository Quality

```bash
npm run verify
git diff --check
```

must pass.

### Manual Verification

User-visible phases require browser verification.

### Documentation

The phase must contain sufficient evidence for a future engineer to understand why the architecture exists.

---

# 87. Roadmap Risk Register

## Risk 1 — Planning Data Corruption

Severity:

```text
HIGH
```

Mitigation:

- draft plans
- schema validation
- dependency validation
- cycle detection
- approval
- safe commit semantics

---

## Risk 2 — AI Action Overreach

Severity:

```text
CRITICAL
```

Mitigation:

- typed action proposals
- independent authorization
- confirmation
- domain-service execution
- audit logs

---

## Risk 3 — Cross-User Context Leakage

Severity:

```text
CRITICAL
```

Affected phases:

```text
Copilot
Memory
Search
Workspaces
RAG
```

Mitigation:

authorization must occur during retrieval, not after model generation.

---

## Risk 4 — Premature Vector Infrastructure

Severity:

```text
MEDIUM
```

Mitigation:

prove structured retrieval limitations before introducing embeddings.

---

## Risk 5 — AI Quality Regression

Severity:

```text
HIGH
```

Mitigation:

Phase 26 evaluation framework and versioned prompts.

---

## Risk 6 — Excessive AI Cost

Severity:

```text
MEDIUM → HIGH
```

Mitigation:

- deterministic preprocessing
- context budgets
- rate limits
- model tiers
- telemetry
- background-analysis limits

---

## Risk 7 — Collaboration Authorization Complexity

Severity:

```text
HIGH
```

Mitigation:

centralized RBAC before real-time collaboration.

---

# 88. Product Evolution

The roadmap intentionally evolves Odet-X through four broad product eras.

---

## Era I — AI Infrastructure

```text
20 Foundation
21 Observability
22 Resilience
23 Routing
```

Result:

> Odet-X can reliably execute structured AI workloads.

---

## Era II — AI Product Integration

```text
24 Frontend AI Integration
25 Planning
26 Evaluation
```

Result:

> Odet-X can generate useful, reviewable project intelligence and measure its quality.

---

## Era III — AI Project Partner

```text
27 Copilot
28 Controlled Actions
29 Memory
30 Proactive Intelligence
```

Result:

> Odet-X can understand projects, discuss them, remember useful information, recommend changes, and safely assist with execution.

---

## Era IV — Collaborative Platform

```text
31 Search
32 Workspaces
33 RBAC
34 Real-Time
35 Hardening
36 Deployment
```

Result:

> Odet-X evolves from a personal AI project manager into a production-capable collaborative project platform.

---

# 89. Target Product Architecture After Phase 30

```text
                         ODET-X AI SYSTEM

                              USER
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
             ▼                 ▼                  ▼
        PLANNING           COPILOT          AI ACTIONS
             │                 │                  │
             └─────────────────┼──────────────────┘
                               │
                               ▼
                    AI APPLICATION LAYER
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
      CONTEXT              ACTIONS             MEMORY
      BUILDER              ENGINE             RETRIEVAL
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
                          AI SERVICE
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
                AI ROUTER             TELEMETRY
                    │
                    ▼
              PROVIDER FACTORY
                    │
             ┌──────┴──────┐
             ▼             ▼
          GEMINI        ANTHROPIC
```

---

# 90. Target Product Architecture After Phase 36

```text
┌──────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                                                              │
│ Dashboard                                                    │
│ Projects                                                     │
│ Planning                                                     │
│ Tasks                                                        │
│ Copilot                                                      │
│ Search                                                       │
│ Notifications                                                │
│ Workspaces                                                   │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│                                                              │
│ Authentication                                               │
│ Authorization / RBAC                                         │
│ Projects                                                     │
│ Tasks                                                        │
│ Planning                                                     │
│ AI                                                           │
│ Search                                                       │
│ Workspaces                                                   │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌────────────────────────────┐   ┌────────────────────────────┐
│       DOMAIN SERVICES      │   │       AI PLATFORM          │
│                            │   │                            │
│ Projects                   │   │ AIService                  │
│ Tasks                      │   │ AIRouter                   │
│ Planning                   │   │ Providers                  │
│ Membership                 │   │ Evaluation                 │
│ Permissions                │   │ Context                    │
│ Notifications              │   │ Memory                     │
│ Activities                 │   │ Actions                    │
└─────────────┬──────────────┘   │ Recommendations            │
              │                  └─────────────┬──────────────┘
              │                                │
              └───────────────┬────────────────┘
                              ▼
                       PERSISTENCE
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
               MongoDB             Vector Retrieval
                                   if justified
```

---

# 91. What We Deliberately Do Not Build Yet

This roadmap intentionally avoids prematurely introducing:

```text
Autonomous AI agents
Multi-agent orchestration
AI directly modifying MongoDB
Unlimited tool calling
Vector databases before retrieval evidence
Complex distributed queues before workload evidence
Microservices
Kubernetes
Event sourcing
CRDT collaboration
Custom model training
Fine-tuning without evaluation evidence
```

These technologies may become useful.

They are not goals by themselves.

Architecture must respond to actual product requirements.

---

# 92. Immediate Next Action

The next engineering phase is:

```text
PHASE 25 — AI PROJECT PLANNING ENGINE
```

Do not begin implementation immediately.

The first step should be a repository-grounded Phase 25 investigation.

That investigation should answer:

1. What exactly constitutes a valid Odet-X project plan?
2. Which planning concepts belong in the permanent domain model?
3. Should draft plans persist in MongoDB?
4. How should dependencies be represented?
5. How should dependency cycles be detected?
6. Should milestones become first-class entities?
7. How should deterministic task ordering work?
8. How should temporary generated IDs map to MongoDB IDs?
9. What should happen if plan commit partially fails?
10. Can the current MongoDB environment support transactions?
11. What should happen to the existing `generate-tasks` capability?
12. Can the existing `GenerateTasksDialog` evolve into planning, or should planning receive a dedicated surface?
13. What plan size limits should exist?
14. Which planning data may users edit before approval?
15. What activity/audit records should plan generation and commitment create?

Only after those questions are grounded in repository evidence should the Phase 25 contract be written.

---

# 93. Canonical Roadmap Summary

```text
PHASE 20  ✓  Multi-Provider AI Foundation + Gemini
PHASE 21  ✓  AI Observability & Usage Intelligence
PHASE 22  ✓  Provider Fallback & Resilience
PHASE 23  ✓  Intelligent AI Provider Routing
PHASE 24  ✓  Frontend Foundation & AI Integration

────────────────────────────────────────────────

PHASE 25  →  AI Project Planning Engine
PHASE 26  →  AI Evaluation & Quality Foundation
PHASE 27  →  Read-Only Project Copilot
PHASE 28  →  Controlled AI Actions
PHASE 29  →  Project Memory & Retrieval
PHASE 30  →  Proactive Project Intelligence

────────────────────────────────────────────────

PHASE 31  →  Global Search & Command Palette
PHASE 32  →  Workspaces & Memberships
PHASE 33  →  RBAC & Collaboration
PHASE 34  →  Real-Time Collaboration
PHASE 35  →  Production Hardening
PHASE 36  →  Deployment & Release Engineering
```

---

# 94. Final Direction

The next objective is not to add as many AI features as possible.

The objective is to progressively increase the amount of useful responsibility Odet-X can safely handle.

The progression is deliberate:

```text
Generate
   ↓
Plan
   ↓
Measure
   ↓
Understand
   ↓
Recommend
   ↓
Propose
   ↓
Act with approval
   ↓
Remember
   ↓
Anticipate
```

At every stage:

```text
AI capability
must grow together with
application control.
```

That principle should remain the foundation of the Odet-X architecture.

---

**Current Roadmap Position**

```text
Phase 24
Frontend Foundation & AI Integration
                 │
                 │ COMPLETE
                 ▼
════════════════════════════════════════
                 │
                 ▼
Phase 25
AI Project Planning Engine
                 │
                 ▼
Phase 26
AI Evaluation & Quality Foundation
                 │
                 ▼
Phase 27
Read-Only Project Copilot
                 │
                 ▼
Phase 28
Controlled AI Actions
                 │
                 ▼
Phase 29
Project Memory & Retrieval
                 │
                 ▼
Phase 30
Proactive Project Intelligence
                 │
                 ▼
Phase 31–36
Collaborative Production Platform
```

> **NEXT AUTHORIZED ROADMAP ACTION:**
> Begin **Phase 25 — AI Project Planning Engine** with a read-only repository investigation and architectural discovery pass. Do not modify production code during the investigation.