# Phase 24 — Comprehensive Client Architecture Audit

## 1. Executive Summary

This document presents the complete architectural audit of the client application (`client/`) as of Blockade 1 in Phase 24.

The investigation confirms that the client has a clean, feature-driven React 19 / Vite structure using standard patterns:
- **Routing**: React Router v7 with declarative nesting and route guards.
- **State Management**: Server state in TanStack Query v5, session state in a single Zustand store (`auth.store.ts`), form state in React Hook Form + Zod, and local UI state in `useState`.
- **HTTP Layer**: Centralized Axios client (`apiClient`) featuring automatic JWT injection and transparent token refresh interceptors.
- **UI Primitives**: 23 installed shadcn/Radix components, Tailwind CSS v4, Lucide icons, and Sonner toasts.

However, the client currently has **zero integration** with the backend AI capabilities implemented in Phases 20–23. Buttons like `"Ask AI"` in `QuickActions.tsx` and `AIDailyBrief.tsx` exist solely as disabled placeholders with `"coming soon"` tooltips. Genuine backend capabilities—project task generation, project summary generation, and task label generation—have no client hooks, API modules, or UI controls.

---

## 2. Environment & Repository Baseline

- **Working Directory**: `/home/rehan/Developer/ai-project-manager`
- **Git Branch**: `feat/phase-24-frontend-ai-integration`
- **Git Status**: Clean baseline (`git status --short` returned 0 changes)
- **Node Environment**: Node v20.20.2 (`/home/rehan/.nvm/versions/node/v20.20.2/bin/node`)
- **NPM Environment**: NPM 10.8.2 (`/home/rehan/.nvm/versions/node/v20.20.2/bin/npm`)
- **Workspace Scripts**:
  - Root `package.json`: `dev`, `dev:client`, `dev:server`, `lint`, `typecheck`, `test`, `build`, `verify`.
  - Client `package.json`: `dev` (Vite), `build` (tsc -b && vite build), `lint` (eslint .), `typecheck` (tsc -b), `test` (vitest run).

---

## 3. Client Structure & File Inventory

```
client/src/
├── app/
│   ├── main.tsx             # React DOM root entry point (StrictMode wrapper)
│   ├── App.tsx              # App component delegating to AppProviders
│   ├── providers.tsx        # Provider hierarchy (QueryClient, Theme, Tooltip, Router, Toaster, DevTools)
│   ├── query-client.ts      # Global TanStack Query Client configuration
│   └── router.tsx           # React Router v7 configuration with route tree
├── components/
│   ├── common/              # AppLoader, EmptyState, ErrorState, PageContainer, PageHeader
│   ├── layout/              # AuthLayout, DashboardLayout, DashboardNavbar, DashboardSidebar, MobileSidebar, SidebarItem, ThemeToggle, UserMenu
│   └── ui/                  # 23 installed shadcn components (avatar, badge, button, calendar, card, etc.)
├── features/
│   ├── activity/            # Activity feed components, hooks, api, types, utils
│   ├── auth/                # AuthBootstrap, LoginForm, RegisterForm, LoginPage, RegisterPage, hooks, api, store connection
│   ├── dashboard/           # DashboardHero, AIDailyBrief, QuickActions, RecentProjects, ActivityTimeline, ProductivityOverview
│   ├── not-found/           # NotFoundPage
│   ├── notifications/       # NotificationBell, NotificationList, NotificationPopover, hooks, api
│   ├── projects/            # ProjectCard, ProjectGrid, ProjectHeader, ProjectSummaryCards, ProjectTasks, dialogs, hooks, api
│   ├── settings/            # ProfileSettings, AccountSettings, AppearanceSettings, NotificationSettings, SecuritySettings, DangerZone
│   └── tasks/               # TaskCard, TaskList, TaskToolbar, TaskPropertiesPanel, TaskNotesWorkspace, dialogs, hooks, api
├── hooks/
│   └── useDebounce.ts       # Utility debounce hook
├── lib/
│   └── utils.ts             # Tailwind merge / clsx helper (cn)
├── providers/
│   └── ThemeProvider.tsx    # Next-themes wrapper for dark mode
├── routes/
│   ├── ProtectedRoute.tsx   # Authenticated route guard reading Zustand
│   └── PublicRoute.tsx      # Unauthenticated route guard reading Zustand
├── services/
│   ├── axios.ts             # Centralized Axios client with request/response interceptors
│   └── axios.test.ts        # Unit tests for Axios interceptors
├── store/
│   └── auth.store.ts        # Zustand auth store (isBootstrapping, user, isAuthenticated)
├── types/
│   └── navigation.ts        # Navigation types
├── utils/
│   ├── api-error.ts         # Axios error extraction utilities (getApiError, isApiError)
│   └── form-errors.ts       # React Hook Form server error mapper (applyServerErrors)
└── index.css                # Global CSS import & Tailwind v4 theme variables
```

