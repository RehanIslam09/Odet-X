# Phase 24 — Detailed Implementation Plan

## Overview

This implementation plan details the 3 execution packages for Phase 24:
- **WP-01**: Production Frontend Foundation
- **WP-02**: Backend Integration Architecture
- **WP-03**: AI Product Integration

---

## WP-01 — Production Frontend Foundation

### Objectives:
1. Verify and solidify the common application component layer (`PageHeader`, `PageContainer`, `EmptyState`, `ErrorState`, `AppLoader`).
2. Standardize form error mapping (`applyServerErrors`) and notification toast patterns across features.
3. Validate responsive container constraints and layout boundaries across desktop and mobile navigation.

### Target Directories / Files:
- `client/src/components/common/`
- `client/src/components/layout/`
- `client/src/utils/form-errors.ts`
- `client/src/utils/api-error.ts`

### New Files Anticipated:
- None (Foundation primitives are already clean and in place).

### Modifications Anticipated:
- Standardize any minor visual container padding inconsistencies in `PageContainer.tsx` or layout wrappers if needed during WP-01 verification.

### Dependencies / Shadcn Components:
- Uses existing installed components (`button`, `card`, `skeleton`, `avatar`, `sonner`).

### Required Tests:
- Run existing client tests (`npm test --prefix client`).

### Acceptance Criteria:
1. Client components compile with zero TypeScript or ESLint errors.
2. Common UI components demonstrate clean responsive behavior.
3. All 26 existing client unit tests pass without warnings.

---

## WP-02 — Backend Integration Architecture

### Objectives:
1. Create dedicated AI API client module (`ai.api.ts`) interfacing with backend endpoints.
2. Implement TanStack Query custom mutation hooks: `useGenerateTasks`, `useGenerateProjectSummary`, `useGenerateTaskLabels`.
3. Implement targeted query cache invalidations for tasks, project summaries, and activity logs.

### Target Directories / Files:
- `client/src/features/ai/services/ai.api.ts` [NEW]
- `client/src/features/ai/types/ai.types.ts` [NEW]
- `client/src/features/ai/hooks/useGenerateTasks.ts` [NEW]
- `client/src/features/ai/hooks/useGenerateProjectSummary.ts` [NEW]
- `client/src/features/ai/hooks/useGenerateTaskLabels.ts` [NEW]
- `client/src/features/ai/hooks/index.ts` [NEW]

### Modifications Anticipated:
- Export AI hooks from `client/src/features/ai/index.ts`.

### Required Tests:
- Unit tests for `ai.api.ts` (using `axios-mock-adapter` matching `services/axios.test.ts`).
- Unit tests for mutation hooks (`useGenerateTasks`, `useGenerateProjectSummary`, `useGenerateTaskLabels`).

### Acceptance Criteria:
1. `ai.api.ts` correctly handles typed response envelopes for all 3 backend AI endpoints.
2. Mutation hooks invoke `ai.api.ts`, handle loading/pending states, and trigger `queryClient.invalidateQueries`.
3. Unit tests verify API calls, success toasts, and error handling.

---

## WP-03 — AI Product Integration

### Objectives:
1. Build `GenerateTasksDialog.tsx` component allowing users to input a project description prompt and trigger AI task generation.
2. Add "Generate Tasks with AI" button on Project Detail workspace (`ProjectHeader.tsx` or `ProjectTasks.tsx`).
3. Add "Generate AI Summary" button on Project Detail workspace and build `ProjectAISummaryCard.tsx` to render `{ summary, highlights, risks }`.
4. Add "Auto-generate Labels" button on Task Detail workspace / `TaskPropertiesPanel.tsx`.
5. Ensure explicit pending (spinner/skeleton), success (toast + UI update), and error feedback for all 3 AI interactions.

### Target Directories / Files:
- `client/src/features/projects/components/GenerateTasksDialog.tsx` [NEW]
- `client/src/features/projects/components/ProjectAISummaryCard.tsx` [NEW]
- `client/src/features/projects/components/ProjectHeader.tsx` [MODIFY]
- `client/src/features/projects/pages/ProjectDetailPage.tsx` [MODIFY]
- `client/src/features/tasks/components/TaskPropertiesPanel.tsx` [MODIFY]
- `client/src/features/tasks/pages/TaskDetailPage.tsx` [MODIFY]

### Non-Scope Reminder:
- Generic "Ask AI" in `QuickActions.tsx` and `AIDailyBrief.tsx` must REMAIN disabled placeholders with coming-soon tooltips.
- Zero backend code changes.

### Acceptance Criteria:
1. User can open "Generate Tasks" dialog from Project Detail, enter a prompt, and see generated tasks populated in the project task list.
2. User can click "Generate AI Summary" on Project Detail and see the AI summary card update with structured summary, highlights, and risks.
3. User can click "Auto-generate Labels" on Task Detail and see new AI-generated label chips appended to the task properties.
4. Full automated test suite passes (`npm test`).
