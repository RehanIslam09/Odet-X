# Inventory — Backend API Surface Mapping

## Verified Backend Endpoint Surface (`server/src/routes/`)

All paths are relative to `/api/v1`.

### 1. Authentication Endpoints (`server/src/routes/auth.routes.ts`)

| Method | Path | Auth Required | Request Payload | Response Data Shape | Client API Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | No | `{ email, password, name }` | `{ user, accessToken }` | `authApi.register` |
| `POST` | `/auth/login` | No | `{ email, password }` | `{ user, accessToken }` | `authApi.login` |
| `POST` | `/auth/logout` | Yes | None | `{ success: true, message: string }` | `authApi.logout` |
| `POST` | `/auth/refresh` | No (Cookie) | None | `{ accessToken }` | `authApi.refresh` / `apiClient` |
| `GET` | `/auth/me` | Yes | None | `{ user }` | `authApi.me` |

---

### 2. Project Endpoints (`server/src/routes/project.routes.ts`)

| Method | Path | Auth Required | Request Payload | Response Data Shape | Client API Module | Phase 24 Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/projects` | Yes | Query params | `{ items: Project[], pagination }` | `projectsApi.list` | Wired |
| `POST` | `/projects` | Yes | `{ name, description, emoji, color }` | `{ project: Project }` | `projectsApi.create` | Wired |
| `GET` | `/projects/options` | Yes | None | `{ items: ProjectOption[] }` | `projectsApi.getOptions` | Wired |
| `GET` | `/projects/:id` | Yes | None | `{ project: Project }` | `projectsApi.getById` | Wired |
| `GET` | `/projects/:id/summary` | Yes | None | `{ summary: ProjectSummaryMetrics }` | `projectsApi.getSummary` | Wired |
| `PATCH` | `/projects/:id` | Yes | Partial Project | `{ project: Project }` | `projectsApi.update` | Wired |
| `DELETE` | `/projects/:id` | Yes | None | `{ success: true }` | `projectsApi.delete` | Wired |
| `POST` | `/projects/:id/archive` | Yes | None | `{ project: Project }` | `projectsApi.archive` | Wired |
| **`POST`** | **`/projects/:id/generate-tasks`** | **Yes** | **`{ description: string }`** | **`{ items: Task[] }`** | **Missing (`aiApi.generateTasks`)** | **Phase 24 WP-02/03 Target** |
| **`POST`** | **`/projects/:id/generate-summary`** | **Yes** | **`{}` (Empty object)** | **`{ project: Project }`** | **Missing (`aiApi.generateSummary`)** | **Phase 24 WP-02/03 Target** |

---

### 3. Task Endpoints (`server/src/routes/task.routes.ts`)

| Method | Path | Auth Required | Request Payload | Response Data Shape | Client API Module | Phase 24 Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | Yes | Query params | `{ items: Task[], pagination }` | `tasksApi.list` | Wired |
| `POST` | `/tasks` | Yes | Partial Task | `{ task: Task }` | `tasksApi.create` | Wired |
| `GET` | `/tasks/:id` | Yes | None | `{ task: Task }` | `tasksApi.getById` | Wired |
| `PATCH` | `/tasks/:id` | Yes | Partial Task | `{ task: Task }` | `tasksApi.update` | Wired |
| `DELETE` | `/tasks/:id` | Yes | None | `{ success: true }` | `tasksApi.delete` | Wired |
| `PATCH` | `/tasks/:id/notes` | Yes | `{ notes, expectedVersion }` | `{ task: Task }` | `tasksApi.updateNotes` | Wired |
| `POST` | `/tasks/:id/archive` | Yes | None | `{ task: Task }` | `tasksApi.archive` | Wired |
| **`POST`** | **`/tasks/:id/generate-labels`** | **Yes** | **`{}` (Empty object)** | **`{ task: Task }`** | **Missing (`aiApi.generateLabels`)** | **Phase 24 WP-02/03 Target** |

---

### 4. Activity & Notification Endpoints

| Method | Path | Auth Required | Client Function | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/activities` | Yes | `activityApi.getActivities` | Wired |
| `GET` | `/notifications` | Yes | `notificationApi.getNotifications` | Wired |
| `GET` | `/notifications/unread-count` | Yes | `notificationApi.getUnreadCount` | Wired |
| `PATCH` | `/notifications/:id/read` | Yes | `notificationApi.markAsRead` | Wired |
| `PATCH` | `/notifications/read-all` | Yes | `notificationApi.markAllAsRead` | Wired |
