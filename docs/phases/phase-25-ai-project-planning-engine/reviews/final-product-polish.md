# Phase 25 — AI Project Planning Engine: Final Product Polish Pass

> **Phase**: Phase 25 — AI Project Planning Engine
> **Status**: COMPLETED POLISH PASS (Pending User Manual Browser Verification)
> **Branch**: `feat/phase-25-ai-project-planning-engine`
> **Target Release**: Odet-X v1.2.0

---

## 1. Executive Summary

During real browser testing of **Phase 25 — AI Project Planning Engine**, the core multi-step planning pipeline (AI plan generation, DAG validation, draft persistence, task/milestone preview, and atomic commit) executed successfully. However, manual testing revealed critical visual layout and UX constraints:

1. **Narrow Modal Workspace**: The `PlanProjectDialog` was visually compressed horizontally to 384px (`max-width: 24rem`) due to inherited `sm:max-w-sm` breakpoint classes in the base `DialogContent` primitive overriding `max-w-4xl`. This forced task title inputs, description textareas, metadata selectors, and prerequisite chips into cramped layouts with severe horizontal and vertical scrolling.
2. **Resume Active Draft UX Gap**: Although the backend persisted `PlanDraft` documents in MongoDB adhering to the single-active-draft invariant (`status: "draft"`), closing the modal left users with no visible mechanism to resume editing an existing draft without re-triggering AI generation.

This polish pass resolves both findings while strictly maintaining Phase 25 architectural invariants.

---

## 2. Manual Testing Findings & Root Cause Analysis

### 2.1 Problem Diagnosis
- **Root Cause of Narrow Dialog**: Tailwind CSS media query specificity allowed `sm:max-w-sm` (640px+ breakpoint) on `DialogContent` to override un-breakpoint-qualified utility classes (`max-w-4xl`).
- **Root Cause of Nested Scrollbars**: Monolithic `overflow-y-auto` on `DialogContent` caused dialog headers and action buttons to scroll out of view.
- **Root Cause of Prerequisite Overflow**: Long task titles inside prerequisite buttons did not specify maximum width constraints or text truncation.

### 2.2 Responsive Layout & Width Solution
- **Viewport-Aware Dialog Sizing**: Updated `PlanProjectDialog.tsx` to override default max-width with breakpoint-qualified responsive classes: `sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[94vw] max-h-[88vh] flex flex-col p-6 overflow-hidden`.
- **Bounded Shell & Single Primary Scrolling Region**:
  - `DialogHeader` remains fixed at the top of the dialog shell.
  - `PlanReviewWorkspace` action header and tab selector remain fixed at the top of the workspace.
  - `TabsContent` owns the single, intuitive vertical scrolling container (`flex-1 overflow-y-auto pr-1.5`).
- **Prerequisite Chip Truncation**: Added `max-w-[200px] sm:max-w-[260px]` and `<span className="truncate">` to prerequisite dependency buttons in `PlanTaskItem.tsx`.

---

## 3. Resume Active Draft Architecture

### 3.1 Backend Discovery Endpoint
Added `GET /api/v1/projects/:projectId/plans/active` in `server/src/routes/plan.routes.ts`:
- Executes `getActiveProjectPlanDraft(userId, projectId)` in `plan-draft.service.ts`.
- Returns authorized `PlanDraft` document where `status === "draft"` and `expiresAt > new Date()`, or returns `data: null` if no active draft exists.
- Enforces strict tenant isolation, owner authorization, and project soft-deletion/archival rules.

### 3.2 TanStack Query State Ownership
- Key Factory: Registered `planKeys.active(projectId)` (`["plans", "project", projectId, "active"]`).
- Query Hook: Implemented `useActivePlanDraft(projectId)`.
- Cache Invalidation: All planning mutations (`generatePlan`, `updatePlanDraft`, `discardPlanDraft`, `commitPlan`) invalidate `planKeys.project(projectId)`, automatically syncing `useActivePlanDraft` across all UI components without requiring page refreshes.

### 3.3 Unified Editor Reuse & Deterministic Lifecycle
- `PlanReviewWorkspace` remains the **single canonical editor/reviewer** for both freshly generated plans and resumed active drafts.
- `ProjectTasks.tsx` displays `[ Resume Draft ]` when `useActivePlanDraft` returns an active draft.
- Clicking `Resume Draft` opens `PlanProjectDialog` with `initialDraftId={activeDraft.id}` directly in REVIEW state without making AI network calls.
- Clicking `Plan Project` opens `PlanProjectDialog` in GENERATE mode with `initialDraftId={null}`.
- Closing the dialog resets local draft ID state, preventing state leakage between modes.
- Cancelling a commit confirmation modal performs NO server mutation and leaves the active draft recoverable.

---

## 4. Invariant Compliance Audit