---

## 4. Bootstrap Chain Trace

The browser startup chain follows a rigid 8-layer hierarchy:

```
main.tsx
  ↓
StrictMode
  ↓
App.tsx
  ↓
AppProviders (providers.tsx)
  ├── QueryClientProvider (query-client.ts)
  ├── ThemeProvider (next-themes)
  ├── TooltipProvider (radix-ui)
  ├── RouterProvider (router.tsx)
  │     ↓
  │   AuthBootstrap (AuthBootstrap.tsx)
  │     ├── [Renders AppLoader while isBootstrapping === true]
  │     └── [Calls useCurrentUser() → GET /auth/me]
  │           ↓
  │         Zustand auth.store.ts updated via finishBootstrap()
  │           ↓
  │         Route Outlet rendered
  │           ├── ProtectedRoute → DashboardLayout → Feature Pages
  │           └── PublicRoute → AuthLayout → Login/Register Pages
  ├── Toaster (sonner)
  └── ReactQueryDevtools
```

### Key Audit Findings on Bootstrap:
- **Single Entry Session Restoration**: Session restoration occurs strictly inside `AuthBootstrap.tsx` at the router root level. Route guards (`ProtectedRoute`, `PublicRoute`) do not trigger network requests; they read Zustand state populated by `AuthBootstrap`.
- **Query Retry Policy**: `query-client.ts` explicitly disables query retries for HTTP 401 and 403 errors, preventing infinite retry loops when unauthenticated.

---

## 5. Routing Architecture Audit

The router is configured in `client/src/app/router.tsx` using `createBrowserRouter`:

- **Root / Layout**:
  - `AuthBootstrap` wraps all application routes.
  - `ProtectedRoute` guards the main app layout (`DashboardLayout`).
  - `PublicRoute` guards authentication pages (`AuthLayout`).
- **Route Inventory**:
  1. `/` (DashboardPage) — Protected
  2. `/projects` (ProjectsDashboardPage) — Protected
  3. `/projects/:projectId` (ProjectDetailPage) — Protected
  4. `/tasks` (TasksPage) — Protected
  5. `/tasks/:taskId` (TaskDetailPage) — Protected
  6. `/tasks/:taskId/notes` (TaskNotesWorkspacePage) — Protected
  7. `/activities` (ActivityPage) — Protected
  8. `/notifications` (NotificationsPage) — Protected
  9. `/settings/*` (SettingsPage with nested profile, account, appearance, notifications, security, danger-zone) — Protected
  10. `/auth/login` (LoginPage) — Public
  11. `/auth/register` (RegisterPage) — Public
  12. `/session-expired` (SessionExpiredPage) — Unguarded
  13. `/unauthorized` (UnauthorizedPage) — Unguarded
  14. `*` (NotFoundPage) — Catch-all

### Audit Assessment:
Routing conventions are modular, declarative, and scalable. No routing refactoring is needed.

