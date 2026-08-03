# 04 — Exhaustive Frontend Placeholder, Dead UI & No-Op Handler Audit Report

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Scope**: Codebase-wide Audit of Placeholders, Disabled Elements, Tooltips, Stubs & Dead Code  
**Audit Purpose**: Identify every UI element that is currently a placeholder, stub, fake, disabled, no-op, console.log, TODO, Coming Soon, hardcoded, or static element, determining why it exists, whether the backend supports it, and its proper remediation.

---

## 1. Detailed Placeholder & Dead UI Catalog

| Component Name | Location / File Path | UI Element Description | Current Behavior | Target Behavior / Remediation | Priority | Backend Support Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `AIDailyBrief.tsx` | `features/dashboard/components/AIDailyBrief.tsx` | 'Ask AI about your workspace' Hero Button | Button was hardcoded as `disabled` with tooltip *"The AI assistant is coming soon."* | Remove `disabled` attribute; wire click handler to launch AI Copilot query mode or Command Palette (`Ctrl+K`). | **HIGH** | **Supported** (`POST /projects/:id/copilot` and `POST /copilot/actions/*` fully functional) |
| `QuickActions.tsx` | `features/dashboard/components/QuickActions.tsx` | 'Ask AI Copilot' Quick Action Button | Button was `disabled` with tooltip *"The AI assistant is coming soon."* | Remove `disabled` attribute; trigger global Copilot query palette or focus search bar in Copilot mode. | **HIGH** | **Supported** (Copilot services and global search exist) |
| `TaskViewToggle.tsx` | `features/tasks/components/TaskViewToggle.tsx` | 'Board View' (Kanban) Segmented Toggle Button | Button is `disabled` with tooltip *"Board view is coming soon"*. Clicking does nothing. | Implement production Kanban Board component grouped by task status (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with drag-and-drop or status select fallback. | **HIGH** | **Supported** (Task status API supports `PATCH /tasks/:id` with status enum updates) |
| `SecuritySettings.tsx` | `features/settings/components/SecuritySettings.tsx` | Two-Factor Authentication (2FA) Switch Toggle | Switch is `disabled` with a 'Coming Soon' badge. | Keep visually clear or wire to future auth spec; document as planned security enhancement. | **LOW** | **Not Supported** (No 2FA/TOTP backend endpoints exist) |
| `AppearanceSettings.tsx` | `features/settings/components/AppearanceSettings.tsx` | Interface Density Dropdown (`Compact`, `Comfortable`, `Spacious`) | Select menu is `disabled` with a 'Coming Soon' badge. | Wire selected density to client `ThemeProvider` CSS class or localStorage preference. | **MEDIUM** | **Client-side only** (Does not require backend API) |
| `ProfileSettings.tsx` | `features/settings/components/ProfileSettings.tsx` | 'Change Picture' Avatar Upload Button | Button is `disabled` with tooltip or no handler. | Add tooltip explaining *"Custom avatar uploads available in upcoming release"* or implement avatar upload API on server. | **MEDIUM** | **Not Supported** (No file upload / avatar endpoint in server) |
| `DashboardHero.tsx` | `features/dashboard/components/DashboardHero.tsx` | 'AI is watching your workspace' Live Indicator Badge | Static visual badge without interactivity. | Add interactive popover explaining proactive recommendation engine status and last evaluation timestamp. | **LOW** | **Supported** (`GET /recommendations` evaluates workspace health) |
| `WorkspaceMembersTab.tsx` | `features/settings/components/WorkspaceMembersTab.tsx` | 'Invite Member' Email Input & Button | Input allows typing email, but clicking 'Send Invitation' fails or shows mock toast. | Connect to workspace member invitation endpoint when implemented on backend; show clear toast feedback. | **HIGH** | **Not Supported** (Server missing `POST /workspaces/:id/invitations`) |

---

## 2. In-Depth Analysis of Key Dashboard AI Placeholders

### A. Dashboard `AIDailyBrief.tsx` ("Ask AI about your workspace")
- **Root Cause Analysis**: During earlier phases of development, the AI Copilot was tied strictly to single project pages (`ProjectCopilotSheet.tsx`). As a result, the global/workspace-level dashboard hero widget was implemented with a placeholder disabled button:
  ```tsx
  <Button disabled title="The AI assistant is coming soon.">
    Ask AI about your workspace
  </Button>
  ```
- **Architectural Reality**: The backend has already evolved to support global Copilot actions (`POST /copilot/actions/dry-run` and `POST /copilot/actions/confirm`), workspace-level proactive recommendations (`GET /api/v1/recommendations`), and global search (`GET /api/v1/search`).
- **Remediation**:
  1. Remove `disabled` attribute and tooltip.
  2. Wire click handler to dispatch a synthetic keyboard event (`Ctrl+K`) or toggle a global `CopilotCommandPalette` modal that allows users to ask questions or issue natural language commands for the active workspace.

### B. Dashboard `QuickActions.tsx` ("Ask AI Copilot")
- **Root Cause Analysis**: Similar to the hero widget, `QuickActions.tsx` contained a quick action tile for Copilot that was disabled:
  ```tsx
  <Button disabled title="The AI assistant is coming soon.">
    <Sparkles className="w-4 h-4 mr-2" />
    Ask AI Copilot
  </Button>
  ```
- **Remediation**: Remove `disabled` flag and unify with the global Copilot command palette modal trigger.

---

## 3. Console Logs & Development Stubs Audit

- **`realtime/event-router.ts`**: Contains `console.warn('[EventRouter] Unhandled event type...')` when unexpected domain events arrive. This is acceptable fallback logging for defense-in-depth, but should be routed through a centralized telemetry logger in production.
- **`realtime/realtime-client.ts`**: Contains multiple `console.warn` and `console.error` logs for socket connection attempts, retries, and errors. These should be kept clean and silent during normal operations, logging only in development mode (`env.NODE_ENV === 'development'`).
- **`projects/hooks/useCreateProjectMemory.ts`**: Contains raw `console.error('Failed to create memory:', error)`. Replace with standard user-facing Toast notifications.
