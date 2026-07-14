# API Design

## Base URL

```
/api/v1
```

All endpoints are prefixed with `/api/v1` for versioning. When a breaking change is required, a `/api/v2` prefix will be introduced while the v1 routes remain active during the migration window.

---

## Response Shape

All responses follow a consistent envelope:

### Success
```json
{
  "success": true,
  "message": "Human-readable description.",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Human-readable error description."
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "fieldName": "First error message for this field."
  }
}
```

The `errors` object is a flat map of field paths to their first validation failure. This format is compatible with any frontend form library (React Hook Form, Formik, etc.).

---

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Access tokens expire after **15 minutes**. Use `POST /auth/refresh` to obtain a new one using the HTTP-only refresh token cookie.

---

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Server health check |

---

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Create a new account |
| POST | `/auth/login` | None | Authenticate and receive tokens |
| POST | `/auth/refresh` | Cookie | Rotate refresh token, get new access token |
| POST | `/auth/logout` | Bearer | Invalidate session |
| GET | `/auth/me` | Bearer | Get current authenticated user |

---

### `GET /health`

```json
// 200 OK
{
  "success": true,
  "message": "Server is running."
}
```

---

### `POST /auth/register`

**Body:**
```json
{
  "name": "string (2–50 chars)",
  "email": "string (valid email)",
  "password": "string (8–128 chars)"
}
```

**Responses:**

| Status | Condition |
|--------|-----------|
| 201 | Account created |
| 400 | Validation failed |
| 409 | Email already registered |

---

### `POST /auth/login`

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Responses:**

| Status | Condition |
|--------|-----------|
| 200 | Login successful — sets `refreshToken` HTTP-only cookie |
| 400 | Validation failed |
| 401 | Invalid credentials |

**Note:** The refresh token is transmitted as an HTTP-only cookie only, never in the JSON body.

---

### `POST /auth/refresh`

No body required. Reads the `refreshToken` cookie automatically.

**Responses:**

| Status | Condition |
|--------|-----------|
| 200 | New access token issued, refresh token rotated |
| 401 | Cookie missing, expired, or invalid |

---

### `POST /auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Responses:**

| Status | Condition |
|--------|-----------|
| 200 | Session invalidated, cookie cleared |
| 401 | Missing or invalid access token |

---

### `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Responses:**

| Status | Condition |
|--------|-----------|
| 200 | Returns current user object |
| 401 | Missing, expired, or invalid token |

---

## Error Codes Reference

| Status | Name | When |
|--------|------|------|
| 400 | Bad Request | Validation failure, malformed input |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but lacks permission |
| 404 | Not Found | Resource or route not found |
| 409 | Conflict | Duplicate resource (e.g. email) |
| 500 | Internal Server Error | Unexpected server error |

---

## Future Endpoints

As phases are implemented, this document will be updated with:

- `POST /projects` — Create project
- `GET /projects` — List projects
- `GET /projects/:id` — Get project
- `PATCH /projects/:id` — Update project
- `DELETE /projects/:id` — Delete project
- `POST /projects/:id/tasks` — Create task
- `GET /projects/:id/tasks` — List tasks
- `PATCH /tasks/:id` — Update task
- `DELETE /tasks/:id` — Delete task
- `POST /ai/generate-tasks` — AI task generation
