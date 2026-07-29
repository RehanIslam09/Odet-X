# Phase 31 — Global Search & Command Palette
## Gate 0 — Repository + UX Investigation

### 1. Executive Summary

Phase 31 introduces two related but architecturally distinct global systems to **Odet-X / AI Project Manager**:

1. **Global Search Engine**: A deterministic, tenant-authorized multi-entity search service that enables users to rapidly locate projects, tasks, milestones, and project memories across their workspace.
2. **Command Palette**: A keyboard-first modal interaction shell (invoked via `Cmd+K` on macOS or `Ctrl+K` on Windows/Linux) allowing users to search entities, trigger navigation, discover actions, and execute safe workspace workflows without abandoning keyboard context.

**Gate 0 Objectives Achieved**:
- Inspected full repository structure, active branch, dependency graph, and database schemas.
- Mapped all candidate searchable entities, field bounds, indexing state, and tenant authorization scoping.
- Analyzed existing UI primitives (`cmdk`, Radix UI Dialog, TanStack Query, Lucide icons, Sonner toasts).
- Evaluated shortcut collision risks (specifically with `TaskNotesEditor` link shortcut), focus trapping, and accessibility semantics.
- Examined Phase 28 Controlled Action integration boundaries to guarantee that command palette executions will never bypass authorization or confirmation rules.
- Assessed forward-compatibility requirements for Phase 32 (Workspaces & Memberships).
- Formulated search ranking, privacy DTO boundaries, performance risk mitigations, and failure mode protections.

**Gate 0 Verdict**: **PASS — Ready for Gate 1 Architecture Contract**


---

### 2. Repository State

- **Repository Path**: `/home/rehan/Developer/ai-project-manager`
- **Active Branch**: `feat/phase-31-global-search-command-palette`
- **Git Status**: Clean working tree on expected feature branch.
- **Package Architecture**:
  - `server`: Express v5 ESM TypeScript backend running on Node.js. Uses Mongoose v9, Zod v4, express-rate-limit.
  - `client`: Vite 8 + React 19 + TypeScript frontend with TailwindCSS v4, TanStack Query v5, React Router v7, Zustand v5.
  - `docs`: Phase documentation and architectural specifications.
- **Key Installed Dependencies Verified**:
  - `cmdk` (^1.1.1) is **already installed** in `client/package.json`.
  - `radix-ui` (^1.6.2) and `@tanstack/react-query` (^5.101.2) installed.
  - `express-rate-limit` (^8.6.0) installed on server.
  - `mongodb-memory-server` (^11.2.0) and `vitest` (^4.1.10) installed for offline deterministic testing.
- **Verification Commands**:
  - `npm run verify` runs `lint`, `typecheck`, `test`, `build`, and `smoke`.


---

### 3. Current Domain Model

The repository contains 9 Mongoose schemas. Analysis of candidate entities for Phase 31 search:

| Entity | Model File | Collection | Owner Field | Project Relation | Soft-Delete Field | Archive Field | Key Searchable Fields |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Project** | `project.model.ts` | `projects` | `owner` | N/A (Self) | `isDeleted` | `archived` | `name`, `description` |
| **Task** | `task.model.ts` | `tasks` | `owner` | `projectId` (optional) | `isDeleted` | `archived` | `title`, `description`, `labels` |
| **Milestone** | `milestone.model.ts` | `milestones` | `owner` | `projectId` (required) | `isDeleted` | N/A | `title`, `description` |
| **ProjectMemory** | `project-memory.model.ts` | `projectmemories` | `owner` | `projectId` (required) | N/A (Hard delete) | N/A | `content` |
| **User** | `user.model.ts` | `users` | `_id` | N/A | N/A (`isActive`) | N/A | `name`, `username`, `email` |
| **ProjectRecommendation** | `project-recommendation.model.ts` | `projectrecommendations` | `owner` | `projectId` | N/A (`status`) | N/A | `title`, `explanation` |
| **Activity** | `activity.model.ts` | `activities` | `owner` | `projectId` | N/A | N/A | Log audit events |
| **Notification** | `notification.model.ts` | `notifications` | `recipientId` | N/A | N/A (`readAt`) | N/A | Notification text |
| **PlanDraft** | `plan-draft.model.ts` | `plandrafts` | `owner` | `projectId` | N/A (`status`) | N/A | Temporary AI draft |


