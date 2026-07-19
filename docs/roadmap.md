# AI Project Manager — Roadmap

## Current Status

**Current Phase:** Phase 14 — Dashboard Analytics (complete)

**Branch:** `main`

---

## ✅ Phase 1 — Project Bootstrap

### Tech Stack
- React 19 + React Compiler
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- React Router v7
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Framer Motion

### Tooling
- ESLint, Prettier, Husky, lint-staged

### Completed
- Feature-first architecture
- Shared layout components
- Shared UI components
- Documentation structure

---

## ✅ Phase 2 — Application Bootstrap

- QueryClient configuration
- Router configuration
- AppProviders
- Application bootstrap
- Nested routing
- Dashboard placeholder page
- Auth placeholder pages

---

## ✅ Phase 3 — Application Shell

- DashboardLayout
- DashboardNavbar
- DashboardSidebar (responsive)
- Navigation configuration and types
- SidebarItem component with active route highlighting
- Mobile navigation drawer
- ThemeProvider (light / dark mode, persistence)
- User dropdown menu
- 404 page
- Protected route skeleton

---

## ✅ Phase 4 — Backend Foundation

- Express + TypeScript server
- MongoDB + Mongoose
- Centralized environment configuration (`config/env.ts`)
- Database connection layer (`config/database.ts`)
- Health check endpoint
- API versioning (`/api/v1`)
- Global 404 middleware
- Global error handler
- Async error handler utility
- AppError class hierarchy

---

## ✅ Phase 5 — User Registration

- User model with bcrypt password hashing
- Duplicate email detection
- Safe JSON serialization (password excluded from responses)
- `POST /api/v1/auth/register`

---

## ✅ Phase 6 — Core Authentication

- JWT access token generation and verification
- JWT refresh token generation and verification
- Authentication middleware
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

---

## ✅ Phase 7 — Production Authentication (Backend)

### Security Hardening
- Refresh tokens hashed with SHA-256 before DB storage (never stored plaintext)
- Refresh token transmitted exclusively as HTTP-only cookie (never in JSON body)
- Token rotation on every refresh (old token immediately invalidated)
- Reuse detection: suspected replay triggers full session invalidation
- Generic authentication error messages (prevents account enumeration)
- `isActive` account check on every authenticated request

### Validation Layer
- Zod validation middleware factory (`validate()`)
- Auth schemas (`registerSchema`, `loginSchema`)
- Field-level error responses compatible with frontend form libraries
- DTOs inferred from Zod schemas — single source of truth

