# 06 — Modern SaaS UX/UI & Architectural Design Review

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Benchmarks Evaluated**: Linear, Notion, GitHub, Raycast  
**Audit Purpose**: Identify UX friction points, visual redundancies, layout inefficiencies, and navigation bottlenecks across the frontend, producing actionable recommendations for product refinement.

---

## 1. UX & Visual Inconsistencies Audit

### A. Navigation & Top Header Clutter
- **Duplicate User Avatar & Online Indicator**:
  - *Observation*: Top navbar (`DashboardNavbar.tsx`) displays a user avatar with online status badge alongside the presence list in `DashboardSidebar.tsx`. Furthermore, the viewing awareness avatar pile appears in the top header when editing task notes.
  - *Benchmark Reference (Linear / Raycast)*: Linear keeps the top header minimal, reserving user menu actions for a unified bottom-left sidebar user widget or compact top-right dropdown, keeping the header clean for document-level breadcrumbs and context controls.
  - *Recommendation*: Move presence awareness exclusively to document-level headers (e.g., inside `TaskNotesToolbar.tsx`), and keep the top navbar focused on Breadcrumbs, Search (`Cmd+K`), Notifications, and Workspace Switcher.

### B. Connection Status Badge Noise
- **Overly Prominent 'Connected' Badge**:
  - *Observation*: `DashboardNavbar.tsx` renders a permanent `Connected` green badge next to global search. When socket connectivity is healthy, showing a constant green pill adds unnecessary visual noise.
  - *Benchmark Reference*: GitHub and Notion only display connection status badges when connection is **lost** or **degraded** (e.g., `Offline` or `Reconnecting...`).
  - *Recommendation*: Hide the connection badge when status is `CONNECTED`. Only display an amber `Reconnecting...` or red `Offline` banner when network connectivity drops.

### C. Dashboard Quick Action Redundancy vs Command Palette Focus
- **Redundant Dashboard Quick Action Buttons**:
  - *Observation*: `DashboardPage.tsx` features `QuickActions.tsx` containing separate buttons for `Create Project`, `Create Task`, `Ask AI Copilot`, and `Workspace Settings`.
  - *Benchmark Reference (Raycast / Linear)*: Raycast and Linear rely on a single, keyboard-first Command Palette (`Cmd+K`) as the primary action hub.
  - *Recommendation*: Keep `Create Task` and `Create Project` as standard primary action buttons on their respective section pages, but turn the dashboard quick actions into a streamlined keyboard shortcut hero bar that opens `Cmd+K`.

### D. Missing Breadcrumb Navigation
- **Deep Route Disorientation**:
  - *Observation*: Navigating to `/w/:workspaceSlug/tasks/:taskId/notes` or `/w/:workspaceSlug/projects/:projectId` leaves the user without clear breadcrumb trails back to parent views.
  - *Recommendation*: Add a unified `Breadcrumbs` component in `DashboardNavbar.tsx` (e.g., `Projects > AI Engine > Task-102 > Notes`), allowing one-click navigation up the hierarchy.

### E. Task View Switching Ergonomics
- **Segmented Control vs Tab Placement**:
  - *Observation*: `TaskToolbar.tsx` places view mode controls (`TaskViewToggle.tsx`) inside a dense toolbar alongside search inputs, status selects, priority selects, and sort dropdowns.
  - *Benchmark Reference (Linear / Notion)*: Linear places view toggles (List, Board, Timeline) cleanly on the top-right header, separated from filter controls.
  - *Recommendation*: Elevate view switching (`List` vs `Board`) to the header bar of `TasksPage.tsx`, reserving the filter toolbar exclusively for query parameters.

---

## 2. Component Merging & Refactoring Opportunities

1. **Unify Search & Copilot Invocation**:
   - Merge search modal and Copilot drawer into a unified Raycast-style `CommandPalette` (`GlobalSearchCommandPalette.tsx`), where typing normal text searches entities, and typing `/` or clicking a `Sparkles` icon switches instantly to AI Copilot conversation mode.
2. **Consolidate Activity Timelines**:
   - Combine `TaskActivityTimeline.tsx` and `EntityActivityTimeline.tsx` into a reusable, parameter-driven `AuditTimeline.tsx` component to prevent code duplication.
3. **Consolidate Form Modals**:
   - Standardize `CreateProjectModal`, `EditProjectDialog`, `CreateTaskModal`, and `EditTaskDialog` around shared form primitives to enforce visual design consistency.