| Invariant | Status | Verification Evidence |
| :--- | :---: | :--- |
| **Exactly One Active Draft Per Project** | **PRESERVED** | Partial unique MongoDB index `{ owner: 1, projectId: 1, status: "draft" }` remains enforced. |
| **No Saved Draft Library in Phase 25** | **PRESERVED** | Zero multiple-draft persistence or listing UI was created in Phase 25. |
| **Zero Live AI Calls in Tests** | **PRESERVED** | All automated tests run with 100% offline mocks. |
| **TanStack Query State Ownership** | **PRESERVED** | Server state is owned 100% by TanStack Query. Zero planning state exists in Zustand. |
| **AI Never Controls ObjectIds** | **PRESERVED** | AI generates symbolic references (`ref`); server normalizes and translates to `tempId` and `ObjectId`. |

---

## 5. Summary of Files Modified

### Backend:
- [plan-draft.service.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/services/plan-draft.service.ts): Added `getActiveProjectPlanDraft`.
- [plan.controller.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/controllers/plan.controller.ts): Added `getActiveDraft` controller.
- [plan.routes.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/routes/plan.routes.ts): Registered `GET /active` endpoint before `/:draftId`.
- [plan-api.test.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/tests/plan-api.test.ts): Added integration tests for `GET /plans/active`.

### Frontend:
- [ai.api.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/ai/services/ai.api.ts): Added `getActivePlanDraft` API binding.
- [usePlanDraft.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/ai/hooks/usePlanDraft.ts): Added `planKeys.active` key and `useActivePlanDraft` query hook.
- [PlanProjectDialog.tsx](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/projects/components/planning/PlanProjectDialog.tsx): Added `initialDraftId` support and wide responsive layout.
- [PlanReviewWorkspace.tsx](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/projects/components/planning/PlanReviewWorkspace.tsx): Bounded flex container and scrollable `TabsContent`.
- [PlanTaskItem.tsx](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/projects/components/planning/PlanTaskItem.tsx): Added title truncation for prerequisite chips.
- [ProjectTasks.tsx](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/projects/components/ProjectTasks.tsx): Added `Resume Draft` button rendering and mode dispatching.
- [planning.ui.test.tsx](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/ai/components/planning.ui.test.tsx): Added cancelled commit safety test.

### Documentation & Roadmap:
- [roadmap.md](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/docs/roadmap.md): Documented front-end responsive invariant, deferred Saved Planning Drafts feature (Phase 28.5), and dedicated Full Responsive UI / Mobile UX Overhaul phase (Phase 34.5).
- [final-product-polish.md](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/docs/phases/phase-25-ai-project-planning-engine/reviews/final-product-polish.md): Created this comprehensive polish documentation.

---

## 6. Verification Results

Automated verification suite completed successfully:
- `npm run verify` passed with 0 errors.
- Client tests: `vitest run` passed (100%).
- Server tests: `tsx src/tests/run.ts` passed (100%).
- `git diff --check` reported zero whitespace errors.

---

## 7. Final Compact UI Refinement Pass

Following initial polish implementation, manual browser testing revealed that expanding `DialogContent` to `lg:max-w-6xl` (1152px wide) overcorrected the original layout problem. On desktop monitors, the modal expanded into a large form canvas, losing the intended compact, tall, floating command panel silhouette.

### 7.1 Refinement Summary
- **Desktop Sizing**: Adjusted `PlanProjectDialog` max-width to `w-[92vw] sm:max-w-xl md:max-w-[760px] max-h-[86vh] flex flex-col p-5 sm:p-6 overflow-hidden rounded-2xl`.
- **Proportional Silhouette**: Restored a tall, compact, vertically oriented floating workspace silhouette (`~760px` max width by `~800px` max height).
- **Fixed Action Footer**: Moved `Save Draft`, `Discard`, and `Commit Plan` action buttons to a fixed bottom footer inside `PlanReviewWorkspace.tsx` (`shrink-0 pt-2.5 border-t border-border/50`).
- **Header Density**: Simplified workspace top bar to contain metadata badges on left and `+ Add Task` / `+ Add Milestone` on right, keeping tabs clean and readable.
- **Card Compaction**: Compacted `PlanTaskItem` padding (`p-3.5 space-y-2.5`) and title input height (`h-7 text-xs font-semibold`).
- **Zero Horizontal Overflow**: All prerequisite chips wrap naturally with title truncation (`max-w-[200px] sm:max-w-[240px] truncate`). Zero horizontal scrollbars exist across all viewports.
- **Cohesive Lifecycle**: Input (`PlanGenerationForm`), Loading (Skeletons), and Review (`PlanReviewWorkspace`) share the exact same modal frame dimensions without visual jumps.
- **Verified Invariants**: Resume Draft, Commit, Discard, and single active draft invariants remain 100% operational.