---

### 4. Candidate Searchable Entities

Based on user navigation needs and repository structure, the primary **Searchable Entities** for Phase 31 are:

1. **Projects**:
   - Primary Key: `_id`
   - Scoping: `owner == req.user._id`, `isDeleted == false`
   - Searchable Fields: `name` (max 80 chars), `description` (max 1000 chars)
   - Navigation: Direct route `/projects/:projectId`
   - Context Metadata: `emoji`, `color`, `archived` status

2. **Tasks**:
   - Primary Key: `_id`
   - Scoping: `owner == req.user._id`, `isDeleted == false`
   - Searchable Fields: `title` (max 120 chars), `description` (max 2000 chars), `labels` (string array)
   - Navigation: Direct route `/tasks/:taskId` (or project task detail)
   - Context Metadata: `status`, `priority`, `projectId`, `projectName`, `dueDate`

3. **Milestones**:
   - Primary Key: `_id`
   - Scoping: `owner == req.user._id`, `isDeleted == false`
   - Searchable Fields: `title` (max 120 chars), `description` (max 1000 chars)
   - Navigation: Parent project route `/projects/:projectId` (milestones are displayed inside the project detail view)
   - Context Metadata: `projectId`, `projectName`, `targetDate`

4. **Project Memories**:
   - Primary Key: `_id`
   - Scoping: `owner == req.user._id` (plus parent project `isDeleted == false`)
   - Searchable Fields: `content` (max 1000 chars)
   - Navigation: Parent project route `/projects/:projectId` (focusing the memories workspace section)
   - Context Metadata: `projectId`, `projectName`, `contentSnippet` (truncated to max 100 chars for safe DTO display)

*Non-Searchable Entities*:
- `User`: Single-tenant scope currently; user searching for self is redundant.
- `ProjectRecommendation`: Excluded from entity search to prevent transient/dismissed AI recommendation noise. Exposed instead as a Command Palette action ("View Active Recommendations").
- `Activity` & `Notification`: Temporal event logs, best viewed in dedicated feeds.


---

### 5. Tenant & Authorization Architecture

- **Authentication Middleware**: `authenticate` in `server/src/middleware/auth.middleware.ts` verifies Bearer JWT access tokens and populates `req.user` with the Mongoose `User` document.
- **Tenant Isolation**: Every entity contains an explicit `owner: Types.ObjectId` field matching `User._id`.
- **Query Authorization Pattern**:
  ```ts
  const filter = {
    owner: userId,
    isDeleted: false,
    // entity-specific filters
  };
  ```
- **Parent Hierarchy Scoping**: For child entities (`Task`, `Milestone`, `ProjectMemory`), services verify that the parent `Project` exists, is owned by `userId`, and is not soft-deleted.
- **Anti-Enumeration & Security**: When a requested entity ID does not exist or belongs to another tenant, backend APIs consistently return `404 NotFoundError` ("Resource not found") rather than revealing existence via `403 ForbiddenError`.
- **Phase 32 Forward Compatibility**: Global search services must take `userId: Types.ObjectId` as caller context and rely on internal query scope helpers rather than hardcoding `owner` in public DTO contracts.


---

### 6. Existing Search / Filter Infrastructure

- **Server-Side Search Utilities**:
  - `escapeRegex(str)` utility is used across `project.service.ts` and `task.service.ts` to escape special regex characters before executing Mongoose queries.
  - Project search: `{ name: { $regex: escapeRegex(search), $options: "i" } }`
  - Task search: `{$or: [{ title: searchRegex }, { description: searchRegex }, { labels: searchRegex }]}`
- **Frontend Debounce Hook**:
  - `useDebounce` exists in `client/src/hooks/useDebounce.ts` (300ms default delay).
- **Frontend Search Inputs**:
  - `TaskSearch.tsx` and `ProjectFilters.tsx` provide local input components with clear buttons.
- **Command UI Primitive**:
  - `client/src/components/ui/command.tsx` already wraps `cmdk` with shadcn design system primitives (`CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandShortcut`).


