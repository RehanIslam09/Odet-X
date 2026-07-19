# AI Project Manager

A production-grade AI-powered project management SaaS application.

Built to demonstrate modern full-stack engineering practices: feature-first architecture, production security, type-safe APIs, clean separation of concerns, and scalable state management.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + React Compiler | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS v4 | Styling |
| shadcn/ui | Component library |
| React Router v7 | Routing |
| TanStack Query v5 | Server state management |
| Zustand | Client state management |
| React Hook Form | Form handling |
| Zod | Schema validation |
| Framer Motion | Animations |
| Axios | HTTP client |
| Sonner | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | API server |
| TypeScript | Type safety |
| MongoDB + Mongoose | Database |
| JWT | Authentication tokens |
| bcrypt | Password hashing |
| Zod | Request validation |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ai-project-manager.git
cd ai-project-manager
```

### 2. Install dependencies

```bash
# Root
npm install

# Server
cd server && npm install

# Client
cd client && npm install
```

### 3. Configure the server environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai-project-manager

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-other-secret-here
```

### 4. Configure the client environment

```bash
cp client/.env.example client/.env
```

`client/.env` defaults are correct for local development:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 5. Start the development servers

```bash
# Server (from /server)
npm run dev

# Client (from /client)
npm run dev
```

Server runs on `http://localhost:5000`  
Client runs on `http://localhost:5173`

---

## Architecture

### Backend

The backend follows a strict layered architecture:

```
Request → Validation → Auth → Controller → Service → Model → DB
```

Each layer has a single responsibility. Controllers never contain business logic. Services never handle HTTP. See [docs/architecture.md](./docs/architecture.md).

### Frontend

The frontend uses a **feature-first** architecture and a three-layer state model:

| Layer | Technology | Owns |
|---|---|---|
| Initialization | AuthBootstrap | Coordinates exactly one session restoration on startup |
| Server state | TanStack Query | Caching, loading, invalidation |
| Client state | Zustand | `isBootstrapping`, `isAuthenticated`, `user: User \| null` |
| Token state | Module memory | Access token (`let accessToken`) |

Tokens are **never** stored in `localStorage`, `sessionStorage`, or Zustand.

---

## Authentication

Full production-grade dual-token authentication:

- **Access tokens** — 15-minute JWT returned in JSON, stored in module memory
- **Refresh tokens** — 7-day JWT, HTTP-only cookie only, stored as SHA-256 hash in DB
- **Token rotation** — every refresh issues a new token, invalidating the old one
- **Reuse detection** — suspected replay attack triggers full session invalidation
- **Transparent refresh** — Axios interceptor refreshes expired tokens automatically

See [docs/authentication.md](./docs/authentication.md) for the complete security documentation.

---

## API

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/auth/register` | None | Create account |
| POST | `/auth/login` | None | Login |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | Bearer | Logout |
| GET | `/auth/me` | Bearer | Get current user |
| PATCH | `/users/me/profile` | Bearer | Update user profile |
| PATCH | `/users/me/preferences` | Bearer | Update user preferences |
| PATCH | `/users/me/password` | Bearer | Update user password |
| GET | `/projects` | Bearer | List user projects |
| POST | `/projects` | Bearer | Create a project |
| GET | `/projects/options` | Bearer | Get project options for dropdowns |
| GET | `/projects/:id` | Bearer | Get project details |
| PATCH | `/projects/:id` | Bearer | Update a project |
| POST | `/projects/:id/archive` | Bearer | Archive/unarchive a project |
| DELETE| `/projects/:id` | Bearer | Soft delete a project |
| GET | `/projects/:id/summary` | Bearer | Get project summary metrics |
| GET | `/tasks` | Bearer | List tasks |
| POST | `/tasks` | Bearer | Create a task |
| GET | `/tasks/:id` | Bearer | Get task details |
| PATCH | `/tasks/:id` | Bearer | Update a task |
| POST | `/tasks/:id/archive` | Bearer | Archive/unarchive a task |
| DELETE| `/tasks/:id` | Bearer | Soft delete a task |
| GET | `/activities` | Bearer | List activity history |
| GET | `/notifications` | Bearer | List notifications |
| GET | `/notifications/unread-count` | Bearer | Get unread notification count |
| PATCH | `/notifications/:id/read` | Bearer | Mark notification as read |
| PATCH | `/notifications/read-all` | Bearer | Mark all notifications as read |

See [docs/api-design.md](./docs/api-design.md) for full request/response documentation.

---

## Project Structure

```
ai-project-manager/
├── client/          # React frontend
│   └── src/
│       ├── app/           # Bootstrap (router, providers, QueryClient)
│       ├── components/    # Shared UI (layout shells, shadcn primitives)
│       ├── features/      # Feature modules (auth, projects, tasks, ...)
│       │   └── auth/
│       │       ├── components/   # LoginForm, RegisterForm
│       │       ├── hooks/        # useCurrentUser, useLogin, useRegister, useLogout
│       │       ├── pages/        # LoginPage, RegisterPage, SessionExpiredPage
│       │       ├── services/     # auth.api.ts
│       │       ├── types/        # auth.types.ts
│       │       └── validators/   # auth.schemas.ts
│       ├── routes/        # ProtectedRoute, PublicRoute
│       ├── services/      # axios.ts (centralized HTTP client + token manager)
│       ├── store/         # auth.store.ts (Zustand)
│       └── utils/         # api-error.ts, form-errors.ts
│
├── server/          # Express backend
│   └── src/
│       ├── config/        # Environment and database
│       ├── constants/     # Shared constants
│       ├── controllers/   # HTTP handlers (thin layer)
│       ├── lib/           # Third-party service clients
│       ├── middleware/    # Validation, auth, error handling
│       ├── models/        # Mongoose schemas
│       ├── routes/        # Route definitions
│       ├── services/      # Business logic
│       ├── types/         # TypeScript types
│       ├── utils/         # Shared utilities
│       └── validators/    # Zod schemas
│
└── docs/            # Architecture and API documentation
```

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | System design, state management, bootstrap flow |
| [Authentication](./docs/authentication.md) | Auth flow, token lifecycle, security decisions |
| [API Design](./docs/api-design.md) | All endpoints and response shapes |
| [Roadmap](./docs/roadmap.md) | Feature phases and completion status |

---

## Roadmap

- ✅ Project Bootstrap
- ✅ Application Shell
- ✅ Backend Foundation
- ✅ User Registration
- ✅ Core Authentication
- ✅ Production Authentication (refresh tokens, rotation, validation)
- ✅ Frontend Authentication (Axios, Zustand, React Query, route guards, forms, UI)
- ✅ User Settings (Profile, Preferences, Password)
- ✅ Project Management (CRUD, Soft Delete, Archive, Search, Pagination, Project Workspace)
- ✅ Task Management (CRUD, Kanban lifecycle, Prioritization, Soft Delete, Task Workspace)
- ✅ Dashboard Analytics (Active metrics, Recent Projects progress, Attention Tasks)
- ✅ Activity & Audit Foundation (Backend + Frontend UX)
- ✅ Notification Backend Foundation
- 📋 Notification Frontend Center
- 📋 Real-time Collaboration (comments, live updates)
- 📋 Deployment (Docker, CI/CD)

---

## License

MIT
