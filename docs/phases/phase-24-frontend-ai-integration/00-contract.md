# Phase 24 — Contract & Governance

## Problem Statement

The backend AI subsystem is fully implemented, tested, and manually verified against real Gemini calls (Phases 20–23). However, the client application currently has **zero integration** with any backend AI capability.

While UI elements like `"Ask AI"` in `QuickActions.tsx` and `AIDailyBrief.tsx` exist, they currently display `"The AI assistant is coming soon."` tooltips. Furthermore, genuine backend capabilities—specifically project task generation (`POST /api/v1/projects/:projectId/generate-tasks`), project summary generation (`POST /api/v1/projects/:projectId/generate-summary`), and task label generation (`POST /api/v1/tasks/:taskId/generate-labels`)—have no corresponding UI controls or API integrations in the frontend.

Phase 24 establishes a production-grade frontend architecture foundation and connects the existing backend AI capabilities into the product UX without expanding backend AI scope or attempting premature visual re-design.

---

## Objective

Establish a clean, scalable, production-ready frontend foundation and integrate the three existing backend AI capabilities:
1. AI Project Task Generation (`POST /projects/:projectId/generate-tasks`)
2. AI Project Summary Generation (`POST /projects/:projectId/generate-summary`)
3. AI Task Label Generation (`POST /tasks/:taskId/generate-labels`)

---

## Governance & Lifecycle

- **Risk Classification**: MEDIUM
- **Lifecycle Gates**:
  1. Blockade 1 — Complete Frontend Architecture Audit *(Current)*
  2. Gate 1 — Frontend Foundation Design Approval
  3. WP-01 — Production Frontend Foundation
  4. WP-02 — Backend Integration Architecture
  5. WP-03 — AI Product Integration
  6. Gate 2 — Implementation & Architecture Review
  7. Manual Browser Verification
  8. Gate 3 — Final Verification & Phase Closure

---

## Scope

### In-Scope (Phase 24)
- **Frontend Architecture Foundation (WP-01)**:
  - Establish canonical API client patterns (`ai.api.ts`).
  - Standardize TanStack Query key factories and error/loading handling.
  - Standardize notification/toast feedback using existing `sonner` configuration.
  - Consolidate reusable UI components (`PageHeader`, `EmptyState`, `ErrorState`, `AppLoader`).
  - Standardize responsive container and layout foundations.
- **Backend Integration Architecture (WP-02)**:
  - Implement `ai.api.ts` exposing typed backend AI endpoints.
  - Implement TanStack Query mutation hooks: `useGenerateTasks`, `useGenerateProjectSummary`, `useGenerateTaskLabels`.
  - Wire cache invalidation (invalidating `projectKeys`, `taskKeys`, `activityKeys`).
- **AI Product Integration (WP-03)**:
  - Add "Generate Tasks with AI" dialog/action on Project Detail page.
  - Add "Generate AI Summary" action and summary display card on Project Detail page.
  - Add "Auto-generate Labels" button on Task Detail page / Properties panel.
  - Provide clear loading, success, and error states during AI generation.

---

## Non-Scope (Explicit Exclusion)

- **Generic AI Chat / Assistant**: No backend endpoint exists for conversational AI. The `"Ask AI"` tooltips must remain disabled placeholders.
- **Streaming AI Responses**: Backend returns structured JSON synchronously; no WebSocket/SSE/Server-Sent-Events exist.
- **New Backend AI Capabilities**: Zero backend code modifications.
- **Visual Re-branding & Decorative Micro-polish**: No color theme overhauls or arbitrary visual changes.
- **Kanban Drag-and-Drop Kanban**: Out of scope for Phase 24.
- **Command Palette / Global Search AI**: Out of scope.
- **Provider Routing / Fallback Controls in UI**: AI provider selection and resilience logic are strictly managed by the backend; no UI controls shall expose provider mechanics.

---

## Safety & Architecture Invariants

1. **No Provider SDKs or API Keys in Frontend**: No `@google/genai` or `@anthropic-ai/sdk` in client. No Gemini/Anthropic keys in frontend env.
2. **Backend API Boundary**: All AI operations must flow strictly through `/api/v1/projects` or `/api/v1/tasks` endpoints.
3. **No Provider Mechanics Exposure**: UI must not expose provider names, fallback triggers, or routing decisions.
4. **State Ownership**: Server state belongs in TanStack Query; global UI state in Zustand (`auth.store.ts`); form state in React Hook Form; local state in `useState`.
5. **No Direct Fetching in Components**: React components must invoke TanStack Query custom hooks; hooks invoke feature API modules; API modules call `apiClient`.
6. **Centralized Authentication**: Session bootstrap remains handled solely by `AuthBootstrap.tsx` with JWT in memory and HTTP-only refresh cookies.
7. **Explicit Feedback**: All AI mutations must render unambiguous pending/loading, success (toast/UI update), and error feedback.
8. **Unmodified Backend Contracts**: Existing backend endpoints (`/generate-tasks`, `/generate-summary`, `/generate-labels`) must be consumed strictly as specified.
9. **Accessibility & Responsiveness Baseline**: Responsive layouts and ARIA semantics must be preserved.
10. **No Component/Dependency Hoarding**: Zero npm packages or shadcn primitives installed unless strictly justified by Phase 24 requirements.

---

## Success Criteria

1. **Architecture Baseline Audit Complete**: Blockade 1 documents and inventories created with zero production code changes.
2. **Approved Design (Gate 1)**: Implementation plan approved before WP-01 execution begins.
3. **Functional AI Features**: User can generate project tasks, generate project summaries, and auto-generate task labels directly from the UI.
4. **Resilient UX**: Server errors (e.g. 500, 429) display actionable toast/inline notifications without breaking app state.
5. **100% Test & Build Pass**: Existing 26 client tests remain passing, alongside new AI hook and component tests.