---

### 7. Frontend Routing & Navigation Map

Routing is managed by `react-router-dom` v7 in `client/src/app/router.tsx`:

```
ProtectedRoute (<DashboardLayout />)
├── /                                index -> DashboardPage
├── /projects                        index -> ProjectsDashboardPage
│   └── :projectId                             -> ProjectDetailPage
├── /tasks                           index -> TasksPage
│   ├── :taskId                                -> TaskDetailPage
│   └── :taskId/notes                          -> TaskNotesWorkspacePage
├── /activities                      index -> ActivityPage
├── /notifications                   index -> NotificationsPage
└── /settings                                  -> SettingsPage
    ├── profile
    ├── account
    ├── appearance
    ├── notifications
    ├── security
    └── danger-zone
```

**Entity Navigation Mapping**:
- `Project` -> Navigate to `/projects/:projectId`
- `Task` -> Navigate to `/tasks/:taskId`
- `Milestone` -> Navigate to `/projects/:projectId`
- `ProjectMemory` -> Navigate to `/projects/:projectId`


---

### 8. Global Application Shell

- **Root Layout**: `DashboardLayout` (`client/src/components/layout/DashboardLayout.tsx`).
- **Lifetime**: Wraps all protected routes; stays mounted during client-side navigation.
- **Context Availability**: Placed inside `AuthBootstrap`, `QueryClientProvider`, `ThemeProvider`, and `BrowserRouter`.
- **Mounting Recommendation**: The Command Palette modal (`CommandPaletteDialog`) should be mounted inside `DashboardLayout` (or a dedicated `CommandPaletteProvider` placed inside `DashboardLayout`). This ensures:
  1. Palette survives route navigation.
  2. Keyboard listener (`Cmd+K` / `Ctrl+K`) is active globally across all authenticated pages.
  3. Palette has full access to `useNavigate()`, `useQueryClient()`, and `useAuthStore()`.
  4. Palette is automatically unmounted when the user logs out.


---

### 9. Design System & Command UI Primitives

The existing design system utilizes TailwindCSS v4 with CSS variables and Radix UI primitives.

Available UI Primitives in `client/src/components/ui/`:
- `command.tsx`: `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`
- `dialog.tsx`: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `badge.tsx`, `button.tsx`, `input.tsx`, `separator.tsx`, `skeleton.tsx`, `tooltip.tsx`, `scroll-area` (via standard CSS `max-h-72 overflow-y-auto`)
- Icons: `lucide-react` (Search, Command, Check, Folder, CheckSquare, Flag, Brain, Sparkles, Settings, User, Bell, Trash2, Archive, ArrowRight, CornerDownLeft)
- Toasts: `sonner` (`toast.success()`, `toast.error()`)


---

### 10. Keyboard & Accessibility Architecture

- **Global Listener Pattern**:
  ```ts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  ```
- **Shortcut Collision Risks**:
  - `TaskNotesEditor.tsx` currently attaches a local `keydown` listener for `Cmd/Ctrl+K` to trigger markdown link insertion when editing task notes (`mode === "write"`).
  - **Mitigation Strategy**: The global command palette keyboard handler must check if `event.defaultPrevented` is true, or check whether the active element is an editable text container with a specific local shortcut override, preventing dual activation.
- **Accessibility & Screen Readers**:
  - `CommandDialog` incorporates `<DialogHeader className="sr-only">` with `<DialogTitle>` and `<DialogDescription>` for ARIA compliance.
  - `cmdk` automatically manages `role="combobox"`, `role="listbox"`, `aria-expanded`, `aria-selected`, and keyboard arrow navigation (`Up`/`Down`, `Enter` to select, `Escape` to dismiss).
  - Focus is trapped inside the dialog when open and restored to the previous active element upon closure.


---

### 11. Existing Action & Mutation Architecture

Workflow execution in the application follows a clear, layered hierarchy:

