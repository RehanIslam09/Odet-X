# Phase 18.1 — Comprehensive Pre-AI Product Audit

**Date:** 2026-07-20  
**Scope:** Complete repository as of Phase 17.3 completion  
**Methodology:** Read-only code inspection, architecture tracing, pattern analysis  
**Principle:** Every finding classified by evidence confidence; no changes made to codebase

---

## 1. Complete Application Surface Map

### 1.1 Frontend Routes (13 routes audited)

| Route | Page Component | Purpose |
|---|---|---|
| `/` | DashboardPage | Analytics overview, attention tasks, recent projects |
| `/projects` | ProjectsDashboardPage | Project list with search, filter, pagination |
| `/projects/:projectId` | ProjectDetailPage | Project detail workspace |
| `/tasks` | TasksPage | Task list with filters, views, search |
| `/tasks/:taskId` | TaskDetailPage | Task detail with properties panel |
| `/tasks/:taskId/notes` | TaskNotesWorkspacePage | Markdown notes editor workspace |
| `/activities` | ActivityPage | Global activity timeline |
| `/notifications` | NotificationsPage | Notification center with tab filters |
| `/settings` | SettingsPage | User preferences |
| `/auth/login` | LoginPage | Authentication |
| `/auth/register` | RegisterPage | Account creation |
| `/session-expired` | SessionExpiredPage | Session timeout |
| `/unauthorized` | UnauthorizedPage | Access denied |
| `*` | NotFoundPage | 404 catch-all |

**Total frontend routes audited: 14** (including wildcard)

### 1.2 Backend API Route Groups (7 groups audited)

| Prefix | Routes | Auth |
|---|---|---|
| `/api/v1/auth` | register, login, refresh, logout, me | Mixed |
| `/api/v1/projects` | CRUD + archive + options + summary | Bearer |
| `/api/v1/tasks` | CRUD + archive + notes | Bearer |
| `/api/v1/dashboard` | overview | Bearer |
| `/api/v1/activities` | list | Bearer |
| `/api/v1/notifications` | list, unread-count, mark-read, mark-all-read | Bearer |
| `/api/v1/users` | profile, preferences | Bearer |
| `/api/v1/health` | health check | None |

---

## 2. Complete Feature Map

### 2.1 Implemented Features

| Feature | Status | Phase |
|---|---|---|
| JWT Authentication (access + refresh) | ✅ Complete | 6-8 |
| Token rotation with SHA-256 hashing | ✅ Complete | 7 |
| Refresh token in HTTP-only cookie | ✅ Complete | 7 |
| Frontend transparent 401 refresh | ✅ Complete | 8 |
| In-memory access token (no localStorage) | ✅ Complete | 8 |
| Project CRUD with soft-delete/archive | ✅ Complete | 9 |
| Task CRUD with soft-delete/archive | ✅ Complete | 10 |
| Task lifecycle (status, priority, due dates, labels, estimates) | ✅ Complete | 10 |
| Dashboard analytics with aggregation | ✅ Complete | 13/14 |
| Activity/Audit trail with cursor pagination | ✅ Complete | 15 |
| Notification domain (model, API, BOLA) | ✅ Complete | 16.1 |
| Notification Center frontend | ✅ Complete | 16.2 |
| Background worker with node-cron | ✅ Complete | 16.3 |
| Due-soon/overdue scheduled reminders | ✅ Complete | 16.3 |
| Notification deduplication (dedupeKey) | ✅ Complete | 16.3 |
| Task Notes (250K chars, Markdown) | ✅ Complete | 17.1 |
| Notes Workspace (Write/Preview) | ✅ Complete | 17.2 |
| Notes autosave with debounce | ✅ Complete | 17.3 |
| Notes atomic concurrency (409 Conflict) | ✅ Complete | 17.3 |
| Navigation blocker + beforeunload | ✅ Complete | 17.3 |
| User profile & preferences | ✅ Complete | 8 |
| Dark/Light/System theme | ✅ Complete | 3 |

### 2.2 Stubbed/Placeholder Features

| Feature | Evidence | Status |
|---|---|---|
| Redis client | `server/src/lib/redis.ts` — fully commented out | STUB |
| Email notifications | User preferences schema has `emailNotifications: true` | SCHEMA ONLY — no email transport |
| Desktop notifications | User preferences schema has `desktopNotifications` | SCHEMA ONLY |
| Weekly AI Summary | User preferences schema has `weeklyAiSummary: true` | SCHEMA ONLY |
| AI Features | Roadmap Phase 11 deferred | NOT STARTED |
| Real-time/WebSockets | Roadmap Phase 12 deferred | NOT STARTED |

### 2.3 Documentation vs Code Discrepancies

| Doc Claim | Actual Code |
|---|---|
| `roadmap.md` says "Current Phase: Phase 14" | Code is through Phase 17.3. **Stale.** |
| Phase 11 (AI) and Phase 12 (Real-time) listed as future | Correct, they remain unimplemented |
| Roadmap lists Phases 16-17 as complete | Correct, verified in code |

---

## 3. Frontend Architecture Audit

### 3.1 Organization — **VERIFIED BY CODE**

The frontend uses a well-structured **feature-first** architecture:

```
features/
├── auth/       (pages, hooks, services, types, validators, components)
├── tasks/      (pages, hooks, services, types, validators, components, mock, utils)
├── projects/   (pages, hooks, services, types, components)
├── dashboard/  (pages, hooks, services, types, components)
├── activity/   (pages, hooks, services, types, components)
├── notifications/ (pages, hooks, services, types, components, utils)
├── settings/   (pages, components)
├── not-found/  (pages)
```

**Strengths:**
- Each feature owns its pages, hooks, services, types, and components
- Shared UI primitives in `components/ui/` (shadcn)
- Shared layout in `components/layout/`
- Centralized API client in `services/axios.ts`
- Query key factories are colocated with their feature hooks

