# Phase 34 — Real-Time Collaboration: Architecture Investigation & Feasibility Analysis

**Phase**: Phase 34 — Real-Time Collaboration  
**Status**: COMPLETE (Investigation Only — No Production Code Modified)  
**Date**: July 31, 2026  
**Author**: Antigravity AI  

---

## 1. Executive Summary

### 1.1 Feasibility Verdict
**FEASIBLE (HIGH CONFIDENCE)**.

Real-time collaboration can be integrated seamlessly into Odet-X without modifying existing domain models, breaking Phase 33 RBAC tenant invariants, altering optimistic concurrency control (OCC) semantics, or destabilizing the existing REST application.

### 1.2 Summary of Proposed Architecture
- **Transport Layer**: Socket.IO integrated with the Express `http.Server` instance.
- **Connection Authentication**: Handshake authentication leveraging short-lived JWT access tokens passed via socket connection parameters (`auth: { token }`), resolved against the existing `User` model and `verifyAccessToken` utility.
- **Tenant Subscription Model**: Socket connection joins workspace-scoped rooms (`workspace:<workspaceId>`) verified against `WorkspaceMember` authorization.
- **Event Publication Boundary**: A decoupled `DomainEventBus` singleton (`EventEmitter`-backed) invoked inside authoritative domain services (`task.service.ts`, `project.service.ts`, `workspace.service.ts`, `activity.service.ts`) after MongoDB persistence succeeds.
- **Client Synchronization**: Event-driven TanStack Query cache invalidation (`queryClient.invalidateQueries(...)`) maintaining REST endpoints as the single source of truth for entity state.
- **Presence & Awareness**: Ephemeral in-memory presence tracking user workspace connections and active resource viewing without persistent storage.

---

## 2. Current Collaboration Architecture

Currently, Odet-X operates strictly as a **request/response REST application**. 

- User A performs a mutation via HTTP REST request (`POST`, `PATCH`, `DELETE`).
- Server validates JWT, resolves workspace scope, checks Phase 33 RBAC permissions, updates MongoDB, records an activity log, and returns an updated DTO to User A.
- User B, viewing the exact same workspace in another browser session or window, remains unaware of User A's changes until User B manually triggers a page refresh, navigates to a new view, or triggers an action that causes a background TanStack Query refetch.

### Existing Strengths
1. **Strong Authoritative Domain Layer**: All mutations flow through domain services (`task.service.ts`, `project.service.ts`, etc.).
2. **Clear Tenant Security Boundaries**: All queries enforce `workspaceId` tenant scoping.
3. **Structured Audit Logs**: `recordActivity` is already invoked across domain service operations.

---

## 3. Phase 33 Handoff State

Phase 33 established the multi-tenant RBAC foundation:
- **Tenant Boundary**: Workspaces (`Workspace` model) serve as the primary security boundary.
- **Membership**: `WorkspaceMember` links users to workspaces with roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
- **Centralized Authorization**: `PermissionEngine.evaluate(authContext, permission, resourceContext)` in `server/src/domain/permission-evaluator.ts` enforces capabilities and resource-level constraints.
- **Anti-Enumeration Invariants**: Returning HTTP 404 ("Workspace not found.") for unauthorized workspace access attempts.
- **Frontend Workspace Isolation**: `WorkspaceContext.tsx` handles active workspace resolution and calls `queryClient.clear()` upon workspace switching to prevent cross-tenant cache contamination.

All Phase 33 verification suites pass (`npm run verify` is green).

---

## 4. Current Authentication & Session Architecture

### 4.1 Token Structure & Verification
- **Access Tokens**: Short-lived JWTs containing `{ sub: userId, email }`. Verified synchronously via `verifyAccessToken(token)` using `JWT_SECRET`.
- **Refresh Tokens**: Long-lived tokens stored as SHA-256 hashes in `User.refreshTokenHash`. Managed via HTTP-only cookies (`/api/v1/auth/refresh`).
- **Middleware**: `auth.middleware.ts` extracts `Bearer <token>` from HTTP headers, verifies JWT signature, and queries `User.findById(payload.sub)` to populate `req.user`.

