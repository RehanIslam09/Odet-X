# Phase 24 — Target Frontend Architecture

## 1. Overview

This document defines the target frontend architecture for Phase 24. The architecture adheres to clean component boundaries, strict state ownership, centralized HTTP communication, and predictable TanStack Query mutation lifecycle management.

---

## 2. Component-to-Backend Execution Flow

```
Browser User Action (e.g. Click "Generate Tasks with AI")
   ↓
React Feature Component (e.g. GenerateTasksDialog.tsx)
   ↓
Feature Mutation Hook (e.g. useGenerateTasks.ts)
   ↓
Feature / AI API Module (e.g. ai.api.ts)
   ↓
Centralized Axios Client (apiClient in services/axios.ts)
   ├── Attaches Authorization: Bearer <accessToken>
   └── Handles 401 transparently via refresh cookie
   ↓
Express API Gateway (/api/v1)
   ├── POST /projects/:projectId/generate-tasks
   ├── POST /projects/:projectId/generate-summary
   └── POST /tasks/:taskId/generate-labels
   ↓
Backend AI Orchestrator (Phase 20–23 Multi-Provider Subsystem)
```

---

## 3. Strict State Ownership Matrix

| State Category | Responsible Tech Stack | Primary File / Location | Rules & Boundaries |
| :--- | :--- | :--- | :--- |
| **Server State** | TanStack Query v5 | Custom hooks (`useProjects`, `useTasks`, `useGenerateTasks`) | Zero server state stored in Zustand or local React state. Cache invalidation handles updates. |
| **Global UI State** | Zustand v5 | `client/src/store/auth.store.ts` | Strictly session state (`isBootstrapping`, `user`, `isAuthenticated`). |
| **Form State** | React Hook Form + Zod | Components (`CreateProjectDialog`, `GenerateTasksDialog`) | Manages local field inputs, validation errors, and submission status. |
| **Route State** | React Router v7 | `client/src/app/router.tsx` | URL parameters (`:projectId`, `:taskId`), query strings, navigation state. |
| **Local UI Ephemeral** | React `useState` / `useReducer` | Feature components | Dialog open/closed state, filter toggles, active tab selections. |

---

## 4. API Client & HTTP Layer Specification

All network requests MUST use the centralized `apiClient` instance exported from `client/src/services/axios.ts`.

### Target AI API Module (`client/src/features/ai/services/ai.api.ts`):

```typescript
import { apiClient } from "@/services/axios";
import type { Task } from "@/features/tasks/types/tasks.types";
import type { Project } from "@/features/projects/types/projects.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface GenerateTasksDto {
  description: string;
}

export interface GenerateTasksResponseData {
  items: Task[];
}

export interface GenerateSummaryResponseData {
  project: Project;
}

export interface GenerateLabelsResponseData {
  task: Task;
}

export const aiApi = {
  /**
   * Generates tasks for a project based on a prompt description.
   */
  generateTasks: async (
    projectId: string,
    data: GenerateTasksDto,
  ): Promise<GenerateTasksResponseData> => {
    const response = await apiClient.post<ApiResponse<GenerateTasksResponseData>>(
      `/projects/${projectId}/generate-tasks`,
      data,
    );
    return response.data.data;
  },

  /**
   * Generates an AI summary for a project.
   */
  generateSummary: async (
    projectId: string,
  ): Promise<GenerateSummaryResponseData> => {
    const response = await apiClient.post<ApiResponse<GenerateSummaryResponseData>>(
      `/projects/${projectId}/generate-summary`,
      {},
    );
    return response.data.data;
  },

  /**
   * Generates AI labels for a task.
   */
  generateLabels: async (
    taskId: string,
  ): Promise<GenerateLabelsResponseData> => {
    const response = await apiClient.post<ApiResponse<GenerateLabelsResponseData>>(
      `/tasks/${taskId}/generate-labels`,
      {},
    );
    return response.data.data;
  },
};
```

---

## 5. TanStack Query Mutation & Cache Invalidation Strategy

AI actions mutate server data and create secondary effects (e.g. generating tasks creates Task documents and Activity logs). Therefore, mutation hooks must execute targeted query cache invalidations:

### 1. `useGenerateTasks(projectId: string)`
- **Mutation Function**: `aiApi.generateTasks(projectId, { description })`
- **On Success**:
  - Invalidate `taskKeys.lists()` (refreshes task lists).
  - Invalidate `projectKeys.summary(projectId)` (refreshes task count metrics).
  - Invalidate `activityKeys.project(projectId)` (refreshes activity timeline).
  - Display success toast: `"AI generated [N] tasks successfully."`

### 2. `useGenerateProjectSummary(projectId: string)`
- **Mutation Function**: `aiApi.generateSummary(projectId)`
- **On Success**:
  - Invalidate `projectKeys.detail(projectId)` (refreshes project data with `aiSummary`).
  - Invalidate `activityKeys.project(projectId)` (refreshes activity timeline).
  - Display success toast: `"Project AI summary updated successfully."`

### 3. `useGenerateTaskLabels(taskId: string)`
- **Mutation Function**: `aiApi.generateLabels(taskId)`
- **On Success**:
  - Invalidate `taskKeys.detail(taskId)` (refreshes task detail with new labels).
  - Invalidate `taskKeys.lists()` (refreshes label chips in task tables/cards).
  - Invalidate `activityKeys.task(taskId)` (refreshes task timeline).
  - Display success toast: `"AI labels generated and applied."`

---

## 6. Error Handling & Feedback Strategy

- **Validation Errors (400)**: Displayed inline in form dialogs using `applyServerErrors` and `form.setError`.
- **Transient / Server Errors (500, 502, 503, 429)**: Caught by mutation `onError` handler; extracted via `getApiError(error).message`; presented via Sonner toast (`toast.error(message)`).
- **Authentication Errors (401)**: Intercepted automatically by Axios client; user redirected to login if session restoration fails.