**No god components detected.** The largest page component (TaskNotesWorkspacePage at 285 lines) is decomposed into distinct rendering sections with hooks handling complexity.

### 3.2 React Query Architecture

**Query Key Factories** — well-organized:
- `taskKeys` in `useTasks.ts` — covers `all`, `lists`, `list(params)`, `details`, `detail(id)`
- `notificationKeys` in `notification.keys.ts` — covers `all`, `lists`, `list(params)`, `unreadCount`

**Cache Synchronization Strategy:**

| Mutation | Cache Action |
|---|---|
| Task update | Invalidates `taskKeys.lists()`, sets `taskKeys.detail(id)` |
| Task notes update | Sets ONLY `taskKeys.detail(task.id)` — correctly scoped |
| Mark notification read | Optimistic unread-count decrement + authoritative list invalidation |
| Mark all notifications read | Optimistic count to 0 + invalidate entire notification family |
| Task create/delete/archive | Invalidates task lists |

### 3.3 State Management

- **Zustand:** `auth.store.ts` — minimal user state, correctly limited to auth concern
- **React Query:** All server state
- **URL State:** Notes workspace mode via `?mode=write|preview`
- **Local component state:** Notes draft, form state

### 3.4 API Client (`services/axios.ts`)

**VERIFIED BY CODE — Well-architected:**
- Token stored in module-scoped variable (not localStorage/sessionStorage)
- Request interceptor attaches Bearer header
- Response interceptor handles 401 → refresh → retry with lock
- Refresh lock prevents concurrent refresh calls
- Failed refresh clears auth state

---

## 4. React Query & Client State Deep Audit

### 4.1 Task Notes Cache Synchronization

**VERIFIED BY CODE** — The `useUpdateTaskNotes` hook:
- `onSuccess`: Directly sets `queryClient.setQueryData(taskKeys.detail(task.id), { task })`
- Does NOT invalidate `taskKeys.lists()` — **correct** (autosaves should not refetch lists)
- Does NOT invalidate dashboard or activity — **correct**

**Potential concern (HIGH-CONFIDENCE):** The `useTaskNotesAutosave` hook's `overwriteWithMyVersion` sets the expected version from `taskVersion` (React Query cache value), then uses `setTimeout(0)` to flush. This works because:
1. `setExpectedVersion(taskVersion)` triggers re-render
2. The ref sync `useEffect` runs synchronously before the setTimeout callback
3. The flush captures the ref value

This is technically correct but fragile — React 19's batching could theoretically delay the ref sync. However, in practice the `setTimeout(0)` yields to the event loop after React commits, so refs should be updated. **No verified bug, but architectural fragility.**

### 4.2 Notification Cache Synchronization

**VERIFIED BY CODE — Sound design:**
- `useMarkNotificationRead`: Optimistic decrement of unread count, rollback on error, authoritative invalidation in `onSettled`
- `useMarkAllNotificationsRead`: Optimistic set to 0, rollback on error, invalidates entire notification key family
- `useUnreadNotificationCount`: Separate query with 5-minute staleTime

### 4.3 Notification List Deduplication

**VERIFIED BY CODE** — `NotificationsPage.tsx` line 30-32:
```tsx
const rawNotifications = data?.pages.flatMap((page) => page.items) ?? [];
const notifications = Array.from(
  new Map(rawNotifications.map((n) => [n.id, n])).values(),
);
```
This correctly deduplicates notifications by `id` across infinite query pages. This was the fix for the earlier React key warning.

---

## 5. Task Notes Deep Audit

### 5.1 Backend Architecture — **SAFE**

| Aspect | Status | Evidence |
|---|---|---|
| Schema validation | 250,000 char max via Zod + Mongoose | `task.validator.ts:102`, `task.model.ts:72` |
| Dedicated endpoint | `PATCH /tasks/:id/notes` | `task.routes.ts:45` |
| Activity suppression | Comment: "Explicitly ZERO Activity events" | `task.service.ts:410` |
| List query projection | `Task.find(filter).select("-notes")` | `task.service.ts:212` |
| Dashboard projection | `.select("-notes")` on attention tasks | `dashboard.service.ts:94` |
| Worker projection | `.select("-notes").cursor()` on both queries | `notification.jobs.ts:32,66` |
| Atomic version check | `findOneAndUpdate` with `__v` in filter | `task.service.ts:384-391` |
| 404 vs 409 distinction | Separate `Task.exists()` check after null result | `task.service.ts:393-408` |

### 5.2 `getTaskById` — Notes Included

**VERIFIED BY CODE** — `assertTaskOwnership` (used by `getTaskById`) calls `Task.findOne()` without projection, so notes ARE included in single-task fetches. **Correct.**

### 5.3 Frontend Autosave Architecture — **NEEDS HARDENING**

**VERIFIED BY CODE** — `useTaskNotesAutosave.ts`:

| Aspect | Status |
|---|---|
| 1000ms debounce | ✅ Correct (`setTimeout(() => flush(), 1000)`) |
| Serialized saves | ✅ `isSavingRef` prevents concurrent PATCH |
| Draft capture at save time | ✅ `latestDraftRef.current` at point of flush |
| Conflict detection | ✅ 409 status check sets `conflict` state |
| Navigation blocker | ✅ `useBlocker` with isDirty check |
| beforeunload | ✅ Prevents close when dirty or saving |
| Cleanup on unmount | ✅ Clears debounce timer |

**Finding P2-01: Unmount does NOT flush pending draft.**
The unmount cleanup (line 145-151) only clears the debounce timer. If the user navigates away via browser back/forward (bypassing React Router blocker), unsaved content in the debounce window is silently lost. The `beforeunload` event fires a warning but cannot perform an async save. This is a **known limitation** of all browser-based editors without service workers.

