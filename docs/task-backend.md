# Task Backend Architecture

The Task module provides a robust, type-safe, and production-ready backend implementation for managing workspace tasks. It handles pagination, filtering, searching, sorting, soft deletes, and strict ownership boundary verification.

---

## 1. Database Schema (`Task`)

Located at [task.model.ts](file:///wsl.localhost/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/models/task.model.ts).

### Field Definitions
- **`owner`** (`ObjectId`, ref: `"User"`, required): Scopes all queries and mutations to the authenticated creator.
- **`projectId`** (`ObjectId`, ref: `"Project"`, optional/nullable): Identifies the project the task is assigned to.
- **`title`** (`String`, required, trimmed, max 150): The name of the task.
- **`description`** (`String`, default `""`, trimmed, max 5000): Additional task details or logs.
- **`status`** (`String`, enum, default `"todo"`): Current state (`backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`).
- **`priority`** (`String`, enum, default `"none"`): Priority tier (`none`, `low`, `medium`, `high`, `urgent`).
- **`dueDate`** (`Date`, optional/nullable): The deadline for the task.
- **`estimatedTime`** (`String`, optional/nullable, trimmed, max 20): Formatted estimation (e.g., `"2h"`, `"1d"`).
- **`labels`** (`[String]`, default `[]`): Array of normalized classification tags.
- **`completedAt`** (`Date`, default `null`): Automatically populated when status is transitioned to `"done"`.
- **`archived`** (`Boolean`, default `false`): Supports soft-hiding completed or old tasks from the active dashboard.
- **`isDeleted`** (`Boolean`, default `false`): Enables soft-delete; tasks are never physically removed.

### Architectural Features

#### Optimistic Concurrency Control
Optimistic concurrency is enabled via Mongoose's `optimisticConcurrency: true` option. This ensures that concurrent edits of the same task throw a `VersionError` instead of silent overwrites (lost updates), protecting data integrity.

#### Pre-Save Hooks
A `pre("save")` Mongoose middleware:
1. **`completedAt` Syncing**: Sets `completedAt` to the current date-time if `status` changes to `"done"`. Resets to `null` if the status is moved away from `"done"`.
2. **Labels Normalization**: Trims whitespace from tags, removes duplicates, filters out empty strings, and ignores tags containing only whitespace.

### Indexing Strategy
Compound indexes are defined on fields to maximize performance under high query load:

- `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }`  
  *Core Dashboard view index.*
- `{ owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 }`  
  *Project Task view index.*
- `{ owner: 1, isDeleted: 1, archived: 1, status: 1, updatedAt: -1 }`  
  *Status filter index.*
- `{ owner: 1, isDeleted: 1, archived: 1, priority: 1, updatedAt: -1 }`  
  *Priority filter index.*
- `{ owner: 1, isDeleted: 1, archived: 1, dueDate: 1, updatedAt: -1 }`  
  *Due date filter & sorting index.*
- `{ owner: 1, isDeleted: 1, labels: 1 }`  
  *Tag filter index.*

---

## 2. Request Validation

Located at [task.validator.ts](file:///wsl.localhost/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/validators/task.validator.ts).

- Implements strict validation on incoming payload bodies, parameters, and query lists.
- Infers TypeScript contracts (`CreateTaskDto`, `UpdateTaskDto`, `TaskQueryDto`) directly from the Zod schemas using `z.infer`.
- Converts date strings to native JS `Date` objects and coerses pagination numbers safely.
- Enforces whitelists on search parameters and sort criteria.

---

## 3. Endpoints

All endpoints require authentication (JSON Web Token cookie) and are prefix-registered under `/api/v1/tasks`.

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | List all tasks | `page`, `limit`, `search`, `status`, `priority`, `projectId`, `sort`, `archived` |
| **POST** | `/` | Create a new task | *(Request body: `CreateTaskDto`)* |
| **GET** | `/:id` | Fetch task details | *Requires valid task ID parameter* |
| **PATCH** | `/:id` | Update task fields | *(Request body: `UpdateTaskDto`)* |
| **DELETE** | `/:id` | Soft-delete a task | *Requires valid task ID parameter* |
| **POST** | `/:id/archive` | Toggle task archived state | *Requires valid task ID parameter* |

---

## 4. Security & Safety Controls

- **Strict User Boundaries**: All queries are scoped to the authenticated user ID (`req.user._id`). There is no query boundary leaks.
- **Resource Enumeration Prevention**: `assertTaskOwnership` queries only non-deleted tasks. If a task ID belongs to another user, or does not exist, the API throws `NotFoundError` (404) instead of `ForbiddenError` (403).
- **Referenced Project Access Checks**: When creating or updating a task with a `projectId`, the service checks that the target project exists, is not deleted, and belongs to the requesting user before completing the write operation.