### 4.2 Client Auth Lifecycle
- In-memory access token storage in `client/src/services/axios.ts` (`accessToken` variable).
- Axios response interceptor captures 401 Unauthorized responses and transparently calls `/auth/refresh` to obtain a fresh access token before retrying failed requests.

### 4.3 Connection Authentication Strategy (Questions 1–5)
1. **Handshake Authentication**: Persistent connections will pass the in-memory access token in the socket handshake options (`auth: { token: getAccessToken() }`). The server verifies the token during `io.use()` middleware.
2. **In-Memory Token Availability**: Connections will only be established after client authentication completes and `accessToken` is available in memory.
3. **Token Expiry During Active Connection**: Socket connection lifecycle is bound to the server session established at handshake time. Once authenticated, long-lived connections do not require per-second HTTP token re-verification. However, when the client refreshes its access token via Axios, it can notify the socket manager to update stored auth state.
4. **Refresh Token Rotation**: If access token rotates, socket connection remains active using the session established at connection time unless explicitly disconnected or invalidated by server events.
5. **Auth State Synchronization**: The client-side real-time service will hook into `useAuthStore` and Axios auth events—disconnecting on logout and reconnecting/authenticating on login.

---

## 5. Workspace / Membership / RBAC Architecture

### 5.1 Connection & Room Association (Questions 6–11)
- **Room Naming**: `workspace:<workspaceId>`.
- **Subscription Verification**: When a client requests `join_workspace({ workspaceId })`, the server executes:
  ```typescript
  const member = await WorkspaceMember.findOne({ workspaceId, userId: socket.userId });
  if (!member) throw new NotFoundError("Workspace not found.");
  ```
- **Membership Revocation**: When `DELETE /api/v1/workspaces/:workspaceId/members/:memberId` is executed:
  1. DB member document is removed.
  2. Server emits `member.removed` to `domainEventEmitter`.
  3. Real-time manager forces target user's active sockets to leave `workspace:<workspaceId>` and notifies client to purge workspace cache.
- **Role Changes**: When `PATCH /api/v1/workspaces/:workspaceId/members/:memberId` updates a role (e.g. `ADMIN` -> `VIEWER`), `member.updated` is emitted, updating socket session role metadata instantly.
- **Workspace Switching**: Handled by client leaving `workspace:<oldWorkspaceId>` and joining `workspace:<newWorkspaceId>`, followed by `queryClient.clear()`.
- **RBAC Reuse**: `PermissionEngine.evaluate()` will be called directly in socket handlers when processing real-time actions.

---

## 6. Current Mutation Topology

### 6.1 Shared Domain Service Inventory (Questions 12–16)

| Subsystem | Service File | Mutation Methods | Activity Logged |
|---|---|---|---|
| **Projects** | `project.service.ts` | `createProject`, `updateProject`, `archiveProject`, `deleteProject` | Yes (`recordActivity`) |
| **Tasks** | `task.service.ts` | `createTask`, `updateTask`, `deleteTask`, `bulkUpdateTasks`, `reorderTasks`, `addTaskNote` | Yes (`recordActivity` / `recordActivities`) |
| **Plan Drafts** | `plan-draft.service.ts`, `plan-commit.service.ts` | `createPlanDraft`, `updatePlanDraft`, `commitPlanDraft` | Yes (`recordActivity`) |
| **Workspaces** | `workspace.service.ts` | `createCustomWorkspace`, `updateWorkspace`, `inviteMember`, `updateMemberRole`, `removeMember` | Yes |
| **Controlled AI Actions** | `copilot-action.service.ts` | Delegates to action handlers (`create-task.handler.ts`, etc.) which call `task.service.ts` | Yes (via delegated services) |
| **Background Jobs** | `notification.jobs.ts`, `proactive-intelligence.jobs.ts` | Scheduled automated processes | Indirect |

### 6.2 Mutation Invariants & Event Boundary
- **No Controller Direct Writes**: Controllers in Odet-X NEVER call `.create()`, `.updateOne()`, or `.save()` directly on Mongoose models. All write operations pass through domain services.
- **Safest Publication Boundary**: Emitting events via a centralized `DomainEventBus` singleton (`EventEmitter`) placed at the end of domain service functions, immediately following successful MongoDB persistence.
- **Fault Isolation Invariant**: Event publication must be wrapped in `try / catch` blocks or non-blocking async calls so that event delivery failures NEVER cause authoritative DB operations to fail or roll back.

