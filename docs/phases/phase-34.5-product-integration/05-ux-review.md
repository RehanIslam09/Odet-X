# 05 — Modern SaaS UX Friction Audit & Polish Guidelines

**Author**: Staff UX Designer & Principal Frontend Engineer  
**Date**: August 2, 2026  
**Scope**: `@ai-project-manager/client` Visual Ergonomics & Interaction Quality  
**Benchmarks**: Linear, Notion, Raycast, Vercel  

---

## 1. Friction Points & UX Audit Findings

### A. Visual Noise & Redundancy
- **Constant Connection Status Badge**: `DashboardNavbar.tsx` displays a permanent green `Connected` pill. This adds unnecessary visual noise when the application is working normally.
  - *Fix*: Hide connection badge when socket is `CONNECTED`. Display an amber `Reconnecting...` or red `Offline` banner only when network drops.
- **Duplicate User Avatar & Online Indicator**: User avatar appears in both the top navbar (`UserMenu.tsx`) and left sidebar presence list (`DashboardSidebar.tsx`).
  - *Fix*: Consolidate top navbar right section to Notifications and User Dropdown, keeping presence lists clean in sidebar and document headers.

### B. State Management UX (Loading, Empty, Error)
- **Loading Skeletons**: Ensure all list and detail pages render pulse skeletons rather than raw text spinners (`AppLoader`).
- **Empty States**: Ensure every list (Projects, Tasks, Notifications, Activities, Members) renders an actionable empty state with a primary creation trigger button.
- **Error States**: Ensure all error fallback cards (`ErrorState.tsx`) include a retry button (`refetch()`) and explicit user-friendly error messages.

---

## 2. Page Quality Standard Checklist (Linear / Notion Standard)

| Page / Component | Skeletons | Empty State | Error State | Actionable Controls | Production Standard Verified? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `DashboardPage.tsx` | `DashboardSkeleton` | Custom Card | Retry Button | Unified Copilot / Quick Action | YES |
| `ProjectsDashboardPage.tsx` | Grid Skeleton | `ProjectEmptyState` | Inline Alert | Create Project Modal | YES |
| `ProjectDetailPage.tsx` | Detail Skeleton | `ProjectTasksEmpty` | Back Button | Edit/Delete/Archive/Copilot | YES |
| `TasksPage.tsx` | Table Skeleton | `TaskEmptyState` | NotFound Card | Filters/Search/Kanban Toggle | YES |
| `TaskDetailPage.tsx` | Detail Skeleton | N/A | NotFound Card | Status/Priority/Label AI | YES |
| `TaskNotesWorkspacePage.tsx` | Editor Skeleton | Blank Fallback | Save Error Pill | Auto-save & Presence | YES |
| `NotificationsPage.tsx` | Inbox Skeleton | Empty Inbox | Alert Banner | Mark Read / Mark All Read | YES |
| `ActivityPage.tsx` | Timeline Skeleton | Empty Activity | Error State | Infinite Scroll | YES |
| `WorkspaceMembersTab.tsx` | Table Skeleton | Empty Roster | Alert Banner | Member Removal / Self-Leave | YES |
