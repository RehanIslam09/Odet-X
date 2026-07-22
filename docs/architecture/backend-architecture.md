---
title: "Backend Architecture & Express Framework Reference"
description: "Authoritative specification for Express 5 backend architecture, thin controllers, domain services, and global error handling."
status: "active"
owner: "Backend Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 4"
related_documents:
  - "docs/architecture.md"
  - "docs/architecture/system-overview.md"
  - "docs/architecture/database-design.md"
  - "docs/api/rest-api-reference.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [Architecture](README.md) > Backend Architecture

# Backend Architecture & Express Framework Reference

This document defines the Express / Node.js backend API architecture for **AI Project Manager**.

---

## 📋 Table of Contents
1. [Application Layered Architecture](#1-application-layered-architecture)
2. [Controller & Service Layer Responsibilities](#2-controller--service-layer-responsibilities)
3. [Global Error Handling Strategy](#3-global-error-handling-strategy)
4. [Backend Directory Structure](#4-backend-directory-structure)

---

## 1. Application Layered Architecture

The server adheres to a strict 5-layer separation of concerns:

```
Incoming HTTP Request
        │
        ▼
1. Validation Middleware (Zod DTO Schema check ➔ 400 Bad Request on error)
        │
        ▼
2. Authentication Middleware (JWT Access Token verification ➔ 401 Unauthorized on error)
        │
        ▼
3. Controller Layer (Thin adapter: extracts params/body, invokes service, formats response)
        │
        ▼
4. Service Layer (Core domain rules, ownership verification, transactions, activity logging)
        │
        ▼
5. Mongoose Models & MongoDB Database
```

---

## 2. Controller & Service Layer Responsibilities

### Thin Controller Rule
Controllers MUST remain thin adapters. They perform exactly three operations:
1. Extract pre-validated input from `req.body`, `req.params`, or `req.query` (validated by Zod middleware).
2. Invoke a single domain service function, passing `req.user.id` for ownership scoping.
3. Send the HTTP response envelope via `sendSuccessResponse(res, statusCode, message, data)`.

Controllers MUST NOT contain:
- Zod validation logic
- Database queries or ORM calls
- Direct business logic assertions
- HTTP status code calculations for domain errors

---

## 3. Global Error Handling Strategy

Errors inherit from a central `AppError` class hierarchy (`server/src/utils/app-error.ts`):

- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `InternalServerError` (500)

All async controller functions are wrapped with `asyncHandler`, which automatically catches unhandled Promise rejections and forwards them to `errorHandler`.

### Error Response Envelope
```json
{
  "success": false,
  "message": "Human-readable error description."
}
```

Validation failures include a flat `errors` map of field paths to error messages:
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": "Please enter a valid email address."
  }
}
```

---

## 4. Backend Directory Structure

```
server/src/
├── config/
│   ├── database.ts      # MongoDB Mongoose connection
│   └── env.ts           # Zod environment variable validation
├── constants/           # Shared domain & auth constants
├── controllers/         # Thin HTTP handler adapters
├── jobs/                # Background cron worker jobs (notification.jobs.ts)
├── lib/                 # Third-party service clients
├── middleware/          # Auth, Zod validation, error handler
├── models/              # Mongoose schemas (User, Project, Task, Activity, Notification)
├── routes/              # Express API route modules
├── services/            # Core business logic & database access
├── tests/               # Integration test suite runner files
├── types/               # TypeScript type definitions
├── utils/               # AppError class, async wrappers, cookie helpers
├── validators/          # Zod input validation schemas
├── app.ts               # Express application module setup
├── index.ts             # Production HTTP server entry point
├── worker.ts            # Independent background worker entry point
└── smoke.ts             # Application startup verification script
```
