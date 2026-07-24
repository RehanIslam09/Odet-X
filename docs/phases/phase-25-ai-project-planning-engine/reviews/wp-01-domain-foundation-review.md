# Phase 25 — WP-01 Domain Foundation Review

## 1. Review Scope
This document presents the formal technical review for **WP-01 — Planning Domain Foundation & Schema Extensions** of **Phase 25 — AI Project Planning Engine**.

---

## 2. Repository Baseline
- **Branch**: `feat/phase-25-ai-project-planning-engine`
- **Head Commit**: `4c84c7861731a2f584c99d1a9806cfce9ac72f89`
- **Working Tree Status**: Clean (only untracked docs and WP-01 implementation files).
- **Node Environment**: Node `v20.20.2` | NPM `10.8.2`
- **Verification Pipeline**: `npm run verify` passing 100% (40/40 client tests, 24/24 server test suites, 16/16 telemetry tests, TypeScript typecheck clean, server smoke test clean).

---

## 3. Contract Requirements
WP-01 is authorized to implement ONLY:
1. Permanent `Task` model planning extensions (`dependencies`, `position`, `milestoneId`).
2. First-class `Milestone` Mongoose model.
3. Persisted `PlanDraft` Mongoose model (`status`: `"draft"`, `"committed"`, `"discarded"`).
4. Pure `PlanValidator` domain utility enforcing Directed Acyclic Graph (DAG) cycle detection (Kahn's algorithm), reference integrity, tempId uniqueness, and plan cardinality.
5. Task soft deletion prerequisite guard blocking deletion of tasks that serve as prerequisites for active tasks.

---

## 4. Files Changed
### Created
- `server/src/constants/planning.ts`
- `server/src/models/milestone.model.ts`
- `server/src/models/plan-draft.model.ts`
- `server/src/domain/plan-validator.ts`
- `server/src/tests/plan-validator.test.ts`
- `server/src/tests/planning-domain.test.ts`
- `docs/phases/phase-25-ai-project-planning-engine/reviews/wp-01-domain-foundation-review.md`

### Modified
- `server/src/models/task.model.ts`
- `server/src/services/task.service.ts`

---

## 5. Task Model Extensions
- Added `dependencies: Types.ObjectId[]` (default `[]`).
- Added `position: number` (default `1`, integer $\ge 1$).
- Added `milestoneId: Types.ObjectId | null` (default `null`).
- Added compound multikey index `{ owner: 1, dependencies: 1 }`.
- Preserved existing `toJSON` transform and optimistic concurrency control (`__v` mapped to `version`).

---

## 6. Milestone Model
- Created `Milestone` Mongoose model (`owner`, `projectId`, `title`, `description`, `targetDate`, `position`, `isDeleted`, `timestamps`).
- Added compound lookup index `{ owner: 1, projectId: 1, isDeleted: 1, position: 1 }`.

---

## 7. PlanDraft Model
- Created `PlanDraft` Mongoose model (`owner`, `projectId`, `status`, `promptDescription`, `tasks`, `milestones`, `expiresAt`, `timestamps`).
- Added TTL index `{ expiresAt: 1 }` with `{ expireAfterSeconds: 0 }`.

---

## 8. PlanDraft Lifecycle Support
- Allowed status enum values: `"draft"`, `"committed"`, `"discarded"`. Default: `"draft"`.

---

## 9. Draft Cardinality Protection
- Added partial unique index `{ owner: 1, projectId: 1 }` with `partialFilterExpression: { status: "draft" }`.
- Guarantees at the database level that a project can have at most **ONE active draft plan** concurrently.

---

## 10. PlanValidator Architecture
- Pure, side-effect-free domain utility (`server/src/domain/plan-validator.ts`).
- Zero database calls, zero HTTP dependencies, zero AI provider dependencies.
- Returns normalized `ValidatedPlan` or throws `BadRequestError`.

---

## 11. Dependency Edge Semantics
- `Task B.dependencies = [Task A]` strictly means **Task B depends on Task A** (Task A is a prerequisite for Task B).
- Validated via Kahn's algorithm by adding edges `Task A` $\rightarrow$ `Task B` and incrementing in-degree of `Task B`.

---

## 12. Reference Integrity
- Validates that every task `tempId` and milestone `tempId` is non-empty and unique within its draft array.
- Validates that `milestoneTempId` references an existing milestone in the plan.
- Validates that every dependency `tempId` references an existing task in the plan.

---

## 13. DAG Cycle Detection
- Implements Kahn's topological sort algorithm.
- Any circular dependency (self-reference, 2-node cycle, 3-node cycle, or N-node transitive cycle) is rejected with `BadRequestError("Dependency cycle detected in plan...")`.

---

## 14. Ordering Validation
- Validates `position` as integer $\ge 1$ for both tasks and milestones.

---

## 15. Dependency Deletion Integrity
- Extended `deleteTask()` in `server/src/services/task.service.ts` with a prerequisite guard.
- Soft-deleting a task referenced as a prerequisite by active tasks (`isDeleted: false`) throws `ConflictError("Cannot delete task because it is a prerequisite for X active task(s).")`.

---

## 16. Backward Compatibility
- Task creation without planning fields (`Task.create({ owner, title })`) defaults to `dependencies: []`, `position: 1`, `milestoneId: null`.
- Existing Phase 24 task creation, update, list, and soft delete behaviors remain 100% operational and backward-compatible.

---

## 17. Security Boundaries
- All models enforce tenant isolation via `owner: Types.ObjectId`.
- `PlanValidator` is pure and database-independent.

---

## 18. Test Coverage
- `server/src/tests/plan-validator.test.ts`: **23 unit tests** (100% passing).
- `server/src/tests/planning-domain.test.ts`: **10 integration tests** (100% passing).

---

## 19. Verification Results
- `npm run lint`: Clean (0 errors).
- `npm run typecheck`: Clean (0 errors).
- `npm run test`: All 24 test suites passed.
- `npm run build`: Server & client built clean.
- `npm run smoke`: Server smoke test passed.
- `npm run verify`: Passed 100%.

---

## 20. Scope Audit
- Client files modified: **NO**
- AI subsystem files modified: **NO**
- Route/controller files modified: **NO**
- Packages modified: **NO**
- Live Gemini calls: **0**
- Live Anthropic calls: **0**

---

## 21. Findings
- **BLOCKER Count**: 0
- **MAJOR Count**: 0
- **MINOR Count**: 0
- **NOTE Count**: 1 (WP-01 foundation implemented cleanly according to contract).

---

## 22. Required Corrections
- **None.**

---

## 23. WP Verdict

```
============================================================
WP-01 VERDICT: WP-01: APPROVED — READY FOR WP-02
============================================================
```

---

## 24. Exact Next Authorized Action
Proceed to execute **WP-02 — AI Plan Generation Subsystem**.