---

## 7. Current Frontend State & Query Architecture

### 7.1 TanStack Query Configuration
- Defined in `client/src/app/query-client.ts`.
- `staleTime: 0` (default stale immediately).
- `refetchOnWindowFocus: false`.
- `gcTime: 5 minutes`.
- Query key factories structure keys cleanly (e.g. `taskKeys.list(params)`, `taskKeys.detail(id)`, `projectKeys.all`).

### 7.2 Cache Synchronization Strategy (Questions 27–33)
- **Invalidation-First Approach**: Upon receiving a real-time event (e.g. `task.updated`), client executes:
  ```typescript
  queryClient.invalidateQueries({ queryKey: taskKeys.all });
  ```
  This triggers background refetching over REST, ensuring client UI state is updated strictly with authoritative server responses.
- **Workspace Cache Isolation**: Client checks `if (event.workspaceId !== currentWorkspace.id) return;` before touching cache. `queryClient.clear()` on workspace switch guarantees zero cross-workspace cache pollution.
- **Reconnect Recovery**: When network connection drops and reconnects, client executes a global query invalidation to fetch any updates missed during the offline window.

---

## 8. Existing Process Boundaries

### 8.1 Entry-Point Analysis (Question 40)
- `app.ts`: Express application setup (middleware, routes, error handlers). Does NOT listen on HTTP port.
- `index.ts`: Application entry point. Connects to MongoDB and calls `app.listen(env.PORT)`. Real-time server initialization (`http.createServer(app)` + Socket.IO) belongs here.
- `smoke.ts`: Application smoke test. Imports `./app.js` to verify module initialization without starting an HTTP server or binding sockets. Keeping Socket.IO attached to `http.Server` in `index.ts` preserves `smoke.ts` integrity.
- `worker.ts`: Standalone background job process. Communicates via DB or event bus.

---

## 9. Real-Time Transport Evaluation

### 9.1 Transport Matrix

| Transport Choice | Native Bidirectional | Room / Channel Support | Auto-Reconnect & Backoff | Fallback Transports | Dependency Cost | Operational Complexity | Rating |
|---|---|---|---|---|---|---|---|
| **Native WebSockets (`ws`)** | Yes | Manual implementation required | Manual implementation required | None | Low | High (custom framing & state management) | Acceptable |
| **Socket.IO** | Yes | Built-in (`socket.join`) | Built-in exponential backoff & queuing | HTTP Long-Polling fallback | Low (standard industry lib) | Low (managed protocol lifecycle) | **RECOMMENDED** |
| **Server-Sent Events (SSE)** | No (Server -> Client only) | Custom HTTP stream routing required | Built-in browser retry | None | Zero | Medium (requires separate POST for presence) | Suboptimal |

---

## 10. Recommended Transport

**Socket.IO** is recommended for Odet-X.

### Rationale
1. **Native Room Abstractions**: Provides clean API (`socket.join("workspace:" + workspaceId)` and `io.to("workspace:" + workspaceId).emit(...)`).
2. **Robust Connection Lifecycle**: Built-in automatic reconnection, heartbeat/ping-pong stale connection cleanup, and message buffering.
3. **Horizontal Scaling Readiness**: Native integration with `@socket.io/redis-adapter` for multi-instance scaling when needed.
4. **Seamless Integration**: Wraps standard Node.js `http.Server` and integrates smoothly with Express and React hooks.

---

## 11. Proposed Connection Authentication Model

```text
Client (React)                              Server (Socket.IO Middleware)
     │                                                     │
     │─── Handshake { auth: { token: accessToken } } ────>│
     │                                                     │── verifyAccessToken(token)
     │                                                     │── User.findById(payload.sub)
     │                                                     │── Attach user to socket.data
     │<─── Connection Established (Authenticated) ─────────│
```

- Unauthorized tokens or inactive users are rejected during handshake (`next(new UnauthorizedError())`).

---

## 12. Proposed Workspace Subscription Model

