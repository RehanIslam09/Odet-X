# Phase 34 Developer Handoff Guide & System Baseline

**Phase:** Phase 33 Complete ➔ Phase 34 Handoff  
**Authoritative Directory:** `docs/phases/phase-33-rbac-collaboration/`  
**Current Baseline Test Status:** 80/80 Test Suites Passing (100% Pass Rate)

---

## 1. Current Project State Baseline

As of the completion of Phase 33, the application repository possesses a fully functional, multi-tenant enterprise foundation:

### What Exists & Is 100% Operational
1. **Multi-Tenant Workspaces & Isolation (Phase 32):**
   - Every user has an automatically provisioned Personal Workspace (`isPersonal: true`).
   - Users can create multiple Custom Workspaces (`isPersonal: false`).
   - Tenant isolation is strictly enforced via `workspaceId` at DB model level, service queries, and HTTP middleware.
2. **Role-Based Access Control & Centralized Engine (Phase 33):**
   - Four workspace roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
   - `PermissionEngine` (`server/src/domain/permission-evaluator.ts`) evaluates role capability matrices and resource-level context (e.g. member task deletion).
   - Express middleware (`requirePermission`, `requireWorkspaceOwner`, `requireWorkspaceMember`) protects all REST endpoints.
3. **Collaboration & Token Invitations (Phase 33):**
   - Secure SHA-256 token-based invitation system for non-personal workspaces.
   - 7-day expiration logic and 30-day MongoDB TTL auto-cleanup.
   - Self-leave guards and role management controllers.
4. **AI & Insight Services (Phases 20–30):**
   - Multi-provider AI engine (Gemini, Claude/Anthropic) with fallback resilience and cost/tier routing.
   - Read-only Project Copilot AI (`/api/v1/projects/:projectId/copilot`) with deterministic context assembly and symbolic map resolving.
   - AI Plan & Task Generation engines.
5. **Global Search & Dashboard (Phase 31):**
   - Multi-entity global search service (Projects, Tasks, Milestones, Project Memories) scoped strictly to `{ workspaceId }`.
   - Dashboard summary metrics and recent activity streams.
6. **Frontend RBAC Components (Phase 33):**
   - `usePermissions()` custom hook delivering reactive permission capabilities.
   - `<Can permission={...}>` declarative React component guard.
   - `erasableSyntaxOnly` compliant type taxonomies.

---

## 2. Core Architectural Invariants (DO NOT BREAK)

When implementing Phase 34 (e.g. Realtime Collaboration, Live Activity Streams, Team Management, Fine-Grained Sharing), you **MUST** uphold the following non-negotiable architectural invariants:

### Invariant 1: Workspace is the Primary Security Anchor
- **Rule:** NEVER query or mutate domain resources (Projects, Tasks, Milestones, Activities, Memories) by `owner` or `_id` alone.
- **Enforcement:** Service queries **MUST** always include `{ workspaceId }` equality filters.

### Invariant 2: `owner` Represents Creator Attribution (`createdBy`)
- **Rule:** The `owner` field on Projects, Tasks, Milestones, and Memories represents **who created the document**, NOT who is allowed to access it.
- **Enforcement:** Access is granted based on **Workspace Membership** and **Role Capabilities**, NOT because `doc.owner.toString() === userId`.

### Invariant 3: HTTP 404 Anti-Enumeration Defense
- **Rule:** If an authenticated user attempts to access a workspace or workspace-scoped resource where they hold **no active membership**, the server **MUST** return `404 Not Found` (`"Workspace not found."`).
- **Enforcement:** Never return `403 Forbidden` for non-members. Conceal resource existence to prevent cross-tenant enumeration attacks.

### Invariant 4: Pure-Domain Permission Evaluation
- **Rule:** ALL authorization decisions MUST pass through `PermissionEngine.evaluate()` or `PermissionEngine.authorize()`.
- **Enforcement:** Do NOT hardcode inline role checks (e.g. `if (user.role === 'ADMIN')`) in controllers or service logic. Use `PermissionEngine` or `requirePermission`.