```
UI Component / Event Handler
       ↓
TanStack Query Mutation Hook (e.g. useCreateProject, useUpdateTask, useArchiveProject)
       ↓
Axios API Service (e.g. projectApi.create, taskApi.update)
       ↓
Express Route & Middleware (authenticate, validate, validateQuery)
       ↓
Controller Handler
       ↓
Domain Service (project.service, task.service)
       ↓
Mongoose Model / Database Mutation
```

- **User Feedback**: Standardized via `sonner` toasts and automated TanStack Query cache invalidations (`queryClient.invalidateQueries({ queryKey })`).
- **Destructive Operations**: Mutating actions like project deletion use explicit confirmation dialogs (`DeleteProjectDialog`).


---

### 12. Phase 28 Controlled Action Integration

Phase 28 established the **Controlled AI Action Architecture** (`server/src/ai/actions/`):
- `ActionExecutor`: Coordinates `dryRun()` (computing state diff and expected version) and `execute()` (delegating to domain services).
- `ActionRegistry`: Manages typed action handlers (`CREATE_TASK`, `UPDATE_TASK_STATUS`, `UPDATE_TASK_PRIORITY`, `UPDATE_TASK_DUE_DATE`, `ADD_TASK_LABEL`).
- Cryptographic Confirmation: Requires a signed JWT confirmation token for execution.

**Command Palette Integration Boundary**:
- The Command Palette **MUST NOT** bypass `ActionExecutor` or confirmation boundaries for AI-controlled or high-impact actions.
- Direct UI actions (navigation, launching dialogs, opening pages) execute standard client-side routing.
- Direct safe mutations (e.g. toggling task status) reuse standard TanStack Query mutation hooks.
- AI-driven mutations delegate to Phase 28 `ActionExecutor` / Copilot action APIs.


---

### 13. Candidate Command Taxonomy

Candidate commands classified by safety and execution category:

1. **Global Navigation Commands** (Read-only, Client-side router):
   - *Go to Dashboard* -> Navigates to `/`
   - *Go to Projects* -> Navigates to `/projects`
   - *Go to Tasks* -> Navigates to `/tasks`
   - *Go to Activities* -> Navigates to `/activities`
   - *Go to Notifications* -> Navigates to `/notifications`
   - *Go to Settings* -> Navigates to `/settings/profile`

2. **Creation / UI Launcher Commands** (Read-only launcher, Opens modal):
   - *Create New Project* -> Opens `CreateProjectDialog`
   - *Create New Task* -> Opens `CreateTaskModal`
   - *Generate Project Plan with AI* -> Opens `PlanProjectDialog`

3. **View & Filter Commands** (Read-only state update):
   - *Show My Open Tasks* -> Sets status filter to `IN_PROGRESS`/`TODO` on Tasks page
   - *Show High Priority Tasks* -> Sets priority filter on Tasks page
   - *Toggle Dark / Light Theme* -> Invokes `setTheme()` from `ThemeProvider`

4. **Direct Entity Commands** (Dynamic search results):
   - *Open Project [Name]* -> Navigates to `/projects/:id`
   - *Open Task [Title]* -> Navigates to `/tasks/:id`

5. **Destructive / High-Impact Mutations** (Requires Confirmation Dialog):
   - *Archive Project* -> Launches `ArchiveProjectConfirmationModal`
   - *Delete Project* -> Launches `DeleteProjectDialog`


---

### 14. Search Semantics & Ranking Inputs

- **Search Query Engine**: Deterministic MongoDB regex/token query engine.
- **Normalization**: Trimmed, lowercase, special regex symbols escaped via `escapeRegex()`.
- **Ranking Algorithm (Scoring Signals)**:
  - `Scoring Weight = Title Exact Match (100) + Title Prefix Match (80) + Title Substring Match (60) + Description/Content Match (30)`
- **Tie-Breaker**:
  1. `score` descending
  2. `updatedAt` descending
  3. `_id` ascending string comparison (guarantees 100% deterministic ordering across runs).
- **Offline CI Compatibility**: Uses native MongoDB queries supported out-of-the-box by `mongodb-memory-server`. Does not rely on external cloud search engines or proprietary indexes.


---

### 15. Search Privacy / DTO Exposure Audit

Search results must return a minimal, safe DTO (`SearchResultDto`) to prevent exposing internal schema fields:

