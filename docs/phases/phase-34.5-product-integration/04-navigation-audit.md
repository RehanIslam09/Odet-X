# 04 — Navigation Architecture & Ergonomics Audit

**Author**: Lead Product Architect & Staff UX Designer  
**Date**: August 2, 2026  
**Scope**: `@ai-project-manager/client` Route Structure & Navigation UX  
**Benchmark Reference**: Linear, Notion, Raycast, GitHub  

---

## 1. Current Navigation Inefficiencies

1. **Feature Page Isolation**: The client router (`router.tsx`) treats routes (`/dashboard`, `/projects`, `/tasks`, `/activities`, `/notifications`, `/settings`) as isolated pages rather than a continuous workflow system.
2. **Missing Breadcrumb Navigation**: Deep routes like `/w/:workspaceSlug/tasks/:taskId/notes` or `/w/:workspaceSlug/projects/:projectId` do not show hierarchical breadcrumb trails in the top header.
3. **Command Palette Invisibility**: Global Search (`Cmd/Ctrl+K`) exists as a modal, but does not provide quick actions, navigation commands, or unified Copilot access.
4. **No Quick Favorites / Pinned Items**: Users cannot pin frequent projects or tasks to the left sidebar for quick access.
5. **No Recently Viewed Items**: Switching between recently edited tasks or projects requires returning to list pages or searching.

---

## 2. Target Navigation Architecture Blueprint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR:  [Workspace Switcher] > [Projects] > [AI Engine] > [Task #102]       │
│          [Global Search / Copilot (Ctrl+K)]   [Notifications] [User Menu]   │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────────────────────────────────────┐
│ SIDEBAR              │ MAIN WORKSPACE VIEW AREA                             │
│ ┌──────────────────┐ │                                                      │
│ │ Workspace Name   │ │                                                      │
│ ├──────────────────┤ │                                                      │
│ │ ⚡ Command Center│ │                                                      │
│ │ 📁 Projects      │ │                                                      │
│ │ 🎯 Tasks         │ │                                                      │
│ │ 📊 Activity      │ │                                                      │
│ │ 🔔 Notifications │ │                                                      │
│ ├──────────────────┤ │                                                      │
│ │ PINNED           │ │                                                      │
│ │ ★ Auth System    │ │                                                      │
│ │ ★ Task #102      │ │                                                      │
│ ├──────────────────┤ │                                                      │
│ │ ONLINE MEMBERS   │ │                                                      │
│ │ ● Rehan (You)    │ │                                                      │
│ │ ● Sarah (Idle)   │ │                                                      │
│ └──────────────────┘ │                                                      │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 3. Recommended Navigation Improvements

### A. Dynamic Breadcrumb Navigation Component
- Implement a responsive `<Breadcrumbs />` component rendered inside `DashboardNavbar.tsx`.
- Automatically parses active React Router location:
  - `Workspace > Dashboard`
  - `Workspace > Projects > [Project Title]`
  - `Workspace > Tasks > [Task Title] > Notes Spec`
- Allows one-click navigation back up any level of the entity tree.

### B. Unified Command Palette (`Cmd/Ctrl+K`)
- Expand `GlobalSearchCommandPalette.tsx` to include:
  1. **Direct Navigation Actions**: Jump to Dashboard, Projects, Tasks, Settings, Members.
  2. **Entity Search**: Projects, Tasks, Members.
  3. **Copilot Mode**: Type `/ai [prompt]` or click `Sparkles` icon to launch Global Copilot.

### C. Sidebar Pinned & Favorites Section
- Add `store/favorites.store.ts` using `localStorage` persistence.
- Add a star `★` button on Project and Task headers to pin items directly to the `DashboardSidebar.tsx` navigation tree.