---

## 6. Authentication & Refresh Token Audit

### Flow Investigation:
1. Access token is stored **in-memory** in `client/src/services/axios.ts` (`let accessToken: string | null = null`).
2. Refresh token is stored as an **HTTP-only cookie** set by the server.
3. Every request automatically attaches `Authorization: Bearer <accessToken>` via the request interceptor.
4. On an HTTP 401 response, the response interceptor:
   - Acquires a single in-flight `refreshPromise` (prevents concurrent 401 refresh request storms).
   - Calls `POST /auth/refresh`. Browser attaches the HTTP-only cookie automatically.
   - On 200: Stores the new access token and retries the original request seamlessly.
   - On 401 failure: Clears `accessToken`, calls `useAuthStore.getState().clearUser()`, and rejects the promise.

### Resolution of Historical 401 Console Error:
During earlier browser testing, `POST /api/v1/auth/refresh 401` was observed on initial application load.
**Root Cause**: When a fresh browser opens the app without an active refresh cookie, `AuthBootstrap` calls `GET /auth/me`. Having no access token, `GET /auth/me` returns 401. The response interceptor attempts `POST /auth/refresh` to restore the session. Since no valid cookie exists, `POST /auth/refresh` returns 401.
**Conclusion**: This is the expected architectural behavior for unauthenticated visitors. The error is handled gracefully without crashing, resulting in a redirect to `/auth/login`.

---

## 7. HTTP Client & Backend API Surface Audit

### Current HTTP Architecture:
```
React Component
  ↓
TanStack Query Hook (e.g. useProjects)
  ↓
Feature API Module (e.g. projects.api.ts)
  ↓
Centralized Axios Client (apiClient in services/axios.ts)
  ↓
Express Backend (/api/v1)
```

### Backend Endpoint Surface & Frontend Mapping:

| Resource | Method & Path | Backend Implemented | Frontend API Function | Frontend Wired Component | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | POST `/auth/login` | Yes | `authApi.login` | `LoginForm.tsx` | Wired |
| **Auth** | POST `/auth/register` | Yes | `authApi.register` | `RegisterForm.tsx` | Wired |
| **Auth** | POST `/auth/logout` | Yes | `authApi.logout` | `UserMenu.tsx` | Wired |
| **Auth** | GET `/auth/me` | Yes | `authApi.me` | `AuthBootstrap.tsx` | Wired |
| **Projects** | GET `/projects` | Yes | `projectsApi.list` | `ProjectsDashboardPage.tsx` | Wired |
| **Projects** | GET `/projects/:id` | Yes | `projectsApi.getById` | `ProjectDetailPage.tsx` | Wired |
| **Projects** | POST `/projects` | Yes | `projectsApi.create` | `CreateProjectDialog.tsx` | Wired |
| **Projects** | PATCH `/projects/:id` | Yes | `projectsApi.update` | `EditProjectDialog.tsx` | Wired |
| **Projects** | POST `/projects/:id/archive` | Yes | `projectsApi.archive` | `ProjectHeader.tsx` | Wired |
| **Projects** | DELETE `/projects/:id` | Yes | `projectsApi.delete` | `DeleteProjectDialog.tsx` | Wired |
| **Projects AI** | POST `/projects/:id/generate-tasks` | **Yes** | **Missing** | **None** | **Phase 24 WP-02/03 Target** |
| **Projects AI** | POST `/projects/:id/generate-summary` | **Yes** | **Missing** | **None** | **Phase 24 WP-02/03 Target** |
| **Tasks** | GET `/tasks` | Yes | `tasksApi.list` | `TasksPage.tsx` | Wired |
| **Tasks** | GET `/tasks/:id` | Yes | `tasksApi.getById` | `TaskDetailPage.tsx` | Wired |
| **Tasks** | POST `/tasks` | Yes | `tasksApi.create` | `CreateTaskDialog.tsx` | Wired |
| **Tasks** | PATCH `/tasks/:id` | Yes | `tasksApi.update` | `EditTaskDialog.tsx` | Wired |
| **Tasks AI** | POST `/tasks/:id/generate-labels` | **Yes** | **Missing** | **None** | **Phase 24 WP-02/03 Target** |