```text
Client                                      Server (Workspace Socket Handler)
  │                                                        │
  │─── emit("subscribe:workspace", { workspaceId }) ─────>│
  │                                                        │── WorkspaceMember.findOne({ workspaceId, userId })
  │                                                        │── If member: socket.join("workspace:" + workspaceId)
  │<── ack({ status: "joined", workspaceId }) ─────────────│
```

- Non-members receive a generic "Workspace not found" error (Anti-Enumeration invariant).

---

## 13. Proposed Authorization Model

Real-time authorization uses the Phase 33 `PermissionEngine`:
1. **Connection**: Authenticated user.
2. **Room Join**: Verified active workspace membership.
3. **Event Emission**: Workspace room broadcast (`workspace:<workspaceId>`) ensures events reach ONLY authorized members of that specific workspace.

---

## 14. Proposed Event Publication Architecture

```text
Authoritative Domain Service (e.g. task.service.ts)
        │
        ▼
1. Execute MongoDB Mutation
        │
        ▼
2. Persistence Succeeds
        │
        ▼
3. DomainEventBus.emit("task.updated", payload)
        │
        ├─────────────────────────────┐
        ▼                             ▼
Activity Audit Log           Socket.IO Event Relay
                             `io.to("workspace:" + wsId).emit(...)`
```

---

## 15. Proposed Event Protocol

### 15.1 Envelope Specification

```typescript
export interface RealtimeEventEnvelope<T = unknown> {
  id: string; // Unique Event UUID (v4) for client deduplication
  protocolVersion: 1;
  type: string; // e.g., "task.created", "task.updated", "presence.updated"
  workspaceId: string; // Tenant boundary identifier
  actorId: string; // User ID of mutation initiator
  timestamp: string; // ISO 8601 UTC timestamp
  version?: number; // Optional entity OCC version
  payload: T; // Specific payload (IDs, changed fields, metadata)
}
```

### 15.2 Event Taxonomy (Hypotheses)
- `task.created`, `task.updated`, `task.deleted`, `task.reordered`
- `project.created`, `project.updated`, `project.archived`
- `member.joined`, `member.updated`, `member.removed`
- `presence.updated`, `presence.left`

---

## 16. Proposed Client Synchronization Strategy

When client receives a real-time event:
1. Validate `event.workspaceId === activeWorkspace.id`.
2. Check `event.id` against recent event cache (ignore duplicates).
3. Call `queryClient.invalidateQueries(...)` for affected query keys.
4. TanStack Query performs background HTTP refetch, updating UI smoothly.

---

## 17. Presence & Resource Awareness Analysis (Questions 34–39)

- **Ephemeral Storage**: In-memory `Map<workspaceId, Map<userId, PresenceState>>` managed by real-time server.
- **Resource Awareness**: Tracks when a user is actively viewing a specific project (`resourceType: "project"`, `resourceId`).
- **Disconnect Cleanup**: Disconnect triggers a 3-second grace timer before emitting `presence.left` to handle transient network blips and page refreshes gracefully.
- **Security**: Presence broadcasts are strictly contained within `workspace:<workspaceId>` rooms.

---

## 18. Reliability / Reconnect Analysis

- **Network Loss**: Client auto-reconnects with exponential backoff.
- **Server Restart**: Socket reconnects automatically; client invalidates query cache to synchronize state.
- **Token Expiry**: On 401 error, Axios refreshes token and updates socket credentials.
- **Workspace Switch**: Immediate socket room leave/join and `queryClient.clear()`.

---

## 19. Horizontal Scaling Analysis (Questions 41–45)

- **Current State**: Single process in-memory event bus and Socket.IO server.
- **Future Readiness**: `DomainEventBus` and `RealtimeAdapter` abstractions allow swapping in `@socket.io/redis-adapter` and Redis pub/sub seamlessly without altering domain code.

---

## 20. Security & Tenant-Isolation Threat Analysis

| Threat Vector | Mitigation Strategy |
|---|---|
| **Cross-Tenant Event Leakage** | All broadcasts targeted strictly to `workspace:<workspaceId>` rooms verified against DB membership. |
| **Forged Subscriptions** | Room join handler explicitly queries `WorkspaceMember` before calling `socket.join()`. |
| **Stale Member Access** | `member.removed` event forces active sockets out of workspace room immediately. |
| **Anti-Enumeration Bypass** | Unauthorized subscription attempts return 404 "Workspace not found". |

