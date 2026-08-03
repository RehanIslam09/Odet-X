# Frontend Placeholder & Dead UI Audit Report

**Date**: August 1, 2026  
**Status**: Comprehensive Dead Code & Placeholder Catalog  

---

## 1. Executive Summary

This audit cataloged every placeholder, disabled button, `coming soon` tooltip, dead handler, and missing workflow across the `@ai-project-manager/client` codebase.

---

## 2. Identified Dead UI & Placeholder Catalog

| Component / Page | Location | UI Element | Current Behavior | Target Behavior | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `AIDailyBrief.tsx` | Dashboard | "Ask AI about your workspace" Button | Button is `disabled` with tooltip *"The AI assistant is coming soon."* | Remove `disabled` state; wire click handler to open Command Palette (`Ctrl+K`) in AI Copilot query mode. | **HIGH** |
| `QuickActions.tsx` | Dashboard | "Ask AI" Button | Button is `disabled` with tooltip *"The AI assistant is coming soon."* | Remove `disabled` state; wire click handler to trigger AI Copilot prompt / Command Palette search. | **HIGH** |
| `SettingsNavigation.tsx` | Settings Page | Settings Sidebar Nav | Missing "Members & Workspace" tab. Members cannot view workspace roster or manage membership. | Add "Members" nav item with `Users` icon; route to `/w/:workspaceSlug/settings/members`. | **HIGH** |
| `SettingsPage.tsx` | Settings Routes | Settings Sub-routes | Missing `WorkspaceMembersTab.tsx` component & route. | Create production-grade `WorkspaceMembersTab.tsx` consuming `GET /workspaces/:id/members` and `DELETE /workspaces/:id/members/:userId`. | **HIGH** |
| `SettingsNavigation.tsx` | Settings Page | Navigation Items | `DangerZone.tsx` contains static workspace delete placeholder text. | Connect custom workspace deletion for workspace owners (`DELETE /workspaces/:id`). | **MEDIUM** |
| `TasksPage.tsx` | Tasks Page | Task Filters Toolbar | Filters state not persisted or cleared cleanly. | Wire search, status filter, priority filter, and project filter inputs cleanly to query params. | **MEDIUM** |
| `DashboardHero.tsx` | Dashboard | AI Badge | Displays static *"AI is watching your workspace"* indicator. | Keep visual badge but add interactive tooltip explaining proactive recommendation engine status. | **LOW** |

---

## 3. Detailed Workflow Gaps

### A. Workspace Member Management Workflow
- **Current State**: Users can switch workspaces via `WorkspaceSwitcher` and create non-personal workspaces via `CreateWorkspaceModal`. However, there is no UI to view workspace members, remove members, or self-leave a workspace.
- **Remediation**: Implement `WorkspaceMembersTab.tsx` in Settings, exposing:
  1. Active workspace member list with roles (Owner / Member) and joined dates.
  2. Member removal button for Owners (`DELETE /api/v1/workspaces/:workspaceId/members/:userId`).
  3. "Leave Workspace" button for non-owner Members (`DELETE /api/v1/workspaces/:workspaceId/members/:myUserId`).
  4. "Invite Member" modal with user search/email entry.

### B. Dashboard AI Integration Workflow
- **Current State**: `AIDailyBrief` and `QuickActions` contain disabled "Ask AI" buttons with "coming soon" tooltips, even though AI Copilot and Command Palette search are fully operational.
- **Remediation**: Remove `disabled` flags and tooltips. Trigger `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))` or trigger global Command Palette toggle event to launch AI Copilot seamlessly.