```ts
export interface SearchResultDto {
  id: string;
  type: "project" | "task" | "milestone" | "memory";
  title: string;
  subtitle?: string;
  url: string;
  projectId?: string;
  projectName?: string;
  status?: string;
  updatedAt: string;
}
```

**Unsafe / Excluded Fields**:
- `owner` / `userId`
- `password`, `refreshTokenHash`
- `claimToken`, `fingerprint` (AI recommendations)
- Raw internal version `__v`
- Full project memory text (only safe truncated `subtitle`/snippet exposed)


---

### 16. Project Memory Search Assessment

- **Content Sensitivity**: Project memories contain user-entered architectural decisions, context notes, and requirements.
- **Recommendation**:
  - Searching Project Memory content **is approved** for Phase 31 human search requests.
  - Queries must be strictly scoped to `owner == req.user._id` and parent project `isDeleted == false`.
  - Search results display a truncated snippet (max 100 chars) with matched terms highlighted or previewed.
  - Selecting a memory result navigates to `/projects/:projectId` with the memories card focused.


---

### 17. REST API Conventions

A future search endpoint must adhere to existing project API standards:

- **Endpoint**: `GET /api/v1/search`
- **Query Parameters**:
  - `q`: string (required, min length 2, max length 100)
  - `type`: string (optional enum: `all`, `project`, `task`, `milestone`, `memory`)
  - `limit`: number (optional, default 20, max 50)
- **Middleware Chain**: `authenticate` -> `validateQuery(searchQuerySchema)` -> `searchController.search`
- **Response Envelope**:
  ```json
  {
    "success": true,
    "data": {
      "query": "alpha",
      "totalResults": 3,
      "items": [ ...SearchResultDto ]
    }
  }
  ```


---

### 18. Rate Limiting & Request Control

- **Server-Side Rate Limiter**: Apply `express-rate-limit` (e.g. 30 requests per minute per IP/user) on `/api/v1/search` to protect MongoDB from query storms.
- **Client-Side Debouncing**: 250ms–300ms debounce on input typing before triggering API requests.
- **Minimum Query Length**: Network search only fires when `q.trim().length >= 2`.
- **Request Cancellation**: Use Axios `AbortController` signal to cancel obsolete in-flight search requests when the user types a new character.


---

### 19. TanStack Query / Frontend Fetching Architecture

- **Custom Hook**: `useGlobalSearch(query: string, options?: { type?: string })`
- **Query Key Factory**:
  ```ts
  export const searchKeys = {
    all: ["search"] as const,
    query: (q: string, type?: string) => [...searchKeys.all, { q, type }] as const,
  };
  ```
- **Query Options**:
  - `enabled`: `query.trim().length >= 2`
  - `staleTime`: `30_000` (30 seconds)
  - `placeholderData`: `keepPreviousData` (prevents flicker while typing)


---

### 20. Testing Infrastructure

- **Server Integration Tests**: Sequential `tsx` runner (`server/src/tests/run.ts`) executing isolated test suites over `mongodb-memory-server`.
- **Client Component & Hook Tests**: `vitest` + `@testing-library/react` + `@testing-library/user-event` with `jsdom` environment (`client/vitest.config.ts`).
- **Smoke Tests**: `npm run smoke --prefix server`.
- **Full Verification**: `npm run verify`.


---

### 21. Phase 32 Forward Compatibility

Phase 32 will introduce **Workspaces & Memberships**:

```
Current (Phase 31):   User ──► Project (owner: UserId)
Future (Phase 32):    User ──► Workspace ──► Project (workspaceId: WorkspaceId)
```

**Design Safeguards for Phase 31**:
1. Service methods accept `userId: Types.ObjectId` as caller context and isolate tenant query construction inside internal helpers (`buildSearchScope`).
2. Search DTOs omit `ownerId` / tenant identity fields.
3. Command registry keys are entity-relative, avoiding hardcoded user ID parameters.


---

### 22. Phase 30 Interaction Assessment

- **Recommendation Entities**: Excluded from global search results to keep search output clean and non-transient.
- **Recommendation Commands**: Included in the Command Palette as action/navigation commands (e.g. "View Active Intelligence Recommendations" opens `WorkspaceRecommendationsSheet`).