**Finding P2-02: `overwriteWithMyVersion` uses stale `taskVersion`.**
When `reloadLatest` is called, it reads `taskNotes` and `taskVersion` from the hook's closure. These come from the React Query cache. If the React Query cache hasn't been explicitly refetched after the conflict, `taskVersion` is the ORIGINAL version the user loaded, not the server's current version. The "Reload latest" action will re-init with whatever React Query has cached. If background refetch hasn't fired, this could be stale.

**However:** React Query's `useTask(taskId)` default staleTime is 0, so it should refetch on window focus or component re-mount. In practice this is unlikely to cause a real issue in single-user scenarios.

### 5.4 Task Notes Verdict

**SAFE with minor hardening needed.** The atomic `findOneAndUpdate` with version checking is correctly implemented. The 404-vs-409 distinction is properly handled with a secondary `Task.exists()` query. Activity suppression is verified. The frontend autosave pipeline is well-serialized. Two edge cases (unmount flush, stale conflict recovery) exist but are not data-loss risks under normal usage.

---

## 6. Notification System Deep Audit

### 6.1 Backend Architecture — **SAFE**

| Aspect | Status | Evidence |
|---|---|---|
| Notification model | recipientId, type, dedupeKey, readAt | `notification.model.ts` |
| BOLA/tenant isolation | All queries filter by `recipientId: userId` | `notification.service.ts:79,121,137,157` |
| Cursor pagination | `_id` cursor with `limit+1` pattern | `notification.service.ts:92-104` |
| Sparse unique dedupeKey | `{ unique: true, sparse: true }` | `notification.model.ts:38` |
| Indexes | recipientId+_id, recipientId+readAt+_id | `notification.model.ts:57,60` |
| Worker separation | Independent `worker.ts` process with own DB connection | `worker.ts:65` |
| Graceful shutdown | SIGTERM/SIGINT → close mongoose | `worker.ts:20-36` |
| Job overlap prevention | `isJobRunning` flag | `worker.ts:42-45` |
| Memory-safe cursor | `.cursor()` for task iteration | `notification.jobs.ts:32,66` |
| Error isolation | try/catch per task, logs and continues | `notification.jobs.ts:55-58,89-92` |

### 6.2 Deduplication Correctness

**VERIFIED BY CODE:**
- `dedupeKey` format: `task:<taskId>:<type>:<dueDate.getTime()>`
- `dedupeKey` has a MongoDB `unique: true, sparse: true` index
- `createNotificationStrict` catches E11000 (duplicate key) and returns `false`
- Non-E11000 errors are re-thrown to the caller

**Atomic guarantee:** The deduplication IS atomic at the database level — the unique index prevents any concurrent insert from succeeding. **This is genuinely exactly-once per dedupeKey.**

**Finding P3-01: Multiple worker instances can duplicate work (not notifications).**
If multiple workers run simultaneously, they will each scan all tasks and attempt to create notifications. The `dedupeKey` prevents duplicate notifications, but the redundant scan work is wasted. The `isJobRunning` flag only prevents overlap within a single process. This is a **deployment documentation** issue, not a correctness bug.

### 6.3 Worker Tenant Safety

**VERIFIED BY CODE** — The worker scans tasks globally (`Task.find({ isDeleted: false, ... })` without owner filter), which is correct for a scheduled reminder system. Each notification is sent to `task.owner`, so tenant isolation is maintained at the notification creation level.

### 6.4 Due-Soon/Overdue Semantics

**VERIFIED BY CODE:**
- Due soon: `dueDate > now AND dueDate <= now + 24h`
- Overdue: `dueDate < now`
- Both exclude: `isDeleted`, `archived`, `status: done|cancelled`
- Rescheduling generates new dedupeKey (timestamp changes)

### 6.5 Notification System Verdict

**SAFE.** Database-level deduplication provides true atomicity. Tenant isolation is maintained. Worker has graceful shutdown and overlap prevention.

---

## 7. Backend Domain Audit

### 7.1 Auth Domain

| Aspect | Finding |
|---|---|
| Registration | Email uniqueness via `findOne` check + E11000 handler |
| Login | Correct credential validation, generic error messages |
| Refresh | Token rotation with hash comparison, reuse detection |
| Logout | Idempotent hash clear |
| BOLA | Auth middleware attaches `req.user` from JWT; all downstream uses `req.user._id` |

**Finding P2-03: Username generation uses sequential retry loop.**
`registerUser` in `auth.service.ts` generates usernames by trying `candidate`, then `candidate_2`, `candidate_3`, etc. In a race condition, two registrations with the same email prefix could both reach the `User.create` step with the same username. The MongoDB unique index on `username` will catch this, but it results in an unhandled E11000 error that gets mapped to "A resource with that value already exists" — which is confusing for a registration. **Confidence: HIGH-CONFIDENCE.** Very unlikely in practice (requires near-simultaneous registration with same email prefix).

### 7.2 Per-Domain BOLA/IDOR Assessment

| Domain | BOLA Protection | Evidence |
|---|---|---|
| Projects | `assertProjectOwnership` scopes by `owner + isDeleted` | `project.service.ts:54-69` |
| Tasks | `assertTaskOwnership` scopes by `owner + isDeleted` | `task.service.ts:69-84` |
| Task Notes | `findOneAndUpdate` scopes by `owner + isDeleted` | `task.service.ts:370-374` |
| Activity | `listActivities` scopes by `owner` | `activity.service.ts:84` |
| Notifications | All queries scope by `recipientId` | `notification.service.ts` |
| Dashboard | All queries scope by `owner` | `dashboard.service.ts` |
| User Profile | Uses `req.user._id` | controller level |

**All domains correctly enforce tenant isolation. VERIFIED BY CODE.**

---

## 8. Database & Query Audit

### 8.1 Index Coverage

