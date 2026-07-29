# Phase 31 — Global Search & Command Palette
## Canonical Architecture Contract

### 1. Purpose

This document constitutes the binding, canonical **Architecture Contract** for **Phase 31 — Global Search & Command Palette** of **Odet-X / AI Project Manager**. 

It formalizes the precise technical boundaries, API contracts, domain DTOs, security scoping rules, command taxonomies, ranking algorithms, keyboard event collision policies, and testing contracts required for Work Packages **WP-01 through WP-09**. All subsequent work packages MUST conform strictly to the invariants and specifications set forth in this contract.

---

### 2. Scope

Phase 31 encompasses two related but architecturally distinct global capabilities:

1. **Global Search Engine**:
   - A server-side, deterministic, tenant-authorized multi-entity search service that enables authenticated users to search across their Projects, Tasks, Milestones, and Project Memories.
   - Exposed via a secure REST API (`GET /api/v1/search`) returning minimal, privacy-audited DTOs (`SearchResultDto`).

2. **Command Palette**:
   - A keyboard-first, accessible modal interaction shell (`Cmd+K` / `Ctrl+K`) mounted globally within the application layout (`DashboardLayout`).
   - Integrates static application commands (navigation, UI launchers, theme controls) with dynamic global entity search results.

---

### 3. Non-Goals & Explicit Exclusions

Phase 31 MUST NOT implement or include any of the following capabilities:

- **No Vector / Semantic Search**: Search is strictly deterministic substring token matching. No embeddings, vector databases, or semantic similarity algorithms.
- **No LLM / AI Query Processing**: Queries are evaluated via database regex and application ranking logic. No AI calls during search.
- **No Autonomous Action Execution**: The command palette MUST NOT execute unconfirmed state mutations or bypass Phase 28 Controlled Action security boundaries.
- **No Search in Non-Approved Collections**: No search across `User` directory, `Activity` logs, `Notification` feeds, `PlanDraft` temporary schemas, or `ProjectRecommendation` AI items.
- **No Direct Mutation via Search**: Search is 100% read-only.
- **No Phase 32 Membership Implementation**: Multi-tenant workspace membership schemas belong strictly to Phase 32. Phase 31 operates on single-tenant `owner` scoping while utilizing forward-compatible scope helper abstractions.

---

### 4. Canonical Terminology

- **Searchable Entity**: A supported Mongoose document domain (`Project`, `Task`, `Milestone`, `ProjectMemory`) accessible via global search.
- **Search Query**: A sanitized string parameter (`q`) provided by an authenticated client to search entity fields.
- **Search Result DTO (`SearchResultDto`)**: The minimal, safe JSON data shape returned by the search REST API.
- **Command Definition (`CommandDefinition`)**: A typed client-side registry record describing an executable command.
- **Command Safety Class**: Categorization of commands (Class A through E) governing execution safety and confirmation requirements.
- **Keyboard Event Target Guard**: The keyboard event evaluation logic that prevents global shortcuts (`Cmd/Ctrl+K`) from intercepting active text editor shortcuts.

---

### 5. Architectural Invariants

All implementation code in WP-01 through WP-09 SHALL strictly preserve the following non-negotiable invariants:

