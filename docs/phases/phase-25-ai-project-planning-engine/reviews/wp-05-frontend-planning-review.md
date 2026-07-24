# Phase 25 — WP-05 Frontend Planning Review

## 1. Review Scope
This document presents the formal technical review for **WP-05 — Frontend Planning Experience — AI Plan Generation, Draft Review, Editing, Discard & Commit** of **Phase 25 — AI Project Planning Engine**.

---

## 2. Repository Baseline
- **Branch**: `feat/phase-25-ai-project-planning-engine`
- **Head Commit**: `4c84c7861731a2f584c99d1a9806cfce9ac72f89`
- **Working Tree Status**: Clean (untracked documentation and implementation files only).
- **Node Environment**: Node `v20.20.2` | NPM `10.8.2`
- **Verification Pipeline**: `npm run verify` passing 100% (45/45 client tests, 29/29 server test suites, 16/16 telemetry tests, typecheck clean, client/server builds clean, server smoke test clean).

---

## 3. Prior WP Dependencies Consumed
WP-05 consumes the complete Phase 25 backend stack built in WP-01 through WP-04:
- Planning Engine contracts & Mongoose schemas (`PlanDraft`, `Task`, `Milestone`).
- Pure DAG validation engine (`PlanValidator`).
- AI Plan Generation Subsystem (`ProjectPlanningAIService`).
- Plan Commitment & Audit Service (`PlanCommitService`).
- Backend HTTP Planning API endpoints (`/api/v1/projects/:projectId/plans/*`).

---

## 4. Files Created
- `client/src/constants/planning.ts`
- `client/src/features/ai/hooks/usePlanDraft.ts`
- `client/src/features/projects/components/planning/PlanGenerationForm.tsx`
- `client/src/features/projects/components/planning/PlanReviewWorkspace.tsx`
- `client/src/features/projects/components/planning/PlanTaskItem.tsx`
- `client/src/features/projects/components/planning/PlanMilestoneItem.tsx`
- `client/src/features/projects/components/planning/PlanProjectDialog.tsx`
- `client/src/features/ai/components/planning.ui.test.tsx`
- `docs/phases/phase-25-ai-project-planning-engine/reviews/wp-05-frontend-planning-review.md`

---

## 5. Files Modified
- `client/src/features/ai/types/ai.types.ts`
- `client/src/features/ai/services/ai.api.ts`
- `client/src/features/ai/hooks/index.ts`
- `client/src/features/projects/components/ProjectTasks.tsx`

---

## 6. Frontend Architecture
- **State Ownership**:
  - TanStack Query owns `PlanDraft` server state. No plan draft data is stored in Zustand (Zustand remains auth/session only).
  - React local component state owns ephemeral dialog state (`activeDraftId`, `localDraft`, tab selection, modal visibility).
- **HTTP Transport**: 100% of planning HTTP traffic flows through `client/src/services/axios.ts` via `aiApi`. Zero `fetch` or direct `axios` calls in components.
- **Provider Abstraction**: Provider models, fallback logic, API keys, and SDK response structures remain 100% invisible to the frontend.

---

## 7. Type Contracts
- `PlanDraft` (id, owner, projectId, status, promptDescription, tasks, milestones, expiresAt, createdAt, updatedAt).
- `PlanDraftTask` (tempId, title, description, priority, estimatedTime, position, dependencies, milestoneTempId).
- `PlanDraftMilestone` (tempId, title, description, targetDate, position).
- `GeneratePlanDto` (description: string).
- `UpdatePlanDraftDto` (tasks?: PlanDraftTask[], milestones?: PlanDraftMilestone[]).
- `CommitPlanResultData` (draftId, projectId, taskCount, milestoneCount, tasks, milestones).

---

## 8. API Layer
Extended `aiApi` object in `client/src/features/ai/services/ai.api.ts`:
- `generatePlan(projectId, data)`
- `getPlanDraft(projectId, draftId)`
- `updatePlanDraft(projectId, draftId, data)`
- `discardPlanDraft(projectId, draftId)`
- `commitPlan(projectId, draftId)`

---

## 9. Query Key Architecture
- `planKeys.all`: `["plans"]`
- `planKeys.project(projectId)`: `["plans", "project", projectId]`
- `planKeys.detail(projectId, draftId)`: `["plans", "project", projectId, draftId]`

---

## 10. Mutation Hooks
- `useGeneratePlan(projectId)`
- `usePlanDraft(projectId, draftId)`
- `useUpdatePlanDraft(projectId, draftId)`
- `useDiscardPlanDraft(projectId, draftId)`
- `useCommitPlan(projectId, draftId)`

---

## 11. Cache Invalidation Strategy
- **Generate**: `queryClient.setQueryData(planKeys.detail(...), draft)` and invalidates `planKeys.project(projectId)`.
- **Save Draft**: `queryClient.setQueryData(planKeys.detail(...), draft)`.
- **Discard Draft**: Removes `planKeys.detail(...)` and invalidates `planKeys.project(projectId)`.
- **Commit Draft**:
  - `queryClient.invalidateQueries({ queryKey: projectKeys.all })` (invalidates project details, summary, and lists)
  - `queryClient.invalidateQueries({ queryKey: ["tasks"] })` (refreshes project task list)
  - `queryClient.invalidateQueries({ queryKey: ["activities"] })` (refreshes activity feed)
  - `queryClient.invalidateQueries({ queryKey: planKeys.project(projectId) })`

---

## 12. Plan Project Entry Point
- Added **"Plan Project"** action button next to **"Generate Tasks"** in `ProjectTasks.tsx`.
- Features primary AI accent styling with Sparkles icon, opening `PlanProjectDialog`.