---

### 23. Performance Risks

1. **Regex Collection Scans**: Substring regex (`$options: "i"`) without compound index prefixes causes full collection scans.
   - *Mitigation*: Ensure compound indexes cover `{ owner: 1, isDeleted: 1, archived: 1 }` for fast index-only filtering prior to regex evaluation.
2. **N+1 Parent Project Name Resolution**: Resolving `projectName` for tasks, milestones, and memories.
   - *Mitigation*: Perform batch project lookup (`Project.find({ _id: { $in: projectIds } })`) or use Mongoose `.populate("projectId", "name")`.
3. **Frontend Search Request Storms**: Rapid typing triggering dozens of concurrent backend queries.
   - *Mitigation*: 300ms debounce + Axios `AbortController` request cancellation.


---

### 24. Failure Mode Analysis

| Failure Mode | Category | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| Empty / whitespace-only query | Backend / Frontend | Low | Return empty result set immediately without calling database. |
| Special regex symbols in query (`[`, `*`, `(`, `\`) | Backend | High | Mandatory sanitization using `escapeRegex()`. |
| Malicious ReDoS attack | Backend | High | Enforce max query length (100 chars) and strict Zod validation. |
| Navigation to deleted/missing entity | Frontend | Medium | Display toast error ("Entity no longer exists") and refresh query cache. |
| Shortcut collision in text editor | Frontend | High | Check `event.defaultPrevented` and active input element before opening palette. |
| Concurrent typing search out-of-order response | Frontend | Medium | Cancel previous request using `AbortController`. |
| Network error during search | Frontend | Low | Render clean empty/error state inside command list without crashing UI. |


---

### 25. Reusable Infrastructure Map

| Requirement | Existing Codebase Location | Reuse Strategy |
| :--- | :--- | :--- |
| **Command UI Primitive** | `client/src/components/ui/command.tsx` | Reuse `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem` built on `cmdk`. |
| **Debounce Hook** | `client/src/hooks/useDebounce.ts` | Reuse `useDebounce(searchQuery, 300)` for search input. |
| **Auth Middleware** | `server/src/middleware/auth.middleware.ts` | Reuse `authenticate` to populate `req.user`. |
| **Query Validation** | `server/src/middleware/validate-query.ts` | Reuse `validateQuery(searchSchema)` for `GET /api/v1/search`. |
| **Regex Sanitization** | `server/src/utils/string.utils.ts` / `project.service.ts` | Reuse `escapeRegex()` helper. |
| **Toast Notifications** | `sonner` / `client/src/components/ui/` | Reuse `toast.success()`, `toast.error()`. |
| **Controlled Actions** | `server/src/ai/actions/action.executor.ts` | Delegate AI operations to `ActionExecutor`. |


---

### 26. Architecture Decisions Required for Gate 1

Gate 1 will freeze the formal Architecture Contract. The key decisions to freeze:

1. Final searchable entity set (`Project`, `Task`, `Milestone`, `ProjectMemory`).
2. Search REST API specification (`GET /api/v1/search?q=...&type=...`).
3. Search Result DTO schema (`SearchResultDto`).
4. Ranking & scoring formula (Title exact, prefix, substring, content + tie-breakers).
5. Pagination & result limits (Max 20 items total, max 5 per entity group).
6. Command Registry interface and taxonomy hierarchy.
7. Command Palette global mounting point in `DashboardLayout`.
8. Keyboard shortcut binding (`Cmd+K` / `Ctrl+K`) and collision handling.
9. Project Memory search & snippet truncation rules.
10. Controlled Action integration boundaries for mutation commands.


---

### 27. Risks, Unknowns & Blockers

- **Blockers**: None.
- **Risks**: Shortcut collision with `TaskNotesEditor` link insertion (`Cmd+K`). Handled via keyboard event target guard.
- **Dependencies**: All required packages (`cmdk`, `radix-ui`, `express-rate-limit`, `mongodb-memory-server`, `vitest`) are already present in the workspace.


---

### 28. Gate 0 Verdict

**PASS — Ready for Gate 1 Architecture Contract**
