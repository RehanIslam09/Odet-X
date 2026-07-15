# AI Project Manager - Architecture

## Philosophy

This project is built as a production-quality SaaS application. The primary goals are:

- **Scalability** — the architecture should not need to be restructured as the feature set grows
- **Maintainability** — the codebase should be understandable six months from now
- **Security** — authentication and data access are treated with production seriousness
- **Separation of Concerns** — each layer has exactly one responsibility

---

## Frontend Architecture

The client uses a **feature-first** organization. Business logic belongs inside features, never in shared components.

```
client/src/
├── app/             # Application bootstrap (router, providers, QueryClient)
├── components/
│   ├── common/      # Shared utility components (AppLoader, etc.)
│   ├── layout/      # Layout shells (AuthLayout, DashboardLayout, etc.)
│   └── ui/          # shadcn/ui primitive components
├── features/        # Feature modules — all business logic lives here
│   └── auth/
│       ├── components/   # LoginForm, RegisterForm
│       ├── hooks/        # useCurrentUser, useLogin, useRegister, useLogout
│       ├── pages/        # LoginPage, RegisterPage, SessionExpiredPage, UnauthorizedPage
│       ├── services/     # auth.api.ts — HTTP calls only
│       ├── types/        # auth.types.ts — User, DTOs, response shapes
│       └── validators/   # auth.schemas.ts — Zod schemas
├── hooks/           # Shared custom hooks (none yet)
├── lib/             # Third-party library configuration (utils.ts)
├── providers/       # Global providers (ThemeProvider)
├── routes/          # Route guards (ProtectedRoute, PublicRoute)
├── services/        # Centralized Axios client (axios.ts)
├── store/           # Zustand stores (auth.store.ts)
├── styles/          # Global styles
├── types/           # Shared TypeScript types (none yet — feature types stay in features)
└── utils/           # Shared utilities (api-error.ts, form-errors.ts)
```

### State Management

Four distinct layers own state — they never overlap:

| Layer | Owns | Never Owns |
|---|---|---|
| **AuthBootstrap** | Initialization: coordinates exactly one session restoration on startup | UI State, Network fetching |
| **React Query** | Server state: user data, loading, caching, invalidation, retry | Tokens, client UI state |
| **Zustand** | Client UI state: `isBootstrapping`, `isAuthenticated`, `user: User \| null` | Tokens, server data cache |
| **Module memory** | Access token: `let accessToken` in `services/axios.ts` | Anything else |

### Key Principle: Token Isolation

Access tokens live exclusively in a module-level variable inside `services/axios.ts`. They are:
- Never stored in `localStorage` or `sessionStorage`
- Never stored in Zustand
- Never stored in React state
- Never manually attached to requests by components

The Axios request interceptor attaches the token to every request automatically.

### Bootstrap Flow

```
Page load
    │
    ▼
AuthBootstrap (mounted inside React Router)
    │
    ├── useCurrentUser() [React Query]
    │       │
    │       ├── GET /auth/me (access token in memory? attach it)
    │       │
    │       ├── 401 → Axios interceptor fires
    │       │         ├── POST /auth/refresh (HTTP-only cookie sent by browser)
    │       │         ├── success → store new token → retry GET /auth/me
    │       │         └── failure → clearToken() → clearZustand() → reject
    │       │
    │       └── 200 → return user
    │
    └── finishBootstrap() → updates Zustand (isBootstrapping = false)
            │
            ▼
        Route Guards (ProtectedRoute / PublicRoute) read Zustand
            │
            ├── if isBootstrapping → render AppLoader
            ├── if unauthenticated → Navigate(/auth/login)
            └── if authenticated   → Render children
```

---

## Backend Architecture

### Request Flow

```
Incoming Request
       │
       ▼
  Express Router
       │
       ▼
  Validation Middleware (Zod)    ← rejects invalid input with 400
       │
       ▼
  Auth Middleware (if protected) ← verifies JWT, attaches req.user
       │
       ▼
  Controller                     ← thin HTTP adapter, no business logic
       │
       ▼
  Service                        ← all business logic lives here
       │
       ▼
  Mongoose Model
       │
       ▼
  MongoDB
       │
       ▼
  Controller                     ← formats response
       │
       ▼
  HTTP Response
```

Controllers are intentionally thin. They:
1. Read from `req.body` (already validated by middleware)
2. Call a service function
3. Send the response

They do **not** contain:
- Validation logic
- Business rules
- Direct database access

### Backend Folder Structure

