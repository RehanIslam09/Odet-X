# AI Project Manager - Architecture

## Philosophy

This project is built as a production-quality SaaS application.

The primary goals are:

- Scalability
- Maintainability
- Readability
- Separation of Concerns
- Feature-first organization

The architecture is intentionally designed to resemble modern production React applications rather than tutorial projects.

---

# Core Principles

## 1. Feature First

Business logic belongs inside features.

Example

features/
    auth/
    projects/
    tasks/
    settings/

Each feature owns its own:

- pages
- components
- hooks
- services
- types

Features should remain independent whenever possible.

---

## 2. Components Are Shared

components/

contains reusable UI.

Examples

Button

Modal

Navbar

Sidebar

Dialog

Table

No business logic belongs here.

---

## 3. App Owns Bootstrapping

The app folder is responsible for application startup.

Responsibilities include:

- Router
- Global Providers
- Query Client
- Error Boundary

The app folder should never contain business logic.

---

## 4. Business Logic Lives Inside Features

Business logic should never be placed inside components/.

Instead:

features/
    auth/
    services/

features/
    projects/
    services/

etc.

---

## 5. Global State

Global state should be minimal.

React Query is responsible for server state.

Zustand is only used for client-only global state.

Avoid duplicating server data inside Zustand.

---

## 6. Styling

Tailwind CSS v4

shadcn/ui

Minimal custom CSS.

No inline styles.

---

## 7. Routing

Routes are centralized.

Nested layouts are preferred.

Dashboard pages use DashboardLayout.

Authentication pages use AuthLayout.

---

## 8. Git Workflow

Every feature is developed in its own branch.

Example

feat/application-shell

feat/authentication

feat/projects

feat/tasks

Small commits.

Small pull requests.

---

## 9. Documentation

Every major architectural decision should be documented.

Future contributors should understand WHY decisions were made, not only WHAT was implemented.

---

## 10. Goal

The codebase should remain understandable six months from now.


---

# Current Architecture Status

Implemented

- Feature-first project organization
- Global application bootstrap
- React Query configuration
- Router configuration
- Shared layout architecture
- Data-driven navigation

Planned

- Dashboard Layout
- Authentication
- Backend API
- Real-time Collaboration
- AI Features

# Backend Request Flow

```
Incoming Request
        │
        ▼
Express Router
        │
        ▼
Controller
        │
        ▼
Service
        │
        ▼
Mongoose Model
        │
        ▼
MongoDB
        │
        ▼
Controller
        │
        ▼
HTTP Response
```

## Current Backend Structure

```
src
├── config
│   ├── database.ts
│   └── env.ts
│
├── controllers
│   └── auth.controller.ts
│
├── middleware
│   ├── error-handler.ts
│   └── not-found.ts
│
├── models
│   └── user.model.ts
│
├── routes
│   ├── auth.routes.ts
│   └── index.ts
│
├── services
│   └── auth.service.ts
│
├── constants
│   └── auth.ts
│
├── utils
│   ├── api-response.ts
│   ├── async-handler.ts
│   └── app-error.ts
│
└── types
```