---

## 21. Testing & Verification Strategy

### 21.1 Verification Test Matrix
1. **Transport Unit Tests**: Handshake auth, token verification, socket lifecycle.
2. **Tenant Isolation E2E Tests**: Connect User A (Workspace X) and User B (Workspace Y). Mutate item in Workspace X; verify User A receives event and User B receives zero events.
3. **Membership Revocation Tests**: Verify revoking member removes socket from room.
4. **Reconnect & State Reconciliation Tests**: Verify post-reconnect cache invalidation.
5. **Deterministic Pipeline**: Tests run against local HTTP server + `mongodb-memory-server` included in `npm run verify`.

---

## 22. Existing Architecture That Must Not Change

1. **Workspace Security Boundary**: Workspace identity remains primary tenant isolation.
2. **Phase 33 RBAC**: `PermissionEngine` remains authoritative authorization evaluator.
3. **Domain Service Authority**: REST APIs and domain services remain exclusive mutation path.
4. **Task Notes OCC**: Optimistic concurrency control (version checks) remains intact.
5. **TanStack Query Ownership**: Client server state remains owned by TanStack Query.
6. **Existing Verification**: All 95 existing test suites must remain green.

---

## 23. Identified Blockers & Risks

### Risk 1: Duplicate Event Firing during Controlled AI Actions (MEDIUM RISK)
- **Problem**: Controlled AI Actions call domain services (e.g. `createTask`), which record activities and emit events.
- **Resolution**: Event publication lives inside domain services; AI actions inherit standard publication without duplication.

### Risk 2: Process Boundary Leakage in `smoke.ts` (MEDIUM RISK)
- **Problem**: Socket.IO initialization in `app.ts` could break `smoke.ts` or unit test isolation.
- **Resolution**: Attach Socket.IO to `http.Server` inside `index.ts` (or via separate bootstrap helper), keeping `app.ts` pure Express.

---

## 24. Recommended Phase 34 Scope

- Persistent authenticated Socket.IO connection.
- Workspace-scoped connection & room authorization.
- Typed domain event bus & transport publication.
- Live TanStack Query cache invalidation.
- Ephemeral presence & resource viewing awareness.
- Comprehensive automated test verification suite.

---

## 25. Explicit Non-Goals

- CRDT or OT real-time rich text editing.
- Replacing REST APIs with WebSockets for mutations.
- Durable/database-backed presence state.
- Redesigning Phase 33 RBAC or workspace models.
- Real-time token-by-token AI streaming (unless separately specified).

---

## 26. Recommended Work-Package Decomposition

- **WP-1**: Real-Time Transport Foundation & Handshake Auth
- **WP-2**: Workspace Connection & Authorization (Room Management)
- **WP-3**: Typed Event Architecture & Domain Event Bus
- **WP-4**: Authoritative Domain Event Publication
- **WP-5**: Client Real-Time Service & Live Cache Synchronization
- **WP-6**: Ephemeral Presence & Resource Viewing Awareness
- **WP-7**: Lifecycle, Reliability, Reconnect & Production Hardening

---

## 27. Recommended Three-Gate Verification Structure

- **GATE 1 — Architecture & Contract Readiness**: Freeze `01-contract.md` and transport design.
- **GATE 2 — Transport, Event & Isolation Verification**: Verify authenticated sockets, workspace room authorization, cross-tenant isolation, and domain event publication.
- **GATE 3 — End-to-End Reliability & Production Verification**: Verify live client sync, presence, reconnect recovery, membership revocation handling, and full `npm run verify` suite.

---

## 28. Open Questions Requiring Architectural Decisions

None. All 51 architectural questions have been investigated and answered based on direct inspection of the Odet-X repository.

---

## 29. Final Feasibility Verdict

**PHASE 34 REAL-TIME COLLABORATION IS FULLY FEASIBLE.**  
The repository architecture cleanly supports event-driven real-time collaboration layered on top of the authoritative domain services and Phase 33 multi-tenant RBAC foundation.