- **INV-01 (Determinism)**: Search result sets and ranking scores SHALL be 100% deterministic and reproducible across identical database states.
- **INV-02 (Tenant Scoping)**: Search operations SHALL be strictly authenticated (`req.user`) and tenant-isolated (`owner == req.user._id`).
- **INV-03 (Zero Mutation)**: Search endpoints and queries SHALL perform zero database writes or state mutations.
- **INV-04 (Zero AI Calls)**: Search execution SHALL make zero calls to external LLM APIs (Anthropic, Gemini, OpenAI).
- **INV-05 (Zero Vector Engine)**: Search SHALL NOT use external vector databases or cloud search engines (Elasticsearch, Meilisearch).
- **INV-06 (Parent Scoping)**: Child entities (`Task`, `Milestone`, `ProjectMemory`) under soft-deleted (`isDeleted: true`) or archived (`archived: true`) parent projects SHALL be completely excluded from search results.
- **INV-07 (Memory Privacy)**: Search responses SHALL NEVER expose full `ProjectMemory` text. Only safe, truncated snippets (max 100 chars) MAY be exposed in DTOs.
- **INV-08 (No Security Bypass)**: The Command Palette SHALL NOT serve as an authorization bypass layer. All execution MUST honor user permissions.
- **INV-09 (Workflow Reuse)**: Commands MUST reuse existing UI dialogs, React Router navigation, or TanStack Query mutations rather than duplicating business logic.
- **INV-10 (Controlled Action Boundary)**: Commands triggering Phase 28 AI actions MUST require signed confirmation tokens (`ActionExecutor`).
- **INV-11 (Destructive Confirmation)**: Destructive actions (e.g. project deletion) MUST preserve existing modal confirmation dialogs.
- **INV-12 (Stable Tie-Breaking)**: Ranking tie-breaks SHALL follow a fixed order: `score DESC` -> `updatedAt DESC` -> `_id ASC`.
- **INV-13 (Regex Sanitization)**: All search inputs SHALL be trimmed, length-bounded (max 100 chars), and escaped via `escapeRegex()` before regex construction.
- **INV-14 (No N+1 Queries)**: Resolving parent project names for child entities SHALL use batch queries (`$in`) or population, avoiding N+1 database queries.
- **INV-15 (Command Identifier Uniqueness)**: Command IDs in the command registry SHALL be globally unique strings.
- **INV-16 (Editor Shortcut Protection)**: Global `Cmd/Ctrl+K` SHALL NOT hijack active text editor shortcuts (`TaskNotesEditor` link insertion in write mode).
- **INV-17 (Shell Resilience)**: Search API network failures SHALL be caught gracefully and MUST NOT crash `DashboardLayout`.
- **INV-18 (Mocked AI Tests)**: Standard automated unit/integration tests SHALL NOT invoke live AI APIs.
- **INV-19 (Phase 32 Compatibility)**: Tenant query logic SHALL be encapsulated within internal scope helpers (`buildSearchScope`) without leaking `ownerId` into public DTOs.

---

### 6. Searchable Entity Contract

Global search supports exactly four searchable entity types.

| Entity Type | Model File | Searchable Fields | Authorization Filter | Parent Scope Requirement |
| :--- | :--- | :--- | :--- | :--- |
| `project` | `project.model.ts` | `name` (max 80c), `description` (max 1000c) | `owner: userId` | `isDeleted: false`, `archived: false` |
| `task` | `task.model.ts` | `title` (max 120c), `description` (max 2000c), `labels` | `owner: userId` | `isDeleted: false`, `archived: false`, Parent project `isDeleted: false`, `archived: false` |
| `milestone` | `milestone.model.ts` | `title` (max 120c), `description` (max 1000c) | `owner: userId` | `isDeleted: false`, Parent project `isDeleted: false`, `archived: false` |
| `memory` | `project-memory.model.ts` | `content` (max 1000c) | `owner: userId` | Parent project `isDeleted: false`, `archived: false` |

---

### 7. Entity Visibility, Archive & Delete Policy Matrix

To guarantee data consistency, search visibility rules are frozen as follows:

| Entity Condition | Visible in Global Search? | Justification |
| :--- | :--- | :--- |
| Active Project (`isDeleted: false`, `archived: false`) | **YES** | Primary active workspace entity. |
| Soft-Deleted Project (`isDeleted: true`) | **NO** | Soft-deleted items are inaccessible. |
| Archived Project (`archived: true`) | **NO** | Archived projects are hidden from default active search. |
| Task under Active Project (`isDeleted: false`, `archived: false`) | **YES** | Active task in active project. |
| Soft-Deleted Task (`isDeleted: true`) | **NO** | Soft-deleted task. |
| Archived Task (`archived: true`) | **NO** | Archived tasks are hidden from default search. |
| Task under Archived/Deleted Project | **NO** | Child entity inherits parent non-visibility. |
| Milestone under Active Project | **YES** | Active milestone in active project. |
| Milestone under Archived/Deleted Project | **NO** | Child entity inherits parent non-visibility. |
| Memory under Active Project | **YES** | Memory associated with active project. |
| Memory under Archived/Deleted Project | **NO** | Child entity inherits parent non-visibility. |

---

### 8. Search Query Normalization Contract

Query strings provided to `GET /api/v1/search?q=...` MUST be processed according to the following deterministic rules:

1. **Whitespace Trimming**: Leading and trailing whitespace is stripped (`q.trim()`).
2. **Empty Query Handling**: If `q.trim().length === 0`, the API SHALL immediately return an empty result envelope without querying the database:
   ```json
   {
     "success": true,
     "data": {
       "query": "",
       "totalResults": 0,
       "items": []
     }
   }
   ```
