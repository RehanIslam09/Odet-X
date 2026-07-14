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
├── components/      # Shared, reusable UI components (no business logic)
├── features/        # Feature modules (auth, projects, tasks, settings)
│   └── auth/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── hooks/           # Shared custom hooks
├── lib/             # Third-party library configuration
├── providers/       # Global React context providers
├── routes/          # Route definitions and guards
├── services/        # Shared API client
├── store/           # Zustand global state (client-only state)
├── styles/          # Global styles
├── types/           # Shared TypeScript types
└── utils/           # Shared utility functions
```

### State Management Principle

- **React Query** owns all server state (caching, invalidation, loading states)
- **Zustand** is used only for client-only state that is not derived from server data
- Avoid duplicating server data in Zustand

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
- Access tokens: 15-minute JWT, returned in JSON body
- Refresh tokens: 7-day JWT, HTTP-only cookie only, stored as SHA-256 hash in DB
- Full token rotation on every refresh
- Reuse detection: suspected replay triggers logout of all sessions

---

## Security Decisions

### Never store raw refresh tokens
Refresh tokens are hashed with SHA-256 before persisting. A database breach does not yield usable tokens.

### Never return refresh tokens in JSON
The refresh token is set exclusively as an HTTP-only cookie with `path: "/api/v1/auth"`. JavaScript cannot read it.

### Generic authentication errors
All auth failures return the same message. Attackers cannot distinguish "wrong password" from "account doesn't exist."

### Validate before controllers
Every public endpoint runs Zod validation before the controller is invoked. No controller manually validates `req.body`.

### Mongoose sensitive fields are `select: false`
`password` and `refreshTokenHash` are excluded from all queries by default. They must be explicitly opted into with `.select("+field")`.

### `toJSON` transform strips sensitive data
Even if a sensitive field is accidentally selected, the `toJSON` transform removes it before serialization.

---

## Git Workflow

Every feature is developed in its own branch:

```
main
├── feat/application-shell
├── feat/authentication
├── feat/projects
├── feat/tasks
└── feat/ai-features
```

Small, focused commits. Each commit should leave the build in a working state.

---

## Routing

### Frontend
Routes are centralized and use nested layouts:
- `DashboardLayout` wraps all authenticated pages
- `AuthLayout` wraps all unauthenticated pages
- Route guards redirect unauthenticated users to login

### Backend
All routes are prefixed `/api/v1`. A root `index.ts` router mounts sub-routers:
```
/api/v1/health
/api/v1/auth/*
/api/v1/projects/*  (planned)
/api/v1/tasks/*     (planned)
```

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