```
server/src/
├── config/
│   ├── database.ts      # MongoDB connection
│   └── env.ts           # Environment variable validation and export
│
├── constants/
│   └── auth.ts          # Auth constants (token TTLs, length limits)
│
├── controllers/
│   └── auth.controller.ts
│
├── lib/                 # Third-party service clients (lazy-initialized)
│   ├── cloudinary.ts    # File upload (stub — pending implementation)
│   ├── mailer.ts        # Email (stub — pending implementation)
│   ├── openai.ts        # AI features (stub — pending implementation)
│   └── redis.ts         # Caching / rate limiting (stub — pending implementation)
│
├── middleware/
│   ├── auth.middleware.ts   # JWT verification, user attachment
│   ├── error-handler.ts     # Global error handler
│   ├── not-found.ts         # 404 handler
│   └── validate.ts          # Zod schema validation factory
│
├── models/
│   └── user.model.ts
│
├── routes/
│   ├── auth.routes.ts
│   └── index.ts
│
├── services/
│   └── auth.service.ts
│
├── types/
│   ├── api.types.ts         # Shared API response type
│   ├── auth.ts              # Auth DTOs (re-exported from validators)
│   └── express.d.ts         # Express Request augmentation
│
├── utils/
│   ├── api-response.ts      # sendSuccessResponse helper
│   ├── app-error.ts         # AppError class hierarchy
│   ├── async-handler.ts     # asyncHandler wrapper
│   ├── cookies.ts           # Refresh token cookie helpers
│   ├── hash.ts              # SHA-256 token hashing
│   └── jwt.ts               # JWT generate/verify utilities
│
├── validators/
│   ├── auth.validator.ts    # Zod schemas for auth endpoints
│   └── index.ts             # Barrel exports
│
├── app.ts                   # Express app setup
└── index.ts                 # Server bootstrap
```

---

## Authentication Architecture

See [authentication.md](./authentication.md) for the full authentication documentation.

**Summary:**
- Access tokens: 15-minute JWT, returned in JSON body, stored in module memory only
- Refresh tokens: 7-day JWT, HTTP-only cookie only, stored as SHA-256 hash in DB
- Full token rotation on every refresh
- Reuse detection: suspected replay triggers logout of all sessions
- Axios interceptor handles refresh transparently — components never see 401s

---

## Security Decisions

### Never store raw refresh tokens
Refresh tokens are hashed with SHA-256 before persisting. A database breach does not yield usable tokens.

### Never return refresh tokens in JSON
The refresh token is set exclusively as an HTTP-only cookie with `path: "/api/v1/auth"`. JavaScript cannot read it.

### Access tokens in module memory only
The access token lives in a module-level variable (`let accessToken: string | null`), not in `localStorage`, `sessionStorage`, Zustand, or React state. It is cleared on page refresh and restored via the bootstrap flow.

### Generic authentication errors
All auth failures return the same message. Attackers cannot distinguish "wrong password" from "account doesn't exist."

### Validate before controllers
Every public endpoint runs Zod validation before the controller is invoked. No controller manually validates `req.body`.

### Mongoose sensitive fields are `select: false`
`password` and `refreshTokenHash` are excluded from all queries by default. They must be explicitly opted into with `.select("+field")`.

### `toJSON` transform strips sensitive data
Even if a sensitive field is accidentally selected, the `toJSON` transform removes it before serialization.

---

## Routing

### Frontend Route Structure

```
/                           ← ProtectedRoute → DashboardLayout
  /                         ← DashboardPage
  /projects                 ← (Phase 8)
  /tasks                    ← (Phase 9)
  /settings                 ← (future)

/auth                       ← PublicRoute → AuthLayout
  /auth/login               ← LoginPage
  /auth/register            ← RegisterPage

/session-expired            ← SessionExpiredPage (no guard)
/unauthorized               ← UnauthorizedPage (no guard)

*                           ← NotFoundPage
```

Route guards:
- `ProtectedRoute` — shows `AppLoader` during bootstrap, redirects to `/auth/login` if unauthenticated, preserves the original destination in location state
- `PublicRoute` — shows `AppLoader` during bootstrap, redirects to `/` (or original destination) if already authenticated

### Backend
All routes are prefixed `/api/v1`. A root `index.ts` router mounts sub-routers:
```
/api/v1/health
/api/v1/auth/*
/api/v1/projects/*  (Phase 8)
/api/v1/tasks/*     (Phase 9)
```

---

## Adding Future Features

When adding a new feature (projects, tasks, AI, billing), follow this pattern:

### Backend
1. Define model in `models/`
2. Define Zod schemas in `validators/`
3. Implement service in `services/`
4. Implement controller in `controllers/`
5. Define routes in `routes/`

### Frontend
```
features/<name>/
├── types/<name>.types.ts     # Response shapes, DTOs
├── validators/<name>.schemas.ts  # Zod schemas
├── services/<name>.api.ts    # API functions using apiClient
├── hooks/                    # useQuery/useMutation wrappers
├── components/               # Feature-specific UI
└── pages/                    # Route-level components
```

The `apiClient` from `services/axios.ts` is used for all HTTP calls. Never import axios directly.

---

## Git Workflow

Every feature is developed in its own branch:

```
main
├── feat/application-shell
├── feat/authentication      ← current
├── feat/projects
├── feat/tasks
└── feat/ai-features
```

Small, focused commits. Each commit should leave the build in a working state.

---

## Documentation

Every major architectural decision is documented in the `docs/` folder:

- `architecture.md` — this file — overall system design
- `authentication.md` — complete auth flow and security decisions
- `api-design.md` — all API endpoints and response shapes
- `roadmap.md` — feature phases and completion status
- `folder-structure.md` — detailed folder breakdown
- `coding-guidelines.md` — code style and conventions
- `database-design.md` — MongoDB schema design decisions