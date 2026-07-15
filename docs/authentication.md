# Authentication

## Overview

The authentication system uses a dual-token strategy:

- **Access token** — short-lived JWT (15 minutes) returned in the JSON response body
- **Refresh token** — long-lived JWT (7 days) transmitted exclusively as an HTTP-only cookie

This separation ensures that the refresh token is never accessible to JavaScript, dramatically reducing the risk of XSS-based session hijacking.

---

## Token Lifecycle

```
Register / Login
       │
       ▼
 Issue access token (15m)          → returned in JSON body
 Issue refresh token (7d)          → set as HTTP-only cookie only
 Hash refresh token (SHA-256)      → stored in MongoDB
       │
       ▼
 Client stores access token in module memory (NOT localStorage)
 Client uses access token for API requests (Authorization: Bearer <token>)
       │
       ▼ (access token expires after 15m)
 Axios response interceptor detects 401
   └── acquires refresh lock (one in-flight refresh at a time)
   └── POST /api/v1/auth/refresh (HTTP-only cookie sent automatically)
   └── verifies JWT signature and expiry
   └── compares hash against stored hash in DB
   └── rotates: new refresh token issued, old one invalidated
   └── returns new access token in JSON
   └── interceptor stores new token, retries original request
       │
       ▼
 POST /api/v1/auth/logout
   └── reads refresh token cookie
   └── sets refreshTokenHash = null in DB
   └── clears the HTTP-only cookie
   └── access token expires naturally (15m TTL)
```

---

## Security Decisions

### Refresh Token Hashing

Refresh tokens are hashed with **SHA-256** before being stored in MongoDB.

**Why SHA-256, not bcrypt?**

bcrypt is designed for low-entropy inputs (passwords). Refresh tokens are already cryptographically random high-entropy JWTs — SHA-256 is sufficient and deterministic (needed for lookups). bcrypt's slow factor would add latency to every refresh without meaningful security gain.

If the database is compromised:
- The attacker sees `sha256(refreshToken)`, not `refreshToken`
- They cannot use the hash to authenticate — the API verifies the raw token
- The attacker cannot reverse a SHA-256 hash of a sufficiently random 64-character JWT

### Refresh Token Rotation

Every time `/auth/refresh` is called, the old refresh token is **immediately invalidated** and a new one is issued.

This limits the attacker's window: if a refresh token is stolen, the legitimate user's next refresh will invalidate it. The attacker's copy will then fail.

### Reuse Detection

If a refresh token is presented that does not match the stored hash (e.g. a previously rotated token), the server:
1. Sets `refreshTokenHash = null` — logging the user out everywhere
2. Throws `UnauthorizedError`

This is a conservative response to a potential token reuse attack. The user must log in again.

### HTTP-Only Cookie Scope

The refresh token cookie is scoped to `path: "/api/v1/auth"`, meaning the browser will only send it to auth endpoints. It will never be transmitted to unrelated API routes.

### Generic Error Messages

Authentication errors never specify whether the email exists, the password was wrong, or the account is inactive. All such failures return the same `"Invalid email or password."` or `"Authentication required."` message, preventing account enumeration attacks.

---

## Frontend Authentication Architecture

### Token Storage

| Token | Storage | Rationale |
|---|---|---|
| Access Token | Module-level variable in `services/axios.ts` | Not in Zustand, not in localStorage — survives re-renders, cleared on tab close |
| Refresh Token | HTTP-only cookie (server-managed) | Inaccessible to JavaScript |
| User object | Zustand (`store/auth.store.ts`) | Synchronous access for UI components |

### Axios Token Manager

`client/src/services/axios.ts` is the single point of truth for token management:

```typescript
// In module scope — never in React state or localStorage
let accessToken: string | null = null;

export function setAccessToken(token: string): void { ... }
export function clearAccessToken(): void { ... }
```

The request interceptor attaches `Authorization: Bearer <token>` automatically. Components never construct headers manually.

### Refresh Lock

A module-level `Promise<string> | null` prevents multiple concurrent 401 responses from each triggering their own refresh call:

```
Request A → 401 → starts refresh promise
Request B → 401 → awaits same promise
Request C → 401 → awaits same promise
Refresh resolves → all three retry with new token
```

### Bootstrap Flow

Authentication initialization is centralized in a single `<AuthBootstrap>` component that wraps the application routes. On page load:

1. `AuthBootstrap` mounts and calls `useCurrentUser()` (which calls `GET /auth/me`).
2. If the access token is missing or expired, the Axios interceptor transparently calls `POST /auth/refresh`.
3. When the network request completes (success or failure), `AuthBootstrap` calls `finishBootstrap()` in Zustand.
4. Route guards (`ProtectedRoute`, `PublicRoute`) only render *after* `isBootstrapping` becomes false, reading purely from the Zustand store. They never trigger network requests.

### State Management

| Layer | Owns |
|---|---|
| AuthBootstrap | Application initialization, session restoration coordination |
| React Query | Server state: user data, loading, caching, invalidation |
| Zustand | UI state: `isBootstrapping`, `isAuthenticated`, `user: User \| null` |
| Module memory | Access token: `let accessToken: string \| null` |

Zustand is never used for tokens. React Query is never bypassed for user data fetching. Route guards never make network requests.

---

## Endpoints

### `POST /api/v1/auth/register`

Creates a new user account.

**Request body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "isEmailVerified": false,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Validation errors (400):**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": "Please enter a valid email address.",
    "password": "Password must be at least 8 characters."
  }
}
```

---

### `POST /api/v1/auth/login`

Authenticates a user, issues an access token (JSON) and refresh token (cookie).

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { ... },
    "accessToken": "eyJ..."
  }
}
```

Sets HTTP-only cookie: `refreshToken=<jwt>; HttpOnly; Path=/api/v1/auth; Max-Age=604800`

The `refreshToken` is **never** present in the JSON body.

---

### `POST /api/v1/auth/refresh`

Issues a new access token using the refresh token cookie. Rotates the refresh token.

**Cookie required:** `refreshToken`

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed.",
  "data": {
    "accessToken": "eyJ..."
  }
}
```

Sets a new `refreshToken` cookie, invalidating the old one.

---

### `POST /api/v1/auth/logout`

**Requires:** `Authorization: Bearer <accessToken>`

Invalidates the stored refresh token and clears the cookie.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### `GET /api/v1/auth/me`

**Requires:** `Authorization: Bearer <accessToken>`

Returns the currently authenticated user.

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully.",
  "data": {
    "user": { ... }
  }
}
```

---

## Sensitive Fields

The following fields are **always excluded** from API responses via the Mongoose `toJSON` transform:

- `password` (bcrypt hash)
- `refreshTokenHash` (SHA-256 of refresh token)
- `_id` (replaced by `id`)
- `__v` (Mongoose version key)

These fields are also `select: false` in the schema, meaning they must be explicitly opted into with `.select("+field")` in queries.

---

## Future Enhancements

- Email verification flow (SMTP + token)
- Forgot password / password reset
- OAuth 2.0 (Google, GitHub)
- Rate limiting on auth endpoints
- Session revocation list (Redis)
- Multi-factor authentication