3. **Query Length Constraints**:
   - Minimum Length: 2 characters (`q.trim().length >= 2`). Queries under 2 characters return empty result envelopes.
   - Maximum Length: 100 characters (`q.length <= 100`). Queries exceeding 100 characters fail validation with `400 BadRequestError`.
4. **Regex Sanitization**: Special regex characters (`[`, `]`, `(`, `)`, `*`, `+`, `?`, `.`, `\`, `^`, `$`, `{`, `}`, `|`) MUST be escaped using `escapeRegex(q.trim())`. Unescaped regex operators are strictly forbidden in database queries.
5. **Case Normalization**: Regex matching uses the case-insensitive option (`$options: "i"`). Ranking scoring compares lowercase strings.

---

### 9. Search Matching & Deterministic Ranking Engine

#### Matching Semantics
Search uses substring matching across designated entity fields via escaped regex (`{ $regex: escapeRegex(query), $options: "i" }`).

#### Ranking Scoring Model
Each candidate document is assigned a numerical relevance score based on field match quality:

| Match Category | Score Weight | Description |
| :--- | :--- | :--- |
| **Exact Title Match** | `100` | Entity title/name exactly equals query (case-insensitive). |
| **Title Prefix Match** | `80` | Entity title/name starts with query (case-insensitive). |
| **Title Substring Match** | `60` | Entity title/name contains query substring. |
| **Task Label Match** | `40` | Query matches a task label string. |
| **Description / Content Match** | `30` | Entity description or memory content contains query substring. |

#### Scoring Rules
- **Non-Accumulating**: An entity that matches multiple fields receives the **highest single match score** among its matching fields (e.g. if title has a prefix match `80` and description matches `30`, the final score is `80`).
- **Memory Title Fallback**: For `ProjectMemory` (which has no title field), content substring match yields a score of `30`.

#### Deterministic Tie-Breaking Order
When multiple items have identical scores, sorting is strictly deterministic using three criteria:
1. `score DESC` (Highest score first)
2. `updatedAt DESC` (Most recently updated first)
3. `_id ASC` (Lexicographical string comparison of MongoDB ObjectId)

#### Worked Ranking Example
Query: `"alpha"`

1. Project "Alpha" -> Title exact match (`100`), `updatedAt: 2026-07-28` -> Score: 100
2. Task "Alpha Engine Implementation" -> Title prefix match (`80`), `updatedAt: 2026-07-27` -> Score: 80
3. Task "Fix Alpha Bug" -> Title substring match (`60`), `updatedAt: 2026-07-28` -> Score: 60
4. ProjectMemory "Discussed alpha architecture" -> Content match (`30`), `updatedAt: 2026-07-26` -> Score: 30

Final Output Order: Project "Alpha", Task "Alpha Engine Implementation", Task "Fix Alpha Bug", ProjectMemory "Discussed alpha architecture".

---

### 10. Result Bounding & Pagination Contract

Command Palette retrieval requires predictable, bounded performance:

- **Global Cap**: Total items returned in a single response SHALL NOT exceed **20 items**.
- **Per-Type Group Cap**: In multi-entity search (`type=all`), each entity type group is capped at **5 items max**.
- **Strict Bounding**: Per-type capacity is fixed (5 projects, 5 tasks, 5 milestones, 5 memories). Unused capacity in one group is NOT transferred to another group, maintaining clean UI grouping.
- **API `limit` Parameter**:
  - Optional query parameter `limit` (default: `20`, min: `1`, max: `50`).
  - When specific `type` filter is requested (e.g. `type=task`), results up to `limit` are returned.
- **Pagination**: Phase 31 global search DOES NOT use page/cursor pagination. Command palette search is intentionally bounded.

---

### 11. ProjectMemory Search & Privacy Contract

Project Memory content searching is authorized for human search queries under strict privacy controls:

1. **Authorization Scoping**: Memory queries MUST enforce `owner == req.user._id` and parent project `isDeleted == false` AND `archived == false`.
2. **No Full Content Leakage**: Full `ProjectMemory` documents MUST NEVER be returned in `SearchResultDto`.
3. **Snippet Generation Rules**:
   - Maximum snippet length: **100 characters**.
   - If the query string matches within the memory content, the snippet MUST center around the match (up to 40 characters before the match, extending up to 100 total characters).
   - If no match offset is found, the snippet takes the first 100 characters of `content`.
   - Ellipses (`...`) MUST be prepended/appended if content is truncated.
4. **Client-Side Highlighting**: Text highlighting of search terms SHALL be performed on the client using React text components. The server returns plain text snippets. `dangerouslySetInnerHTML` is strictly forbidden.

---

### 12. Public Search DTO Contract

All search API responses SHALL return array items matching `SearchResultDto`.

```ts
export type SearchEntityType = "project" | "task" | "milestone" | "memory";

export interface SearchResultDto {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  url: string;
  projectId?: string;
  projectName?: string;
  status?: string;
  updatedAt: string;
}
```

#### Field Specifications:
- `id`: Document string ID (`_id.toString()`).
- `type`: One of `"project"`, `"task"`, `"milestone"`, `"memory"`.
- `title`: Display title (`name` for Project, `title` for Task/Milestone, truncated snippet or `"Project Memory"` for Memory).
- `subtitle`: Contextual subtitle (e.g. Task description preview, Milestone target date, Memory content snippet).
- `url`: Canonical navigation URL (`/projects/:id`, `/tasks/:id`).
- `projectId`: Parent project string ID (for child entities).
- `projectName`: Parent project name (for child entities).
- `status`: Entity status string (e.g. task status `"IN_PROGRESS"`).
- `updatedAt`: ISO 8601 string representation of `updatedAt`.

#### Explicitly Forbidden DTO Fields:
- `owner` / `userId`
- `password`, `refreshTokenHash`
- `claimToken`, `fingerprint` (AI recommendation internals)
- `__v` (Mongoose version key)
- Raw un-truncated `ProjectMemory` content
- Action confirmation tokens or cryptographic nonces

---

### 13. Search REST API Contract

- **HTTP Method**: `GET`
- **Path**: `/api/v1/search`
- **Authentication**: Required (`authenticate` middleware). Unauthenticated requests return `401 Unauthorized`.
- **Middleware Chain**:
  ```ts
  router.get(
    "/search",
    authenticate,
    searchRateLimiter,
    validateQuery(searchQuerySchema),
    searchController.search
  );
  ```
- **Zod Validation Schema (`searchQuerySchema`)**:
  ```ts
  export const searchQuerySchema = z.object({
    q: z.string().trim().min(2, "Query must be at least 2 characters").max(100, "Query cannot exceed 100 characters"),
    type: z.enum(["all", "project", "task", "milestone", "memory"]).optional().default("all"),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  });
  ```
- **Response Envelope**:
  ```json
  {
    "success": true,
    "data": {
      "query": "alpha",
      "totalResults": 4,
      "items": [
        {
          "id": "60d5ec49f1b2c8112420a001",
          "type": "project",
          "title": "Alpha System",
          "subtitle": "Core infrastructure project",
          "url": "/projects/60d5ec49f1b2c8112420a001",
          "updatedAt": "2026-07-28T12:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### 14. Authorization & Tenant Isolation Architecture

1. **Caller Identity**: Authentication populates `req.user._id` (`Types.ObjectId`).
2. **Encapsulated Scope Helper (`buildSearchScope`)**:
   ```ts
   // Internal helper for tenant query scope construction
   export function buildSearchScope(userId: Types.ObjectId) {
     return {
       owner: userId,
       isDeleted: false,
     };
   }
   ```
3. **Child Entity Parent Scoping**:
   - `Task`, `Milestone`, `ProjectMemory` queries MUST verify parent `Project` ownership and active status (`isDeleted: false`, `archived: false`).
4. **Anti-Enumeration Response**: Requests for non-existent or unowned entity details return `404 NotFoundError` ("Resource not found").

---

### 15. Database Query & Resolution Strategy

To eliminate N+1 queries and guarantee fast execution:

1. **Parallel Entity Execution**: Queries for `Project`, `Task`, `Milestone`, `ProjectMemory` execute concurrently using `Promise.all()`.
2. **Batch Parent Project Lookup**:
   - For matching tasks, milestones, and memories, collect unique `projectId`s.
   - Batch fetch parent names: `Project.find({ _id: { $in: projectIds }, owner: userId, isDeleted: false, archived: false }, { name: 1 })`.
   - Exclude child items whose parent project is missing, unowned, soft-deleted, or archived.
3. **In-Memory Scoring & Sorting**: Candidate items (capped at 50 per entity query) are scored and sorted in memory using the deterministic ranking formula.

---

### 16. Database Indexing Architecture

Existing compound indexes cover tenant scoping. Phase 31 SHALL utilize existing compound indexes:

- `Project`: `{ owner: 1, isDeleted: 1, archived: 1 }`
- `Task`: `{ owner: 1, isDeleted: 1, archived: 1 }`
- `Milestone`: `{ owner: 1, isDeleted: 1, projectId: 1 }`
- `ProjectMemory`: `{ owner: 1, projectId: 1 }`

*Note on Substring Regex*: While compound indexes efficiently filter by `owner` and `isDeleted`, substring regex matching (`$options: "i"`) evaluates documents within the tenant's bounded candidate set. No external search engine or custom MongoDB text index is required.

---

### 17. Rate Limiting & Request Control Contract

#### Server-Side Rate Limiter
- Dedicated `express-rate-limit` instance applied to `/api/v1/search`.
- Rate limit: **30 requests per minute** per authenticated user ID (`req.user._id`).
- Failure response: HTTP `429 TooManyRequests` (`"Search rate limit exceeded. Please wait before retrying."`).

#### Client-Side Request Controls
- **Debounce**: 300ms delay on user typing before invoking search API (`useDebounce`).
- **Minimum Query Threshold**: Network requests fire only when `q.trim().length >= 2`.
- **Axios Cancellation**: In-flight search requests are cancelled using `AbortController` when new input is entered.
- **TanStack Query Configuration**:
  ```ts
  export const searchKeys = {
    all: ["search"] as const,
    query: (q: string, type?: string) => [...searchKeys.all, { q, type }] as const,
  };

  // Query options
  {
    enabled: query.trim().length >= 2,
    staleTime: 30_000, // 30 seconds
    placeholderData: keepPreviousData,
  }
  ```

---

### 18. Command Palette Architecture

The Command Palette is a single global modal component (`CommandPaletteDialog`) mounted inside `DashboardLayout`.

```
DashboardLayout
  ├── DashboardSidebar
  ├── DashboardNavbar
  ├── Main Content (<Outlet />)
  └── CommandPaletteProvider
        └── CommandPaletteDialog (<cmdk>)
```

#### Responsibilities:
- Global `Cmd+K` / `Ctrl+K` keyboard event listener.
- Unified list displaying **Static Application Commands** and **Dynamic Entity Search Results**.
- Arrow key navigation, selection, and execution handling.

---

### 19. Command Registry Contract

Static commands are registered in a centralized client registry (`client/src/features/command-palette/command.registry.ts`).

```ts
export type CommandGroupType = "navigation" | "creation" | "filters" | "system" | "actions";
export type CommandSafetyClass = "CLASS_A" | "CLASS_B" | "CLASS_C" | "CLASS_D" | "CLASS_E";

export interface CommandContext {
  currentPath: string;
  activeProjectId?: string;
  activeTaskId?: string;
  navigate: (path: string) => void;
  openDialog: (dialogId: string) => void;
  setTheme: (theme: string) => void;
}

export interface CommandDefinition {
  id: string;
  label: string;
  keywords?: string[];
  group: CommandGroupType;
  iconName?: string;
  shortcut?: string;
  safetyClass: CommandSafetyClass;
  isAvailable?: (context: CommandContext) => boolean;
  execute: (context: CommandContext) => void | Promise<void>;
}
```

---

### 20. Command Safety Taxonomy & Execution Rules

Commands are strictly classified by execution risk:

| Safety Class | Description | Execution Mechanism | Confirmation |
| :--- | :--- | :--- | :--- |
| **CLASS A** | Navigation | React Router `navigate(url)` | None |
| **CLASS B** | UI Launchers | Opens existing application dialog (`CreateProjectDialog`, `CreateTaskModal`) | None |
| **CLASS C** | Safe Client State | Adjusts client UI state / theme (`setTheme()`) | None |
| **CLASS D** | Mutating Domain Actions | Launches existing confirmation modal (`DeleteProjectDialog`, `ArchiveProjectModal`) | Modal Confirmation Required |
| **CLASS E** | AI Controlled Actions | Delegates to Phase 28 `ActionExecutor` | Signed Confirmation Token Required |

#### Direct Execution Restrictions:
- Commands MUST NOT invoke Mongoose directly.
- Commands MUST NOT fabricate server authorization.
- Commands MUST NOT bypass destructive confirmation modals or Phase 28 confirmation tokens.

---

### 21. Route & Context Awareness Contract

- `CommandContext` provides current route location (`currentPath`) and active entity parameters (`activeProjectId`, `activeTaskId`).
- Context-dependent commands MUST clearly indicate target context in their display label (e.g., `"Create Task in Current Project"`).
- If required context is missing (e.g. user is not on a project page), `isAvailable(context)` evaluates to `false` and the command is hidden.

---

### 22. Keyboard Shortcut & Collision Guard Contract

- **Primary Activation**: `Cmd+K` on macOS, `Ctrl+K` on Windows/Linux.
- **Event Collision Guard Policy**:
  The global keyboard listener SHALL ignore `Cmd/Ctrl+K` keydown events if ANY of the following conditions are met:
  1. `event.defaultPrevented === true`.
  2. `event.target` is an HTML `<textarea>` or `<input>` inside an active text editor declaring local shortcut ownership (specifically `TaskNotesEditor.tsx` in `mode === "write"`).
  3. `event.target` has `data-suppress-global-command-palette="true"`.

When an editable text editor has focus, `Cmd/Ctrl+K` performs editor-local actions (such as link insertion in task notes), leaving the global command palette closed.

---

### 23. Palette Interaction State Machine

```
   [CLOSED]
      │  Cmd/Ctrl+K (Guard passes)
      ▼
   [OPEN_EMPTY]
      │  typing query (len < 2)
      ▼
   [LOCAL_FILTERING] (Filters static commands)
      │  typing query (len >= 2)
      ▼
   [REMOTE_SEARCH_LOADING] (Shows spinner/skeleton + static matches)
      │  API response received
      ▼
   [REMOTE_RESULTS] (Renders grouped static + dynamic results)
      │  Enter / Click item
      ▼
   [EXECUTING] -> [CLOSED] (Focus restored to previous active element)
```

- **Escape Key**: Closes palette instantly and restores focus.
- **Focus Trap**: Focus is trapped within `CommandInput` while open.
- **Close Cleanup**: Query input resets to empty string upon closure.

---

### 24. Static Commands vs Dynamic Search Results Coexistence

When the user types in the Command Palette input:

1. **Static Commands**: Filtered locally on `label` and `keywords` using `cmdk` matching. Listed under groups `"Navigation"`, `"Actions"`, `"Settings"`.
2. **Dynamic Search Results**: Fetched from `GET /api/v1/search?q=...` when `q.trim().length >= 2`. Listed under groups `"Projects"`, `"Tasks"`, `"Milestones"`, `"Memories"`.
3. **Layout Order**: Static matching commands appear **above** dynamic search results in the command list.
4. **Item Limits**: Max 5 static commands per group, max 5 dynamic search items per entity group.

---

### 25. Entity Navigation Contract

Selection of a dynamic search result triggers client-side router navigation:

- `Project` -> `navigate("/projects/:id")`
- `Task` -> `navigate("/tasks/:id")`
- `Milestone` -> `navigate("/projects/:projectId")`
- `ProjectMemory` -> `navigate("/projects/:projectId")`

---

### 26. Accessibility Requirements

- **Dialog Accessibility**: `CommandDialog` uses Radix UI Dialog primitives with `<DialogHeader className="sr-only">`, `<DialogTitle>`, and `<DialogDescription>`.
- **ARIA Roles**: `cmdk` manages `role="combobox"`, `role="listbox"`, `aria-expanded`, and `aria-selected`.
- **Keyboard Navigation**: Full `ArrowUp`, `ArrowDown`, `Enter`, `Escape` navigation without mouse reliance.
- **Focus Management**: Focus automatically moves to `CommandInput` on open and returns to `document.activeElement` on close.

---

### 27. Error & Failure Semantics

- **API Failure**: Network or server errors during search render an inline error notice (`"Unable to load search results"`) inside `CommandList`. The application layout (`DashboardLayout`) MUST NOT crash.
- **Entity Gone**: If a user selects a search result for an entity deleted by another session, navigation triggers a `sonner` error toast (`"Entity no longer exists"`) and invalidates TanStack Query cache.
- **Rate Limit (`429`)**: Renders inline warning (`"Search rate limit exceeded"`).

---

### 28. Security & Threat Model

- **Tenant Isolation**: Queries strictly filtered by `owner: req.user._id` and active parent project.
- **ReDoS Prevention**: Query strings escaped via `escapeRegex()` and capped at 100 characters.
- **DTO Exposure Control**: Excluded sensitive fields (`owner`, `password`, `refreshTokenHash`, `__v`, raw memory content).
- **XSS Prevention**: Search titles and snippets rendered as plain React text nodes.
- **Action Execution Security**: Mutation commands delegate to existing confirmation dialogs or Phase 28 signed confirmation tokens.

---

### 29. Phase 28 / 29 / 30 / 32 Integration Contracts

- **Phase 28 (Controlled Actions)**: AI mutation commands MUST NOT bypass `ActionExecutor` or confirmation tokens.
- **Phase 29 (Project Memory)**: Memory search is read-only and snippet-bounded. No memory generation or vector retrieval.
- **Phase 30 (Proactive Intelligence)**: Recommendations excluded from global entity search, exposed as palette navigation actions.
- **Phase 32 (Workspaces)**: Queries encapsulated via `buildSearchScope` helper; DTOs omit tenant identity fields for clean migration.

---

### 30. Performance Budget

- **Query Latency**: Search API target execution < 150ms over `mongodb-memory-server`.
- **Debounce**: 300ms client debounce prevents query storms.
- **Batch Resolution**: Parent project resolution executed in a single `$in` query per request.
- **Payload Size**: Response envelope capped at 20 items (approx < 5KB payload).

---

### 31. Observability & Privacy Logging Rules

- **Strict Privacy**: Server logs SHALL NOT record raw user query strings or `ProjectMemory` snippet text.
- **Safe Telemetry**: Server logs MAY record request duration (`ms`), status code (`200`/`400`/`429`), and result count.

---

### 32. Mandatory Test Contract

The implementation of Phase 31 MUST include the following 57 mandatory automated tests:

#### Backend Search Tests (WP-02 / WP-03)
1. Reject unauthenticated requests with `401`.
2. Restrict results strictly to authenticated user's data (`owner`).
3. Exclude soft-deleted projects (`isDeleted: true`).
4. Exclude archived projects (`archived: true`).
5. Exclude soft-deleted tasks (`isDeleted: true`).
6. Exclude archived tasks (`archived: true`).
7. Exclude tasks belonging to soft-deleted or archived projects.
8. Exclude milestones belonging to soft-deleted or archived projects.
9. Exclude memories belonging to soft-deleted or archived projects.
10. Rank exact title matches highest (score 100).
11. Rank title prefix matches second (score 80).
12. Rank title substring matches third (score 60).
13. Rank task label matches (score 40).
14. Rank description / content matches (score 30).
15. Tie-break identical scores by `updatedAt DESC`, then `_id ASC`.
16. Sanitize regex special characters (`[`, `*`, `(`, `\`) without error.
17. Reject queries shorter than 2 characters with empty envelope.
18. Reject queries longer than 100 characters with `400 BadRequest`.
19. Filter search results by `type` parameter (`project`, `task`, `milestone`, `memory`).
20. Enforce maximum global limit cap (20 items).
21. Enforce per-type group cap (5 items per entity type in `type=all`).
22. Truncate `ProjectMemory` content to max 100-character snippet in DTO.
23. Ensure full `ProjectMemory` text is never exposed in DTO.
24. Exclude internal fields (`owner`, `password`, `__v`) from DTO.
25. Perform zero database writes during search request.
26. Perform zero live AI API calls during search.
27. Verify deterministic result ordering across repeated queries.
28. Enforce rate limiting (`429`) after exceeding 30 requests/min.

#### Command Registry Tests (WP-04)
29. Require unique command IDs across all registered commands.
30. Filter commands accurately by label and keyword matching.
31. Respect `isAvailable(context)` availability predicate.
32. Execute Class A navigation commands via React Router.
33. Execute Class B UI launcher commands via dialog handlers.
34. Prevent direct database mutations within command execution.
35. Preserve confirmation dialog boundaries for Class D destructive actions.
36. Require signed confirmation tokens for Class E Controlled Actions.

#### Frontend Palette Tests (WP-05 / WP-06 / WP-07 / WP-08)
37. Open palette on `Cmd+K` (macOS).
38. Open palette on `Ctrl+K` (Windows/Linux).
39. Close palette on `Escape` keypress.
40. Restore focus to previous active element on closure.
41. Navigate command list using `ArrowDown` and `ArrowUp`.
42. Execute selected command on `Enter` keypress.
43. Suppress global `Cmd/Ctrl+K` when typing in `TaskNotesEditor` write mode.
44. Debounce search input typing by 300ms.
45. Cancel in-flight Axios requests on new character typing.
46. Display loading skeleton during active search fetch.
47. Display empty state notice when query yields 0 matches.
48. Render error message cleanly on search API network failure.
49. Group static commands above dynamic search results.
50. Escape HTML entities to prevent XSS in result titles/snippets.
51. Include screen-reader-accessible title and description in dialog.

#### E2E & Resilience Tests (WP-09)
52. E2E: Open palette -> Type query -> Click task result -> Navigate to task page.
53. E2E: Open palette -> Select "Create Project" -> Open create project modal.
54. Resilience: Select result deleted concurrently -> Display toast error.
55. Resilience: Rapid typing does not trigger out-of-order search responses.
56. Resilience: Command Palette remains active across route transitions.
57. Resilience: Automated test suite completes with 0 live AI network calls.

---

### 33. Work Package Ownership Contract

| Work Package | Primary Technical Ownership |
| :--- | :--- |
| **WP-01** | Global search types, Zod schemas, `SearchResultDto`, normalization & ranking primitives. |
| **WP-02** | Backend search engine service, MongoDB queries, deterministic scoring, batch parent resolution. |
| **WP-03** | Express search route (`GET /api/v1/search`), rate limiter middleware, backend integration tests. |
| **WP-04** | Client command registry, typed command interfaces, safety classification, static commands. |
| **WP-05** | Command Palette UI shell (`CommandPaletteDialog`), global keyboard listener, state store. |
| **WP-06** | Frontend search API client, `useGlobalSearch` TanStack Query hook, request cancellation. |
| **WP-07** | Integration of existing UI dialog launchers and route-aware command context. |
| **WP-08** | Accessibility polish, editor keyboard collision guard, responsive styling, failure states. |
| **WP-09** | End-to-end integration tests, resilience hardening, full verification (`npm run verify`). |

---

### 34. Architecture Diagrams

#### A. Global Search Request Flow
```
User types query in Palette
       │
       ▼
300ms Debounce & Input Guard (len >= 2)
       │
       ▼
GET /api/v1/search?q=query&type=all
       │
       ▼
Authenticate Middleware (req.user)
       │
       ▼
Validate Query (searchQuerySchema & escapeRegex)
       │
       ▼
Parallel Collection Queries (Project, Task, Milestone, Memory)
       │
       ▼
Batch Parent Project Resolution & Archive/Delete Filter
       │
       ▼
Deterministic Ranking Scoring & Tie-Breaker Sorting
       │
       ▼
Safe SearchResultDto Array
       │
       ▼
Rendered in Command Palette List
```

#### B. Command Execution Flow
```
User Selects Palette Item
       │
       ├── Class A (Navigation) ───────► React Router navigate(url)
       │
       ├── Class B (UI Launcher) ──────► Open Existing Modal (e.g. CreateProjectDialog)
       │
       ├── Class C (Safe State) ───────► Client Theme / Filter State Update
       │
       ├── Class D (Destructive) ──────► Open Existing Confirmation Dialog
       │
       └── Class E (AI Action) ────────► Phase 28 ActionExecutor (Signed Token Required)
```

#### C. Keyboard Collision Guard Flow
```
Keydown Event (Cmd+K / Ctrl+K)
       │
       ▼
Is event.defaultPrevented === true? ─────► YES ──► Ignore Event (Do Not Open Palette)
       │ NO
       ▼
Is activeElement inside text editor
with local shortcut override? ──────────► YES ──► Ignore Event (Execute Local Action)
       │ NO
       ▼
Open / Toggle Command Palette
```

---

### 35. Explicitly Deferred Features

The following capabilities are explicitly deferred to future phases and SHALL NOT be built in Phase 31:

- Multi-tenant workspace memberships (Deferred to Phase 32).
- Semantic vector embeddings & AI similarity search (Deferred to future AI phase).
- Natural language agent command execution (Deferred to future agent phase).
- Activity log and audit event search (Deferred to future audit phase).
- User profile & team directory search (Deferred to Phase 32).

---

### 36. Gate 1 Compliance Checklist & Verdict

- [x] All candidate searchable entities evaluated and frozen.
- [x] Archive and soft-delete visibility policies explicitly defined.
- [x] Query normalization and regex sanitization rules frozen.
- [x] Deterministic scoring formula and tie-breaking hierarchy specified.
- [x] Privacy audit completed for `ProjectMemory` snippets and `SearchResultDto`.
- [x] REST API specification and Zod validation schemas established.
- [x] Command Palette mounting, registry interface, and safety taxonomy defined.
- [x] Keyboard collision guard rule frozen to protect text editor shortcuts.
- [x] 57 mandatory test cases specified.
- [x] Production and test code changes during Gate 1 = 0.

**Gate 1 Verdict**: **PASS — Canonical Architecture Contract Frozen**
