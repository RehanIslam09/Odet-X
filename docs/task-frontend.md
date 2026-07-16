# Task Frontend Integration Documentation

This document describes the design, architecture, and integration details of the Tasks page frontend module.

---

## 1. Directory Structure

All frontend assets are located under `client/src/features/tasks`:

```
features/tasks/
├── components/           # UI Elements & Dialogs
│   ├── CreateTaskDialog.tsx
│   ├── EditTaskDialog.tsx
│   ├── DeleteTaskDialog.tsx
│   ├── TaskCard.tsx
│   ├── TaskFilters.tsx
│   ├── TaskToolbar.tsx
│   └── TaskList.tsx
├── hooks/                # TanStack Query & Mutation Hooks
│   ├── useTasks.ts
│   ├── useTask.ts
│   ├── useCreateTask.ts
│   ├── useUpdateTask.ts
│   ├── useDeleteTask.ts
│   ├── useArchiveTask.ts
│   └── index.ts
├── pages/                # Parent page containers
│   └── TasksPage.tsx
├── services/             # Axios API Client
│   └── tasks.api.ts
├── types/                # TypeScript Interfaces
│   └── tasks.types.ts
└── validators/           # Zod Schema definitions
    └── tasks.schemas.ts
```

---

## 2. API Client & Typed Axios Wrappers

The API module `tasks.api.ts` maps task endpoints to type-safe Axios calls using the central `apiClient`.
- Returns typed response payloads wrapped in the standard `ApiResponse` envelope.
- Scopes requests automatically via cookie-based authentication.

---

## 3. TanStack Query Architecture

### Query Key Factory (`taskKeys`)
Query keys are centralized in [useTasks.ts](file:///wsl.localhost/Ubuntu/home/rehan/Developer/ai-project-manager/client/src/features/tasks/hooks/useTasks.ts) to prevent typos and ensure clean, targeted cache invalidations:
- `taskKeys.all` = `['tasks']` (Base namespace)
- `taskKeys.lists()` = `['tasks', 'list']` (Task listing namespace)
- `taskKeys.list(params)` = `['tasks', 'list', params]` (Filtered list instance)
- `taskKeys.details()` = `['tasks', 'detail']` (Task detail namespace)
- `taskKeys.detail(id)` = `['tasks', 'detail', id]` (Task detail instance)

### Preserving Pagination Layout
We utilize `placeholderData: (previousData) => previousData` to prevent screen flickering or layout shifts while fetching new pages.

---

## 4. Mutation Strategy & Invalidation

All mutations use Sonner to toast feedback messages to the user:

- **Create Task (`useCreateTask`)**  
  - Invalidates `taskKeys.lists()` to refresh all views with the new task.
- **Update Task (`useUpdateTask`)**  
  - Invalidates `taskKeys.detail(id)` and `taskKeys.lists()` to ensure stale data is never served.
- **Archive Task (`useArchiveTask`)**  
  - Toggles archived state. Invalidates details cache and lists.
- **Delete Task (`useDeleteTask`)**  
  - Soft-deletes task. Removes detail cache entry (`removeQueries`) and invalidates list caches.

---

## 5. Form Validation & Server Errors

- Forms are built using **React Hook Form** + **Zod**.
- Schemas (`createTaskSchema` & `updateTaskSchema`) validate title constraints (min 1, max 150), description limits (max 5000), and format dates/estimations.
- Server-side validation errors are automatically parsed using the shared `getApiError` utility and populated back into the form fields using `applyServerErrors(form.setError, errors)`, matching the login/register flows.

---

## 6. Accessibiltiy & Accessibility Details

All dialog components include:
- Focus trapping and restoration via Radix UI `Dialog` components.
- Clear `aria-describedby` labels for screen-reader readability.
- Full keyboard support: Escape to dismiss, Enter to submit, and Tab-navigation.
