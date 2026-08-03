# 01 — Current Product State & Technical Baseline

**Author**: Lead Product Architect & Principal Systems Engineer  
**Date**: August 2, 2026  
**Scope**: Technical Baseline Audit of `@ai-project-manager/server` and `@ai-project-manager/client`  

---

## 1. Backend Subsystem Capabilities Audit

The server codebase (`@ai-project-manager/server`) contains 41 REST endpoints, Mongoose schema models, and Socket.io realtime event relays.

### Subsystem Health & Coverage:
1. **Authentication & Session**: HTTP-only JWT refresh tokens, access token verification, password hashing with bcrypt, session bootstrapping (`GET /auth/me`), and user registration.
2. **Multi-Tenant Workspaces**: Workspace resolution middleware (`resolveWorkspace`), tenant isolation, personal workspace auto-provisioning, workspace update/delete, and member roster endpoints.
3. **Projects Subsystem**: Project CRUD, search/filtering, option lookup (`GET /projects/options`), project summary calculation, soft deletion, and archive toggling.
4. **Tasks Subsystem**: Task CRUD, status/priority filtering, pagination, markdown notes saving (`PATCH /tasks/:id/notes`), soft deletion, and archive toggling.
5. **AI Subsystem**: Provider factory (Gemini & Anthropic), schema adapters, AI task breakdown, AI project summary, AI label generation, AI project copilot, AI plan drafting & commitment, and AI action dry-run/confirmation.
6. **Project Memories & Proactive Intelligence**: Memory record CRUD, proactive recommendation evaluation worker, workspace recommendation listing, and recommendation dismissal.
7. **Global Search**: Unified search service across projects, tasks, and workspace members (`GET /search`).
8. **Notifications & Activity Feed**: Cursor-paginated notification feed, unread counter, mark read / read all, and infinite-scroll workspace activity audit trail.
9. **Realtime Infrastructure**: Socket.io room joins (`workspace:${id}`), presence registry, viewing awareness, and domain event relay (`DomainEventBus`).

---

## 2. Frontend Subsystem Capabilities Audit

The client codebase (`@ai-project-manager/client`) is built with React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, and TanStack Query (React Query).

### Client Architecture:
1. **Router**: React Router v6 with workspace slug prefixing (`/w/:workspaceSlug/*`), protected routes, auth bootstrap wrappers, and public auth routes.
2. **State Management**: Zustand for auth store (`auth.store.ts`), TanStack Query for server state caching and automatic invalidation.
3. **Realtime Integration**: `RealtimeProvider`, `usePresenceAwareness`, `useRealtimeSync`, and `event-router.ts` for automatic query invalidation upon domain events.
4. **UI Features Implemented**:
   - Dashboard page with productivity overview, focus today, and recent activity.
   - Projects dashboard grid, project detail view with tabs (Tasks, Summary, AI Copilot, Recommendations, Memories, Plan).
   - Tasks list page with filtering toolbar, task detail page, markdown notes workspace with live preview and auto-save.
   - Activity page with infinite scrolling.
   - Notifications page with unread badge counter.
   - Settings pages (Profile, Account, Workspace Members, Appearance, Notifications, Security, Danger Zone).
   - Global Search Command Palette (`Cmd/Ctrl+K`).

---

## 3. Identified Disconnects & Technical Gaps

1. **Dashboard AI Buttons**: Disabled button flags in `AIDailyBrief.tsx` and `QuickActions.tsx` prevent users from accessing global AI functionality from the homepage.
2. **Missing Workspace Invitation Endpoints**: Server lacks `POST /workspaces/:id/invitations` and token validation, preventing user onboarding in `WorkspaceMembersTab.tsx`.
3. **Missing Task Board (Kanban) View**: `TaskViewToggle.tsx` contains a disabled button for Board View.
4. **Missing Workspace Role Management**: Server lacks `PATCH /workspaces/:id/members/:userId/role` for admin promotion/demotion.
5. **Missing Project Duplication & Bulk Task APIs**: Backend endpoints for project cloning and bulk task status changes are absent.