---

## 13. Generation Form UX
- `PlanGenerationForm.tsx`: Textarea input for outcome description (max 2000 chars) with live character counter.
- Disabled submit for empty or whitespace-only prompts.

---

## 14. Loading UX
- Skeleton loading state with animated text: `"Generating structured project plan..."`.
- Disables form inputs and action buttons during generation.

---

## 15. Review Workspace Architecture
- `PlanReviewWorkspace.tsx`: Header stats bar displaying Tasks Count, Milestones Count, Draft Status, and Unsaved Changes badge.
- Tabbed workspace for switching between Task Editor and Milestone Editor views.

---

## 16. Task Editing Behavior
- `PlanTaskItem.tsx`: Editable inputs for Title (max 120), Description (max 2000), Priority select (`none`, `low`, `medium`, `high`, `urgent`), Estimated Time (e.g. `4h`, `1d`), Milestone Assignment select, and Remove Task button.

---

## 17. Milestone Editing Behavior
- `PlanMilestoneItem.tsx`: Editable inputs for Phase Title (max 120), Objectives & Description (max 1000), Target Completion Date, and Remove Milestone button.

---

## 18. Dependency Editing Behavior
- Interactive prerequisite selector displaying available draft tasks with titles.
- Automatically excludes self-task to prevent self-dependency selection.

---

## 19. Ordering Behavior
- Tasks and Milestones preserve deterministic 1-based positions (`position: idx + 1`). Removing an item automatically re-indexes positions.

---

## 20. Add / Remove Behavior
- Add Task button (disabled when task count $\ge 25$).
- Add Milestone button (disabled when milestone count $\ge 5$).
- Removing a task strips dependency references to that task from remaining tasks.
- Removing a milestone clears milestone assignment on assigned tasks.

---

## 21. Draft Save Behavior
- "Save Draft" button triggers `useUpdatePlanDraft` (`PATCH /api/v1/projects/:projectId/plans/:draftId`).
- Disabled when local state matches server state (not dirty).

---

## 22. Unsaved-Change Behavior
- Visual "Unsaved Changes" badge appears when local draft state differs from server draft.
- Attempting to commit with unsaved changes automatically triggers `onSave` prior to executing commit mutation.

---

## 23. Discard Behavior
- Discard button triggers an explicit confirmation dialog (`AlertDialog` modal).
- On confirmation, executes `useDiscardPlanDraft` (`DELETE /api/v1/projects/:projectId/plans/:draftId`), closes dialog, and displays Sonner toast `"Plan draft discarded."`.

---

## 24. Commit Behavior
- Commit Plan button triggers an explicit confirmation dialog (`AlertDialog` modal) displaying target task and milestone counts.
- On confirmation, executes `useCommitPlan` (`POST /api/v1/projects/:projectId/plans/:draftId/commit`).
- On success, invalidates all project and task query caches, closes dialog, and displays Sonner toast.

---

## 25. Error Handling
- Operational errors pass through `getApiError(error)` utility and render via Sonner toast (`toast.error(err.message)`).
- Local draft edits are preserved on backend validation error (e.g. server-detected cycle).

---

## 26. Accessibility Review
- All dialogs leverage Radix UI accessible modal primitives with focus trapping, `DialogTitle`, and `DialogDescription`.
- Text inputs and selects have associated `Label` components.
- Buttons have accessible text labels and disabled states.

---

## 27. Responsive Design Review
- Dialog uses `max-w-4xl max-h-[90vh] overflow-y-auto`.
- Workspace scroll containers constrain task/milestone lists to `max-h-[50vh]` to prevent viewport overflowing.

---

## 28. Legacy Generate Tasks Regression
- `GenerateTasksDialog` and `POST /api/v1/projects/:id/generate-tasks` remain 100% operational and untouched.

---

## 29. Phase 24 AI Regression
- `ProjectAISummaryCard` (`generateSummary`) and `TaskPropertiesPanel` (`generateLabels`) remain 100% operational.

---

## 30. Ask AI Placeholder Boundary
- Generic Ask AI assistant placeholders (`QuickActions.tsx`, `AIDailyBrief.tsx`) remain disabled placeholders per scope boundaries.

---

## 31. Automated Test Results
- `client/src/features/ai/components/planning.ui.test.tsx`: 5 test cases passing 100%.
- Total client tests: 45/45 passing 100%.
- Total server test suites: 29/29 passing 100%.

---

## 32. Verification Results
- `npm run lint`: Clean (0 errors).
- `npm run typecheck`: Clean (0 errors).
- `npm run test`: All client and server tests passed.
- `npm run build`: Server & client built cleanly.
- `npm run smoke`: Server smoke test passed.
- `npm run verify`: Passed 100%.

---

## 33. Security Findings
- Zero credential leakage or AI provider SDK knowledge exposed to client.

---

## 34. Scope Audit
- Client planning files created/modified: **YES** (WP-05 scope).
- Server files modified: **NO**
- Packages modified: **NO**
- Live Gemini calls: **0**
- Live Anthropic calls: **0**

---

## 35. Findings
- **BLOCKER Count**: 0
- **MAJOR Count**: 0
- **MINOR Count**: 0
- **NOTE Count**: 1 (WP-05 Frontend Planning Experience implemented and verified clean).

---

## 36. Required Corrections
- **None.**

---

## 37. WP Verdict

```
============================================================
WP-05 VERDICT: WP-05: APPROVED — READY FOR GATE 2
============================================================
```

---

## 38. Exact Next Authorized Action
Proceed to execute **GATE 2 — FINAL IMPLEMENTATION VERIFICATION & PHASE 25 CLOSURE**.
