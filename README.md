# AI Project Manager

A production-grade AI-powered project management SaaS application.

Built to demonstrate modern full-stack engineering practices: feature-first architecture, production security, type-safe APIs, and clean separation of concerns.

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
| TanStack Query | Server state management |
| Zustand | Client state management |
| React Hook Form | Form handling |
| Zod | Schema validation |
| Framer Motion | Animations |

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
- pnpm / npm

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

Edit `server/.env` and fill in:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai-project-manager

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-other-secret-here
```

### 4. Start the development servers

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

The backend follows a strict layered architecture:

```
Request → Validation → Auth → Controller → Service → Model → DB
```

Each layer has a single responsibility. Controllers never contain business logic. Services never handle HTTP. See [docs/architecture.md](./docs/architecture.md) for the complete breakdown.

---

## Authentication

Full production-grade authentication with:

- **Access tokens** — 15-minute JWT returned in JSON
- **Refresh tokens** — 7-day JWT, HTTP-only cookie only
- **Token rotation** — every refresh issues a new token, invalidating the old one
- **Hashed storage** — refresh tokens hashed with SHA-256 before DB storage
- **Reuse detection** — suspected replay attack triggers full session invalidation

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

See [docs/api-design.md](./docs/api-design.md) for full request/response documentation.

---

## Project Structure

```
ai-project-manager/
├── client/          # React frontend
├── server/          # Express backend
│   └── src/
│       ├── config/      # Environment and database
│       ├── constants/   # Shared constants
│       ├── controllers/ # HTTP handlers (thin layer)
│       ├── lib/         # Third-party service clients
│       ├── middleware/  # Validation, auth, error handling
│       ├── models/      # Mongoose schemas
│       ├── routes/      # Route definitions
│       ├── services/    # Business logic
│       ├── types/       # TypeScript types
│       ├── utils/       # Shared utilities
│       └── validators/  # Zod schemas
└── docs/            # Architecture and API documentation
```

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | System design and principles |
| [Authentication](./docs/authentication.md) | Auth flow and security decisions |
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
- 📋 Project Management (CRUD)
- 📋 Task Management (Kanban)
- 📋 AI Features (task generation, summaries)
- 📋 Real-time Collaboration
- 📋 Analytics Dashboard
- 📋 Deployment (Docker, CI/CD)

---

## License

MIT