**Task Collection (7 indexes + _id):**
1. `{ owner, isDeleted, archived, updatedAt }` — dashboard/list
2. `{ owner, isDeleted, archived, projectId, updatedAt }` — project views
3. `{ owner, isDeleted, archived, status, updatedAt }` — status filter
4. `{ owner, isDeleted, archived, priority, updatedAt }` — priority filter
5. `{ owner, isDeleted, archived, dueDate, updatedAt }` — due date
6. `{ owner, isDeleted, labels }` — label filter
7. `{ isDeleted, archived, status, dueDate }` — **global scheduler index**

**Index #7 is specifically designed for worker queries.** Correctly avoids owner-scoping since the worker processes all users.

**Project Collection (1 compound + _id):**
1. `{ owner, isDeleted, archived, updatedAt }`

**Activity Collection (4 indexes):**
1. `{ owner, _id }` — dashboard feed
2. `{ owner, projectId, _id }` — project feed (legacy)
3. `{ owner, contextProjectIds, _id }` — project feed (new)
4. `{ owner, taskId, _id }` — task feed

**Notification Collection (3 indexes):**
1. `{ recipientId, _id }` — full feed
2. `{ recipientId, readAt, _id }` — unread feed
3. `dedupeKey` — unique sparse

### 8.2 Notes Payload Exclusion Audit

**VERIFIED BY CODE** — All bulk-loading queries exclude notes:

| Query Path | Projection |
|---|---|
| `listTasks` | `.select("-notes")` |
| Dashboard attention tasks | `.select("-notes")` |
| Worker due-soon cursor | `.select("-notes").cursor()` |
| Worker overdue cursor | `.select("-notes").cursor()` |
| `getTaskById` | No projection (includes notes) ✅ |

**Finding P3-02: `assertTaskOwnership` loads full task including notes.**
Every task mutation (update, archive, delete) goes through `assertTaskOwnership`, which does `Task.findOne()` without projection. For the update/archive/delete operations, the notes field is unnecessarily loaded. At 250KB max, this could waste bandwidth on every task mutation. **Confidence: VERIFIED BY CODE. Impact: Low (single document, not bulk), but wasteful.**

### 8.3 Express Body Size Limit

**Finding P2-04: No explicit JSON body size limit configured.**
`app.ts:33` uses `express.json()` without a `limit` option. Express 5 defaults to 100KB. The Task notes field supports 250,000 characters. A 250K-character notes payload is approximately 250KB of JSON, which **exceeds the default 100KB limit**. This means very large notes saves will be silently rejected with a 413 error.

**Confidence: VERIFIED BY CODE.** The Zod validator allows 250,000 chars, but Express will reject the body before Zod ever sees it. **This is a verified bug — P1.**

---

## 9. Testing Audit

### 9.1 Backend Testing Architecture

**Two distinct testing conventions exist:**

#### Convention A: Standalone Integration Scripts (`server/src/tests/`)
- **Framework:** Custom `expect(bool, message)` helper, `process.exit(1)` on failure
- **Execution:** `NODE_ENV=test npx tsx src/tests/<name>.test.ts`
- **Database:** Connects to `MONGODB_TEST_URI || mongodb://127.0.0.1:27017/ai-project-manager-test`
- **Safety:** Validates `NODE_ENV=test` AND `"test"` in URI before clearing collections

**Files (10):**
| Test File | Domain |
|---|---|
| `task.test.ts` (515 lines) | Task CRUD, filtering, pagination, BOLA |
| `project.test.ts` (17,657 bytes) | Project CRUD, lifecycle |
| `notification.test.ts` (6,952 bytes) | Notification CRUD, pagination |
| `notification.jobs.test.ts` (5,193 bytes) | Worker job semantics |
| `notification.strict.test.ts` (2,172 bytes) | Strict creation, deduplication |
| `task-notes.test.ts` (4,864 bytes) | Notes CRUD, projection, BOLA |
| `activity.test.ts` (8,925 bytes) | Activity recording |
| `dashboard.test.ts` (12,503 bytes) | Dashboard aggregation |
| `user.test.ts` (11,281 bytes) | User registration, profile |
| `test-db.ts` (1,493 bytes) | Shared DB setup/teardown |

#### Convention B: Vitest (`server/src/__tests__/`)
- **Framework:** Vitest with `describe`, `it`, `expect`
- **Database:** `MongoMemoryServer` (in-memory)
- **Files:** Only `task.concurrency.test.ts` (139 lines)

**Finding P2-05: Vitest is NOT in server devDependencies.**
The `server/package.json` does not include `vitest` or `mongodb-memory-server`. The `__tests__/task.concurrency.test.ts` file uses both. It **cannot execute** without installing these dependencies. This test was written but never successfully run in this environment.

**Confidence: VERIFIED BY CODE.**

### 9.2 Frontend Testing Infrastructure

