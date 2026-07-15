# Project Foundation Implementation Plan

## 1. Goal & Scope
Implement the foundational Project domain. This phase sets up the core data structures and UI for projects, which are the basic organizational units of the application. It explicitly excludes Tasks, AI features, and Collaboration.

Supported operations:
- Login and view own projects
- Create, Edit, Archive, Delete a project
- Search, Filter, Paginate projects

## 2. API Design

Base URL: `/api/v1/projects`
Authentication: Bearer Token required for all routes.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List paginated projects for the authenticated user |
| POST | `/` | Create a new project |
| GET | `/:id` | Get a specific project by ID |
| PATCH | `/:id` | Update project details |
| DELETE | `/:id` | Soft delete a project (or hard delete based on design logic) |
| POST | `/:id/archive` | Toggle project archive status |

### Query Parameters (GET `/`)
- `page` (default 1)
- `limit` (default 10, max 50)
- `search` (case-insensitive on name)
- `sort` (e.g., `-updatedAt`)
- `archived` (boolean, default false)

## 3. Database Decisions (MongoDB)

### Schema (Project Model)
```typescript
{
  owner: ObjectId (ref: 'User', indexed, required)
  name: String (trim, min 1, max 100, required)
  description: String (trim, max 500)
  emoji: String (default: '📁')
  color: String (hex code)
  status: String (enum: ['active', 'completed', 'on_hold'], default: 'active')
  visibility: String (enum: ['private', 'workspace'], default: 'private') // Future-proofing for workspaces
  archived: Boolean (default: false, indexed)
  isDeleted: Boolean (default: false, indexed) // For soft-delete
}
```

### Indexes
- `{ owner: 1, archived: 1, isDeleted: 1 }` - Primary index for the dashboard list query.
- `{ owner: 1, name: 'text' }` - Text index for future scalable search (initially regex search may suffice, but text index prepared).

### Architecture Decisions
- **Soft Delete**: `DELETE /projects/:id` sets `isDeleted: true`. This prevents accidental loss of context for AI, aligning with the "reversibility" and "context compounds" principles.
- **Archive vs Delete**: Archive hides it from default views but keeps it accessible. Delete removes it from all user views but retains it in the database for AI context/recovery.

## 4. Backend Implementation

Follows the layered architecture: Request → Validation → Auth → Controller → Service → DB

- **Models**: `server/src/models/project.model.ts`
- **Validators**: `server/src/validators/project.validator.ts` (Zod schemas for Create, Update, Query)
- **Services**: `server/src/services/project.service.ts` (Business logic, ownership checks, pagination, soft-delete logic)
- **Controllers**: `server/src/controllers/project.controller.ts` (Thin HTTP layer)
- **Routes**: `server/src/routes/project.routes.ts` (Mounted at `/api/v1/projects`)

## 5. Frontend Implementation

Feature-first architecture inside `client/src/features/projects/`.

### Folder Structure
```
features/projects/
├── components/
│   ├── ProjectCard.tsx       # Framer motion, shadcn UI
│   ├── ProjectGrid.tsx
│   ├── ProjectFilters.tsx    # Search & status/archived toggles
│   ├── ProjectEmptyState.tsx # Polished empty experience
│   ├── CreateProjectDialog.tsx
│   └── EditProjectDialog.tsx
├── hooks/
│   ├── useProjects.ts        # React Query (list, pagination)
│   ├── useProject.ts         # React Query (detail)
│   ├── useCreateProject.ts   # Mutation (optimistic update/invalidation)
│   ├── useUpdateProject.ts   # Mutation (optimistic update)
│   ├── useArchiveProject.ts  # Mutation (optimistic update)
│   └── useDeleteProject.ts   # Mutation (with confirm dialog)
├── pages/
│   ├── ProjectsDashboardPage.tsx # Replaces placeholder dashboard
│   └── ProjectDetailPage.tsx
├── services/
│   └── projects.api.ts       # Typed Axios calls mirroring auth.api.ts
├── types/
│   └── projects.types.ts     # DTOs, interfaces
├── validators/
│   └── projects.schemas.ts   # Zod validation matching backend
└── utils/
    └── projects.utils.ts     # Color/emoji helpers
```

## 6. UI Flow & State

1. **Dashboard (Landing)**: `/`
   - Shows `ProjectFilters` (Search bar, Show Archived toggle).
   - Shows `ProjectGrid` using `ProjectCard`s.
   - If `projects.length === 0`, show `ProjectEmptyState` (beautiful illustration, high-quality typography).
   - Loading handled via skeleton loaders (no spinners).
   - Pagination controls at the bottom.
2. **Create Project**:
   - Click "New Project" -> opens `CreateProjectDialog`.
   - Uses React Hook Form + Zod.
   - Handles server errors using `applyServerErrors`.
3. **Edit Project**:
   - Accessed via ProjectCard context menu or detail page.
   - Opens `EditProjectDialog` with pre-filled values.
4. **Archive/Delete**:
   - Archive toggles state and moves out of default view immediately (optimistic).
   - Delete prompts an intentional confirmation dialog.

## 7. Validation
- **Backend & Frontend**: Zod schemas shared in concept.
- **Pagination**: Validate `page` (min 1) and `limit` (max 50) on backend.
- **Sanitization**: Trim strings, validate emoji formats (length/unicode), validate color hex codes.

## 8. Security Considerations
- **Ownership scoping**: Every DB query in `project.service.ts` must include `{ owner: req.user._id }`. Users can NEVER query, edit, or delete a project they do not own.
- **Pagination**: Strict maximum limits enforced on list endpoints to prevent DoS.
- **Injection**: Handled inherently by Mongoose and Zod.

## 9. Scalability Considerations
- **Pagination**: Enforced from day 1 so dashboard load times remain constant (O(limit)) regardless of total project count.
- **Indexes**: Compound index on `(owner, archived, isDeleted, updatedAt)` directly supports the most common dashboard queries, preventing collection scans.
- **Decoupling**: Project logic is completely isolated from Auth. Prepares for future `Workspace` scoping by keeping ownership decoupled in the service layer.