### Endpoints
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/api/v1/auth/register` | None | ✅ |
| POST | `/api/v1/auth/login` | None | ✅ |
| POST | `/api/v1/auth/refresh` | Cookie | ✅ |
| POST | `/api/v1/auth/logout` | Bearer | ✅ |
| GET | `/api/v1/auth/me` | Bearer | ✅ |

---

## ✅ Phase 8 — Frontend Authentication

### Infrastructure
- Centralized Axios client (`services/axios.ts`)
  - Token manager (module-level memory, never localStorage)
  - Request interceptor: auto-attach Authorization header
  - Response interceptor: transparent token refresh on 401
  - Refresh lock: prevents concurrent refresh calls
  - Auto-logout on refresh failure
- Environment variable setup (`VITE_API_URL`)

### State Management
- Zustand auth store (`store/auth.store.ts`)
  - `user: User | null` — the only auth UI state
  - `setUser()`, `clearUser()` actions
  - No tokens ever stored in Zustand
- React Query configuration tuned for auth
  - `retry: false` for 401/403 responses
  - `refetchOnWindowFocus: false`

### API Layer
- Typed auth API module (`features/auth/services/auth.api.ts`)
  - `authApi.register()`, `authApi.login()`, `authApi.logout()`, `authApi.refresh()`, `authApi.me()`

### React Query Hooks
- `useCurrentUser()` — bootstrap hook, `staleTime: Infinity`, syncs Zustand
- `useLogin()` — sets token in memory, populates Zustand and query cache
- `useRegister()` — navigates to login on success
- `useLogout()` — clears token, Zustand, query cache

### Routing
- `ProtectedRoute` — real auth check with `AppLoader` during bootstrap
- `PublicRoute` — redirects authenticated users, `AppLoader` during bootstrap
- Full route structure: `/`, `/auth/login`, `/auth/register`, `/session-expired`, `/unauthorized`

### Forms
- `LoginForm` — RHF + Zod, server error application, password toggle, accessibility
- `RegisterForm` — RHF + Zod, server error application, password toggle, accessibility
- `applyServerErrors()` — reusable utility for mapping server validation errors to RHF
- `getApiError()` — reusable utility for extracting API error messages

### UI
- `AuthLayout` — two-column (brand panel 40% + form panel 60%), Framer Motion animations
- `AppLoader` — full-screen bootstrap spinner
- `LoginPage`, `RegisterPage`, `SessionExpiredPage`, `UnauthorizedPage`
- `UserMenu` — wired to real user state and logout

### Shared Types & Validators
- `features/auth/types/auth.types.ts` — User, DTOs, response shapes
- `features/auth/validators/auth.schemas.ts` — Zod v4 schemas, inferred types

### Documentation
- `docs/authentication.md` — updated with frontend architecture
- `docs/architecture.md` — updated with token isolation, state layers, bootstrap flow
- `docs/roadmap.md` — this file

---

## ✅ Phase 9 — Project Management

- Project model (Mongoose)
- CRUD endpoints
- Soft delete & Archive semantics
- Project summary & options endpoints
- Project list dashboard (Grid view)
- Search, Filter, Pagination
- Project validation schemas
- Project Detail Workspace

---

## ✅ Phase 10 — Task Management

- Task model
- Ownership and Project association
- Task CRUD endpoints
- Due dates, priorities, labels, estimates
- Task Detail Workspace
- Soft delete & Archive semantics
- Quick status/priority workflows

---

## 📋 Phase 11 — AI Features (Deferred)

- OpenAI client integration
- AI task generation from project description
- AI project planning / sprint estimation
- Smart summaries of project activity

---

## 📋 Phase 12 — Real-time Collaboration (Deferred)

- WebSocket / Socket.io integration
- Live task updates
- Presence indicators
- Comments
- In-app notifications

---

## ✅ Phase 13/14 — Analytics Dashboard

- Production dashboard backend (`/api/v1/dashboard/overview`)
- Productivity grid (Active projects, tasks, etc)
- Recent Projects with progress bars
- Focus Today / Attention Tasks
- Intelligent React Query cache synchronization

---

## ✅ Phase 15 — Activity & Audit Foundation

- Activity & Audit model
- Best-effort bulk insertion layer
- Granular event definitions (Created, Updated, Status Changed, etc.)
- Task & Project Service integration
- Isolated test infrastructure with Tenant boundaries
- Cursor pagination for Activity feed
- Dashboard and Entity-specific frontend timelines

---

## ✅ Phase 16.1 — Notification Backend Foundation

- Separate Notification domain (distinct from Activity)
- Actionable read/unread state tracking
- Tenant isolation and BOLA protections
- Snapshot persistence for resilient history
- Cursor paginated API, unread count API
- Idempotent state updates
- (Active producers deferred to future collaboration/AI phases)

---

## ✅ Phase 16.2 — Notification Center Frontend Integration

- Notification Bell and unread count badge in Dashboard Navbar
- Popover preview with lazy fetching
- Dedicated cursor-paginated `/notifications` page
- Filter by All, Unread, and Read statuses
- Contextual entity navigation from notifications
- Cache synchronization via authoritative invalidation and optimistic unread counts

---

## ✅ Phase 16.3 — Notification Producers & Scheduled Reminders

- Node-cron independent worker process (`worker.ts`)
- Global `task.due_soon` (24h) evaluation
- Global `task.overdue` evaluation
- Strict MongoDB-level idempotency via sparse `dedupeKey` index
- (Real-time delivery via WebSockets deferred to Phase 12 Collaboration)

## ✅ Phase 17 — Deployment

- Docker + docker-compose
- CI/CD pipeline (GitHub Actions)
- Production deployment (Railway / Render / AWS)
- Redis for rate limiting and caching
- Monitoring (Sentry)
- Structured logging