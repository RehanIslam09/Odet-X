---
title: "REST API Reference Specification"
description: "Authoritative specification for all REST API endpoints, DTO payload contracts, and status code matrices."
status: "active"
owner: "API Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 4"
related_documents:
  - "docs/architecture/backend-architecture.md"
  - "docs/security/authentication.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [API](README.md) > REST API Reference

# REST API Reference Specification

## Base URL

```
/api/v1
```

All endpoints are prefixed with `/api/v1` for API versioning.

---

## 📋 Table of Contents
1. [Global Response Envelopes](#global-response-envelopes)
2. [Error Codes Reference](#error-codes-reference)
3. [Authentication Endpoints](#authentication-endpoints)
4. [User & Settings Endpoints](#user--settings-endpoints)
5. [Project Endpoints](#project-endpoints)
6. [Task Endpoints](#task-endpoints)
7. [Dashboard Analytics Endpoints](#dashboard-analytics-endpoints)
8. [Activity & Audit Endpoints](#activity--audit-endpoints)
9. [Notification Endpoints](#notification-endpoints)
10. [AI Capability Endpoints](#ai-capability-endpoints)

---

## Global Response Envelopes

### Success Envelope
```json
{
  "success": true,
  "message": "Human-readable description.",
  "data": { ... }
}
```

### Validation Error Envelope (400)
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

## Error Codes Reference

| Status Code | Name | Condition |
|---|---|---|
| **400** | Bad Request | Validation failure or malformed DTO input |
| **401** | Unauthorized | Missing, expired, or invalid access/refresh token |
| **403** | Forbidden | Authenticated user lacks permission for entity |
| **404** | Not Found | Resource or endpoint path does not exist |
| **409** | Conflict | Duplicate unique entity (email) or OCC version mismatch (`__v`) |
| **500** | Internal Server Error | Unexpected server error |

---

## Authentication Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create a new user account |
| `POST` | `/auth/login` | None | Authenticate credentials & receive tokens |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh token & get new access token |
| `POST` | `/auth/logout` | Bearer | Invalidate refresh token & clear cookie |
| `GET` | `/auth/me` | Bearer | Get current authenticated user profile |

---

## User & Settings Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `PATCH` | `/users/me/profile` | Bearer | Update display name and bio |
| `PATCH` | `/users/me/preferences` | Bearer | Update theme, locale, density, notification toggles |
| `PATCH` | `/users/me/password` | Bearer | Update account password |

---

## Project Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/projects` | Bearer | List paginated projects (with search/filter) |
| `POST` | `/projects` | Bearer | Create a new project |
| `GET` | `/projects/options` | Bearer | Get simplified project dropdown options |
| `GET` | `/projects/:id` | Bearer | Get full project details & overview stats |
| `PATCH` | `/projects/:id` | Bearer | Update project details |
| `POST` | `/projects/:id/archive` | Bearer | Toggle project archive state (`archived: true/false`) |
| `DELETE`| `/projects/:id` | Bearer | Soft delete project (`isDeleted: true`) |
| `GET` | `/projects/:id/summary` | Bearer | Get project task metrics summary |

---

## Task Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/tasks` | Bearer | List paginated tasks (filterable by project/status/priority) |
| `POST` | `/tasks` | Bearer | Create a new task |
| `GET` | `/tasks/:id` | Bearer | Get full task details |
| `PATCH` | `/tasks/:id` | Bearer | Update task status, priority, due date, estimate |
| `PATCH` | `/tasks/:id/notes` | Bearer | Update Markdown notes (Requires `expectedVersion` OCC check) |
| `POST` | `/tasks/:id/archive` | Bearer | Toggle task archive state |
| `DELETE`| `/tasks/:id` | Bearer | Soft delete task (`isDeleted: true`) |

---

## Dashboard Analytics Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard/overview` | Bearer | Get aggregated overview metrics, active projects & attention tasks |

---

## Activity & Audit Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/activities` | Bearer | List cursor-paginated activity events |

---

## Notification Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | Bearer | List notifications (All, Unread, Read) |
| `GET` | `/notifications/unread-count` | Bearer | Get total count of unread notifications |
| `PATCH` | `/notifications/:id/read` | Bearer | Mark specific notification as read |
| `PATCH` | `/notifications/read-all` | Bearer | Mark all notifications as read |

---

## AI Capability Endpoints

For full request/response DTO details of AI endpoints, see [`docs/api/ai-endpoints.md`](ai-endpoints.md).

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/projects/:id/generate-tasks` | Bearer | Generate structured task breakdown from project description |
| `POST` | `/tasks/:id/generate-labels` | Bearer | Generate context-aware labels for a task |
| `POST` | `/projects/:id/generate-summary` | Bearer | Generate intelligent status summary & risks for a project |