---

## 8. AI Capability Matrix & Placeholder Audit

| Capability | Backend Endpoint | Backend Implemented | Frontend UI Present | Frontend Wired | Current UX Behavior | Phase 24 Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Generate Project Tasks** | `POST /projects/:id/generate-tasks` | **Yes** | No | No | N/A | **Wire in WP-02 / WP-03** |
| **Generate Project Summary** | `POST /projects/:id/generate-summary` | **Yes** | No | No | N/A | **Wire in WP-02 / WP-03** |
| **Generate Task Labels** | `POST /tasks/:id/generate-labels` | **Yes** | No | No | N/A | **Wire in WP-02 / WP-03** |
| **Ask AI (Generic Assistant)** | None | **No** | Yes (`QuickActions.tsx`) | No | Button disabled, tooltip says "coming soon" | **Keep as placeholder (Out of scope)** |
| **Ask AI about Workspace** | None | **No** | Yes (`AIDailyBrief.tsx`) | No | Button disabled, tooltip says "coming soon" | **Keep as placeholder (Out of scope)** |
| **AI Daily Briefing** | None | **No** | Yes (`AIDailyBrief.tsx`) | No | Card marked "Preview" with static text | **Keep as preview (Out of scope)** |

---

## 9. State Ownership & Form Validation Audit

- **Server State**: 100% managed by TanStack Query. Query key factories exist in `activity.keys.ts`, `dashboard.keys.ts`, `notification.keys.ts`, `useProjects.ts`, `useTasks.ts`.
- **Global UI State**: Managed solely by Zustand (`auth.store.ts`). No server data is duplicated in Zustand.
- **Form State**: Standardized across all forms using React Hook Form + Zod (`@hookform/resolvers/zod`). Backend errors are mapped using `applyServerErrors` in `src/utils/form-errors.ts`.
- **Notifications**: Toast notifications use `sonner` (`toast.success`, `toast.error`) throughout mutation hooks.

---

## 10. UI Primitive (Shadcn) & Design System Audit

- **Installed Components (23)**: `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`, `input-group`, `input`, `label`, `popover`, `progress`, `select`, `separator`, `sheet`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.
- **Design Tokens**: Tailwind CSS v4 configured with HSL CSS variables in `src/index.css` supporting light/dark themes via `next-themes`.
- **Conclusion**: Zero additional shadcn components need to be installed for Phase 24. All required primitives for AI task generation, AI summary display, and label auto-generation exist.

---

## 11. Architectural Deficiencies & Tech Debt Discovered

1. **No AI API Service Module**: Missing `client/src/features/ai/services/ai.api.ts` or extensions to `projects.api.ts` / `tasks.api.ts` for AI endpoints.
2. **No AI Mutation Hooks**: Missing `useGenerateTasks`, `useGenerateProjectSummary`, and `useGenerateTaskLabels`.
3. **No AI UI Controls**: Project Detail and Task Detail pages lack buttons/dialogs to invoke AI features.
4. **Missing AI State Invalidation**: Generating tasks or summaries must invalidate `projectKeys`, `taskKeys`, and `activityKeys` in TanStack Query to keep UI consistent.

---

## 12. Strengths Worth Preserving

1. Clean separation of concern: Page → Feature Hook → Feature API → `apiClient`.
2. Strict session bootstrap and refresh handling in Axios interceptors.
3. Centralized query key factories for TanStack Query.
4. High quality form validation using React Hook Form, Zod, and server error application.
5. Consolidated layout and reusable UI components (`AppLoader`, `EmptyState`, `ErrorState`, `PageHeader`, `PageContainer`).