### Invariant 5: Populated Document Mongoose Safety
- **Rule:** When calling `.toString()` on `member.workspaceId` or `project.workspaceId`, ALWAYS inspect whether the property is a populated Mongoose object containing `_id`.
- **Pattern:**
  ```typescript
  const wsId = typeof member.workspaceId === "object" && member.workspaceId !== null && "_id" in member.workspaceId
    ? (member.workspaceId as any)._id.toString()
    : member.workspaceId.toString();
  ```
  *(Calling `.toString()` directly on a populated document returns `"[object Object]"` and causes false-positive 404 rejections).*

---

## 3. Developer Rules & Best Practices

### What You MUST DO:
1. **WSL Execution:** Always run commands (`npm test`, `npm run verify`, `npm run build`) strictly inside WSL (`Ubuntu`).
2. **Exact Property Types (`exactOptionalPropertyTypes: true`):**
   - TypeScript compiler has exact optional property types enabled.
   - When constructing DTO objects, use conditional object spreading for optional properties:
     `...(workspaceId ? { workspaceId } : {})` instead of `{ workspaceId: undefined }`.
3. **Validate Query Parameters Before Permission Checks:**
   - In Express routes, place `validateQuery(zodSchema)` **BEFORE** `requirePermission(...)` so that invalid requests return `400 Bad Request` rather than triggering workspace permission evaluation.
4. **Preserve Zero-Mutation Copilot Guarantees:**
   - The Copilot query endpoint (`POST /projects/:projectId/copilot`) MUST perform 100% ZERO database mutations.
5. **Run Verification Commands:**
   - Always run `npm run verify` before considering a task complete.

### What You MUST NOT DO:
1. **DO NOT commit or push to Git:** Leave workspace changes in git for review.
2. **DO NOT bypass workspace tenancy:** Never add endpoints that fetch resources across multiple workspaces without explicit multi-tenant permission guards.
3. **DO NOT use native Windows tooling:** All Node/npm executions must run in WSL bash.
4. **DO NOT remove or comment out failing assertions:** Always fix underlying root causes.

---

## 4. Phase 34 Developer Checklist

When starting Phase 34, use this step-by-step checklist:

- [ ] **Step 1: Verify Current Baseline**
  Run `npm run verify` in WSL and ensure 0 errors / 0 test failures.
- [ ] **Step 2: Read Phase 33 Specifications**
  Review `docs/phases/phase-33-rbac-collaboration/README.md` and `contracts/phase-33-architecture-contract.md`.
- [ ] **Step 3: Define New Endpoint Permissions**
  If Phase 34 adds new API endpoints, register corresponding permissions in `server/src/constants/permissions.ts` and `client/src/constants/permissions.ts` and add them to `ROLE_PERMISSIONS`.
- [ ] **Step 4: Maintain Middleware Chain**
  Chain `authenticate` ➔ `resolveWorkspace` ➔ `requireWorkspaceMember` ➔ `requirePermission` on all new sub-resource routes.
- [ ] **Step 5: Verify Frontend Permission Guards**
  Wrap new UI elements in `<Can permission={...}>` or check capabilities using `usePermissions()`.

---

## 5. Verification Commands Reference

```bash
# Set Node PATH & navigate to repository
export PATH=/home/rehan/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH
cd /home/rehan/Developer/ai-project-manager

# Run Full Verification (Lint + Typecheck + Tests + Build + Smoke)
npm run verify

# Run Individual Server Test Suites
npm run typecheck
cd server && NODE_ENV=test npx tsx src/tests/rbac-enforcement.test.ts
cd server && NODE_ENV=test npx tsx src/tests/workspace-invitation.test.ts
cd server && NODE_ENV=test npx tsx src/tests/permission-engine.test.ts
```