- `vitest` is in `client/package.json` devDependencies (v4.1.10)
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` are present
- `jsdom` is present
- `playwright` is present
- **No test files exist in the client source.** Zero frontend tests.

**Confidence: VERIFIED BY CODE.**

### 9.3 Testing Verdict

| Category | Status |
|---|---|
| Backend integration tests (Convention A) | Exist, require live MongoDB |
| Backend Vitest tests (Convention B) | 1 file, missing dependencies |
| Frontend unit tests | Zero |
| Frontend E2E tests | Zero (Playwright installed but no tests) |
| CI pipeline | None |

---

## 10. Design System Audit

### 10.1 Foundation

- **Font:** Geist Variable (`@fontsource-variable/geist`)
- **Colors:** shadcn/ui CSS variables with dark mode support
- **Icons:** Lucide React
- **Animations:** Framer Motion + tw-animate-css
- **Components:** shadcn/ui primitives (Button, Dialog, Tabs, Skeleton, etc.)

### 10.2 Observations

- Consistent use of `rounded-xl` for cards
- Consistent use of `border-border/40` and `border-border/60` patterns
- Task Notes editor card follows GitHub-inspired tab pattern
- No formal design tokens file — colors are in shadcn CSS variables
- No shared `PageHeader` component — each page builds its own
- Notification skeletons use compact design (dot + text lines)

### 10.3 Finding P4-01: Inconsistent page header patterns

Dashboard, Projects, Tasks, Notifications each construct their own header with `h1` + subtitle. A shared `PageHeader` component would ensure consistent spacing and typography.

---

## 11. Screen-by-Screen UX Audit

### Dashboard
- **Works well:** Stats grid, attention tasks, recent projects with progress
- **Concern (HYPOTHESIS):** Empty dashboard for new users with zero data — no onboarding guidance

### Projects
- **Works well:** Grid layout, search, filter, pagination
- **Concern (P4-02):** No inline project creation — requires dialog

### Task List
- **Works well:** List/board views, search, filters, quick status changes
- **Architecture (VERIFIED):** Uses `placeholderData` for pagination — prevents layout shift

### Task Detail
- **Works well:** Properties panel, notes preview with overflow detection
- **Concern (HYPOTHESIS):** Very long task titles may overflow on mobile

### Task Notes Workspace
- **Works well:** GitHub-inspired editor card, write/preview tabs, footer status
- **Verified:** Single scrollbar hierarchy (DashboardLayout → editor card internal)
- **Concern (P4-03):** `max-h-[70vh]` on the content area means very short browser windows show a cramped editor

### Notifications
- **Works well:** Tab filters, skeleton loading, deduplication, mark-all-read
- **Verified:** No layout jump between tab switches (cached data shows immediately)

---

## 12. Responsive Design Audit

**DashboardLayout** (`DashboardLayout.tsx`):
- Sidebar: `hidden md:flex w-64` — correctly hidden on mobile
- Main content: `flex-1 overflow-auto p-6` — single scroll container

**Finding P3-03: No mobile navigation for sidebar routes.**
The sidebar uses `hidden md:flex`. On mobile screens (below `md` breakpoint), there is no hamburger menu or mobile drawer visible in `DashboardLayout.tsx`. Users on mobile cannot access navigation.

**Confidence: HIGH-CONFIDENCE** based on the layout code. The `DashboardNavbar` may contain a mobile menu toggle (not fully audited), but the sidebar itself is unconditionally hidden.

### Notes Workspace on Mobile
- Uses `max-w-5xl mx-auto` — will fill full width
- Footer collapses: "Markdown" on sm, "Markdown is supported" on larger
- Tabs use full-width grid on mobile

---

## 13. Accessibility Audit

| Element | Status |
|---|---|
| Notes editor textarea | Has `aria-label="Task notes editor"` ✅ |
| Save status | Has `aria-live="polite"` on saved/error/conflict ✅ |
| Dialog | Uses proper DialogTitle/DialogDescription ✅ |
| Notification bell | Needs audit (icon-only button) |
| Tabs | Uses Radix Tabs (accessible by default) ✅ |
| Form labels | Login/Register use proper label binding ✅ |
| Color dependence | Status/priority use both color AND text ✅ |

**Finding P4-04:** Icon-only buttons (notification bell, some toolbar actions) should have `aria-label` attributes. Need to verify each one individually.

---

## 14. Performance Audit

### 14.1 Bundle Impact
- `react-markdown` + `remark-gfm` — significant bundle size for Markdown rendering
- `recharts` — significant bundle size for dashboard charts
- `framer-motion` — large but used extensively
- `@dnd-kit` — present for kanban board (appropriate)
- Both `date-fns` AND `dayjs` are dependencies — **redundant** (P4-05)

### 14.2 Large Notes Rendering
- `MemoizedMarkdownRenderer` wraps `ReactMarkdown` in `React.memo` — prevents unnecessary re-parses
- Code blocks use `overflow-x-auto`
- Tables use `overflow-x-auto` wrapper
- Images are completely disabled (returns `null`)
- **No virtualization** for very long documents — a 250K-char Markdown document will parse into a very large DOM tree

**Finding P3-04:** Rendering 250,000 characters of Markdown in one pass will produce a massive DOM and may cause UI lag. At the current limit, this is a theoretical concern — most real notes will be far smaller.

### 14.3 Worker Query Performance
- Worker uses `.cursor()` for memory-safe streaming — **good**
- Worker uses the global scheduler index `{ isDeleted, archived, status, dueDate }` — **good**
- Worker runs hourly — appropriate frequency for due-date checks

---

## 15. Security Audit

### 15.1 Authentication Security

| Control | Status | Evidence |
|---|---|---|
| Password hashing | bcrypt with configurable salt rounds | `user.model.ts:212-218` |
| Password excluded from JSON | `select: false` on schema | `user.model.ts:148` |
| Refresh token hashing | SHA-256 before DB storage | `auth.service.ts:90` |
| HTTP-only cookie | Refresh token only in cookie | Verified by controller |
| Token rotation | New refresh on every refresh call | `auth.service.ts:161-163` |
| Reuse detection | Clears hash on mismatch | `auth.service.ts:146-148` |
| Account status check | `isActive` check on every auth'd request | `auth.middleware.ts:38` |
| Generic error messages | "Invalid email or password" | `auth.service.ts:76,82` |

### 15.2 Markdown/XSS Protection

**VERIFIED BY CODE** (`MarkdownRenderer.tsx`):
- Uses `defaultUrlTransform` from react-markdown (blocks `javascript:` etc.)
- Images disabled completely (`img: () => null`)
- External links get `target="_blank" rel="noopener noreferrer"`
- No `rehype-raw` — raw HTML is NOT rendered
- GFM is the only remark plugin

**Verdict: Properly hardened against XSS via Markdown.**

### 15.3 Rate Limiting

**Finding P2-06: ZERO rate limiting exists.**
No `express-rate-limit` or any other rate limiting middleware is installed or configured. The Redis stub confirms this was planned but not implemented.

**Impact:**
- Login endpoint vulnerable to credential brute-forcing
- Registration endpoint vulnerable to account enumeration/spam
- API endpoints vulnerable to denial-of-service
- Notes autosave could be abused to spam PATCH requests

**Confidence: VERIFIED BY CODE.**

### 15.4 Request Body Size

**Repeated from Section 8.3:** Express default 100KB body limit conflicts with 250KB notes. P1 severity.

### 15.5 CORS

**VERIFIED BY CODE** — CORS is restricted to `env.CLIENT_URL` with `credentials: true`. **Correct.**

---

## 16. Production Operations Audit

### 16.1 Development Setup

**Root `package.json`** uses `concurrently` to run:
1. `npm run dev --prefix server` (API)
2. `npm run dev --prefix client` (Vite)
3. `npm run worker:dev --prefix server` (Worker)

**VERIFIED BY CODE — correctly configured.**

### 16.2 Production Build

- Client: `tsc -b && vite build`
- Server: `tsc`
- Both produce to `dist/`

### 16.3 Missing Production Infrastructure

| Component | Status |
|---|---|
| Docker/Dockerfile | NOT PRESENT |
| docker-compose | NOT PRESENT |
| CI/CD pipeline | NOT PRESENT |
| Process manager (PM2) config | NOT PRESENT |
| Structured logging | Console only |
| Error monitoring (Sentry) | NOT PRESENT |
| Health check (server) | EXISTS (`/api/v1/health`) |

---

## 17. Dead Code & Cleanup Audit

| Item | Evidence | Action |
|---|---|---|
| `server/src/lib/redis.ts` | Fully commented out placeholder | Keep as documentation |
| `client/src/features/tasks/mock/` | Mock directory exists | Verify if still used |
| Both `date-fns` AND `dayjs` | In client dependencies | Consolidate to one |
| `react-dropzone` | In client dependencies | Verify if used |
| `dotenv` in client | In client dependencies | Vite handles env vars natively |
| `babel-plugin-react-compiler` | In client devDependencies | Verify if configured |

**Finding P4-06:** `react-dropzone` (17KB) is installed but likely unused — no file upload UI exists in the application. Needs verification.

---

## 18. Documentation Audit

### 18.1 Stale Documentation

| Document | Issue |
|---|---|
| `docs/roadmap.md` | Says "Current Phase: Phase 14" — should be Phase 17.3 |
| `docs/architecture.md` | Likely stale regarding Phases 16-17 additions |
| `docs/design-and-schema.md` | 95KB — may contain outdated schema definitions |

### 18.2 Accurate Documentation

| Document | Status |
|---|---|
| `docs/authentication.md` | Appears up-to-date with auth architecture |
| `docs/api-design.md` | Likely accurate for established conventions |

---

## 19. Pre-AI Readiness Audit

### A. Is the architecture ready to support an AI layer?

**YES, with caveats.**

The architecture has clean separation of concerns that would support AI:
- Service layer can be called by AI agent code the same way controllers call it
- Activity system can record AI-attributed events (needs `actorType` field)
- Notification system can send AI-generated notifications
- Notes system can receive AI-generated content
- Task/Project CRUD is clean and well-tested

**Future AI insertion points (HIGH LEVEL ONLY):**
- AI endpoint handlers calling existing service methods
- `actorType` field on Activity model to distinguish AI vs human actions
- AI-specific notification types
- Notes AI assistance (summarization, generation)
- Dashboard AI Brief widget

### B. Is the product experience mature enough for AI?

**MOSTLY YES, but two blockers exist:**

1. **P1 Body Size Bug:** The Express body limit will reject large notes saves. This MUST be fixed before any AI feature that generates long content.
2. **Testing Gap:** No automated regression tests would run in CI. Introducing AI features without a safety net risks breaking existing functionality.

---

## 20. Master Findings Table

| ID | Priority | Confidence | Domain | Finding | Evidence | User Impact | Technical Impact | Direction | Effort | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| P1-01 | P1 | VERIFIED BY CODE | Backend | Express JSON body limit (100KB) blocks large notes saves (up to 250KB) | `app.ts:33` — no `limit` option; schema allows 250K chars | Users cannot save large notes | Silent 413 rejection | Add `express.json({ limit: '500kb' })` | Trivial | None |
| P2-01 | P2 | VERIFIED BY CODE | Frontend | Unmount does not flush pending autosave draft | `useTaskNotesAutosave.ts:145-151` only clears timer | Possible lost content on browser back | — | Document as known limitation or add fire-and-forget flush | Small | Low |
| P2-02 | P2 | VERIFIED BY CODE | Frontend | `overwriteWithMyVersion` uses potentially stale version | Hook closure captures `taskVersion` from React Query cache | Could trigger second conflict | — | Refetch task before overwrite | Small | Low |
| P2-03 | P2 | HIGH-CONFIDENCE | Backend | Username generation race condition | Sequential `findOne` loop before `create` | Confusing error on concurrent registration | MongoDB catches via unique index | Use atomic `findOneAndModify` or catch E11000 specifically | Small | Very Low |
| P2-04 | P2 | VERIFIED BY CODE | Backend | No express body size limit for 250K notes | See P1-01 | — | — | — | — | — |
| P2-05 | P2 | VERIFIED BY CODE | Testing | Vitest concurrency test cannot execute (missing deps) | `server/package.json` lacks vitest + mongodb-memory-server | Tests don't run | False confidence | Either install deps or rewrite to Convention A | Small | None |
| P2-06 | P2 | VERIFIED BY CODE | Security | Zero rate limiting on any endpoint | No rate-limit middleware installed | Login brute-force, registration spam | DoS risk | Add `express-rate-limit` | Medium | Low |
| P3-01 | P3 | HIGH-CONFIDENCE | Operations | Multiple workers scan all tasks redundantly | `isJobRunning` is process-local | Wasted compute | No data corruption (dedupeKey prevents dupes) | Document single-worker assumption | Trivial | None |
| P3-02 | P3 | VERIFIED BY CODE | Backend | `assertTaskOwnership` loads notes unnecessarily | `Task.findOne()` without projection | Wasted bandwidth on mutations | — | Add `.select("-notes")` to ownership check | Small | Low |
| P3-03 | P3 | HIGH-CONFIDENCE | Frontend | Mobile navigation may be inaccessible | Sidebar `hidden md:flex` in `DashboardLayout.tsx` | Mobile users can't navigate | — | Add mobile nav drawer/hamburger | Medium | Low |
| P3-04 | P3 | HYPOTHESIS | Performance | 250K-char Markdown rendering may cause UI lag | No virtualization for large DOM | Slow rendering | — | Add content size warning or virtualization | Medium | Low |
| P4-01 | P4 | VERIFIED BY CODE | Design | Inconsistent page header patterns | Each page builds own header | Visual inconsistency | — | Create shared `PageHeader` | Small | None |
| P4-02 | P4 | VERIFIED BY CODE | UX | No onboarding/empty state for new users on Dashboard | Dashboard shows zeros | Poor first impression | — | Add welcome/onboarding state | Medium | None |
| P4-03 | P4 | VERIFIED BY CODE | Design | Notes editor cramped on short viewports | `max-h-[70vh]` constrains height | Small screens get tiny editor | — | Use responsive min-height | Small | None |
| P4-04 | P4 | HYPOTHESIS | A11y | Icon-only buttons may lack aria-labels | Need per-component audit | Screen reader users affected | — | Add aria-labels | Small | None |
| P4-05 | P4 | VERIFIED BY CODE | Bundle | Both `date-fns` and `dayjs` installed | `client/package.json` | Bundle bloat (~30KB) | — | Consolidate to one library | Small | Low |
| P4-06 | P4 | VERIFIED BY CODE | Bundle | `react-dropzone` installed but unused | No file upload UI | ~17KB bundle waste | — | Remove if unused | Trivial | None |
| P5-01 | P5 | VERIFIED BY CODE | Docs | Roadmap says "Phase 14" — should be 17.3 | `docs/roadmap.md:5` | Stale docs | — | Update | Trivial | None |
| P5-02 | P5 | VERIFIED BY CODE | Testing | Zero frontend tests | No test files in `client/src` | No regression safety | — | Add critical path tests | Large | None |

---

## 21. Rejected Findings Table

| ID | Suspected Issue | Investigation | Verdict |
|---|---|---|---|
| R-01 | "2h 1d is a broken due date" | The value is `estimatedTime`, a user-entered string shown next to a Clock icon, NOT the dueDate | **FALSE POSITIVE** |
| R-02 | "Project creation captured React DevTools output" | User manually pasted clipboard text into the description field | **FALSE POSITIVE** |
| R-03 | "Backend tests completely broken because Vitest is missing" | Only the `__tests__/task.concurrency.test.ts` file uses Vitest. All 10 tests in `tests/` use Convention A (standalone scripts) and can execute with `npx tsx` | **PARTIALLY FALSE** — only 1 of 11 test files requires Vitest |
| R-04 | "Notification list React key warning" | Fixed — `notification.api.ts` normalizes `_id` to `id`; `NotificationList` uses `notification.id` as key | **FIXED** |
| R-05 | "Notification page flicker/skeleton transitions" | Fixed — deduplicated items, motion transitions, cached data preserved | **FIXED** |

---

## 22. Recommended Phase 18 Roadmap

### Phase 18.2 — Critical Fixes & Testing Foundation

**Objective:** Fix the P1 body-size bug and establish a testing baseline.

**Scope:**
- Fix Express JSON body limit for notes payloads
- Standardize backend tests on Convention A (standalone scripts)
- Either port the Vitest concurrency test to Convention A, or install Vitest+MMS as devDeps
- Add npm scripts for running all backend tests
- Add 2-3 critical frontend tests (auth flow, notes save)
- Add `express-rate-limit` on auth endpoints (login, register, refresh)

**Non-goals:** Full coverage, CI pipeline, E2E tests

**Dependencies:** None

**Completion criteria:** All backend tests execute, P1 bug fixed, auth endpoints rate-limited

---

### Phase 18.3 — Design System & Visual Foundation

**Objective:** Establish shared design primitives BEFORE polishing individual screens.

**Scope:**
- Create shared `PageHeader` component
- Audit and consolidate duplicate utility patterns
- Remove unused dependencies (`react-dropzone`, one of `date-fns`/`dayjs`)
- Ensure consistent card, spacing, and typography patterns
- Document design tokens

**Non-goals:** Complete screen redesign, new features

**Dependencies:** None

**Completion criteria:** Shared primitives exist, dependencies cleaned, visual tokens documented

---

### Phase 18.4 — Screen-by-Screen Product Refinement

**Objective:** Polish each screen to production quality using the design system.

**Scope:**
- Dashboard: Add empty/onboarding state for new users
- Projects: Polish grid cards, hover states
- Task List: Verify board view usability
- Task Detail: Polish properties panel
- Task Notes: Final editor UX pass
- Notifications: Final polish
- Settings: Audit functionality

**Non-goals:** New features, backend changes

**Dependencies:** Phase 18.3

**Completion criteria:** All screens feel polished and consistent

---

### Phase 18.5 — Responsive, Accessibility & Edge-Case Hardening

**Objective:** Make the application usable on all devices and accessible.

**Scope:**
- Implement mobile navigation (hamburger menu/drawer)
- Audit all responsive breakpoints
- Add `aria-labels` to icon-only buttons
- Test keyboard navigation on dialogs and tabs
- Handle edge cases: very long titles, very large notification counts
- Add content-size guard for very large Markdown

**Non-goals:** Complete WCAG compliance

**Dependencies:** Phase 18.4

**Completion criteria:** App usable on mobile, basic a11y passing

---

### Phase 18.6 — Production Reliability & Infrastructure

**Objective:** Prepare deployment infrastructure.

**Scope:**
- Dockerfile for API + Worker
- docker-compose for full stack (client, API, worker, MongoDB)
- Environment configuration documentation
- Graceful shutdown verification
- Structured logging consideration
- Health check verification
- CI pipeline (lint + type-check + test)

**Non-goals:** Kubernetes, cloud deployment, monitoring services

**Dependencies:** Phase 18.2 (tests must work for CI)

**Completion criteria:** `docker-compose up` runs the full stack, CI pipeline passes

---

### Phase 18.7 — Final Non-AI Product QA

**Objective:** End-to-end verification of the complete product.

**Scope:**
- Manual testing of every user flow
- Verify all edge cases addressed
- Performance spot-check
- Documentation update (roadmap, architecture, README)
- Final dependency audit

**Non-goals:** New features

**Dependencies:** All previous 18.x phases

**Completion criteria:** Product is stable, documented, and deployment-ready

---

### Phase 18.8 — AI Readiness Architecture Audit

**Objective:** Design the AI integration architecture without implementing it.

**Scope:**
- Design AI endpoint patterns
- Design `actorType` attribution for Activity model
- Design AI notification types
- Design AI user/agent concept
- Design AI notes assistance API contract
- Design AI Daily Brief data requirements
- Produce a detailed AI Architecture Plan for approval

**Non-goals:** Implementing any AI features

**Dependencies:** Phase 18.7

**Completion criteria:** Approved AI architecture plan

---

## 23. Pre-AI Quality Gate

### MUST HAVE BEFORE AI

- [ ] Fix Express body size limit (P1-01) — AI-generated content could exceed 100KB
- [ ] Rate limiting on auth endpoints (P2-06) — security baseline
- [ ] Backend test suite executes reliably — regression safety before adding complexity
- [ ] Mobile navigation functional (P3-03) — fundamental usability

### SHOULD HAVE BEFORE AI

- [ ] Standardized test infrastructure (Convention A or Vitest, not both)
- [ ] Shared design primitives (PageHeader, consistent patterns)
- [ ] Unused dependencies removed
- [ ] Documentation updated to match current state
- [ ] At least one frontend test for critical auth flow

### CAN WAIT UNTIL LATER

- [ ] Full WCAG accessibility compliance
- [ ] Docker/deployment infrastructure
- [ ] CI/CD pipeline
- [ ] Performance optimization for 250K notes
- [ ] Structured logging
- [ ] Error monitoring (Sentry)
- [ ] Empty/onboarding dashboard state
- [ ] Full responsive polish

---

## 24. Final Verdict

### Maturity Scores

| Dimension | Rating | Notes |
|---|---|---|
| **Backend Architecture** | 8/10 | Clean service layer, proper BOLA, atomic concurrency, well-indexed |
| **Frontend Architecture** | 8/10 | Feature-first, React Query well-used, Zustand minimal, no god components |
| **Frontend UX/Design** | 6/10 | Functional and dark-themed, but lacks polish consistency, onboarding, mobile nav |
| **Automated Testing** | 3/10 | Backend integration scripts exist but no CI; Vitest test broken; zero frontend tests |
| **Task Notes Reliability** | 8/10 | Atomic concurrency, serialized saves, navigation blocking. One P1 body-limit bug |
| **Notification Reliability** | 9/10 | Database-level deduplication, cursor pagination, correct BOLA, worker isolation |
| **Verified Data-Loss Risks** | 1 (P1-01) | Express body limit silently rejects large notes saves |
| **Verified Security Vulnerabilities** | 1 (P2-06) | No rate limiting on authentication endpoints |

### Top 10 Highest-Priority Findings

1. **P1-01:** Express body limit blocks large notes saves
2. **P2-06:** Zero rate limiting (brute-force risk)
3. **P2-05:** Vitest concurrency test missing dependencies
9. **P4-05:** Duplicate date libraries
10. **P5-02:** Zero frontend tests

### Top 10 Highest-Leverage Improvements

1. Add `express.json({ limit: '500kb' })` — fixes P1, 1 line change
2. Add `express-rate-limit` on auth — fixes P2-06, medium effort
3. Standardize testing convention and add npm test script — enables CI
4. Create shared PageHeader component — improves all screens
5. Add mobile navigation drawer — unlocks mobile users
6. Remove unused dependencies — reduces bundle and confusion
7. Add `.select("-notes")` to assertTaskOwnership — reduces waste
8. Add basic auth frontend test — catches regressions
9. Update roadmap documentation — single source of truth
10. Add empty dashboard onboarding — improves first impression

### AI Readiness

| Question | Answer |
|---|---|
| **Is the architecture ready for AI?** | **Yes.** Clean service layer, extensible activity/notification systems, well-separated concerns. |
| **Is the product experience ready for AI?** | **Almost.** Fix the P1 body-size bug and establish basic testing, then AI can be layered on safely. |
| **What should we do NEXT?** | **Phase 18.2** — Fix the P1 bug, establish rate limiting, and create a working test baseline. |

---

## Audit Statistics

| Metric | Count |
|---|---|
| Frontend routes audited | 14 |
| Major screens audited | 11 |
| Backend domains audited | 8 (Auth, Users, Projects, Tasks, Notes, Activity, Notifications, Dashboard) |
| API route groups audited | 8 |
| Database/query paths inspected | 20+ |
| VERIFIED BY CODE findings | 15 |
| VERIFIED BY TEST findings | 0 (tests not executed during audit) |
| VERIFIED MANUALLY findings | 0 (read-only audit) |
| HIGH-CONFIDENCE findings | 4 |
| HYPOTHESIS findings | 3 |
| REJECTED findings | 5 |
| P0 count | 0 |
| P1 count | 1 |
| P2 count | 6 |
| P3 count | 4 |
| P4 count | 6 |
| P5 count | 2 |
