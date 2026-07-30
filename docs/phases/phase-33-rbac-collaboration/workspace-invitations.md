# Phase 33 — Collaboration & Workspace Invitation System Specification

## 1. System Overview

The Collaboration & Workspace Invitation System provides secure, token-based asynchronous member invitations for non-personal workspaces. It enables Workspace Owners and Admins to invite new users via email, assign explicit roles (`ADMIN`, `MEMBER`, `VIEWER`), track invitation states, and manage member onboarding without exposing tenant boundaries to unauthorized users.

---

## 2. Data Model & Mongoose Schema Specification

The `WorkspaceInvitation` model is defined in `server/src/models/workspace-invitation.model.ts`.

### Schema Attributes

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `_id` | `ObjectId` | Auto | Generated | Unique Mongo document identifier |
| `workspaceId` | `ObjectId` | Yes | — | Target workspace `_id` (ref: `Workspace`) |
| `email` | `String` | Yes | — | Target user email (normalized to lowercase) |
| `role` | `String` | Yes | — | Assigned role (`ADMIN`, `MEMBER`, `VIEWER`) |
| `token` | `String` | Yes | — | Cryptographically secure SHA-256 token hash |
| `invitedBy` | `ObjectId` | Yes | — | User `_id` of the inviter (ref: `User`) |
| `expiresAt` | `Date` | Yes | — | Expiration timestamp (7 days from creation) |
| `status` | `String` | Yes | `"pending"` | Status (`"pending"`, `"accepted"`, `"revoked"`, `"expired"`) |
| `purgeAt` | `Date` | Yes | — | TTL index purge timestamp (30 days from creation) |
| `createdAt` | `Date` | Auto | Generated | Timestamp of invitation dispatch |
| `updatedAt` | `Date` | Auto | Generated | Timestamp of last status modification |

### Database Indexing

1. **Partial Unique Index (Active Pending Invitation Uniqueness):**
   ```typescript
   WorkspaceInvitationSchema.index(
     { workspaceId: 1, email: 1, status: 1 },
     { 
       unique: true, 
       partialFilterExpression: { status: "pending" } 
     }
   );
   ```
   *Enforces that a user email can only have one active pending invitation per workspace at any given time.*

2. **Lookup Index (Token Verification):**
   ```typescript
   WorkspaceInvitationSchema.index({ token: 1, status: 1 });
   ```
   *Enables O(1) indexed lookup when an invited recipient submits an acceptance token.*

3. **MongoDB TTL Auto-Purge Index:**
   ```typescript
   WorkspaceInvitationSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
   ```
   *Ensures historical invitation logs are automatically cleaned up by MongoDB after 30 days (`purgeAt`), eliminating database bloat.*

---

## 3. Cryptographic Token Lifecycle & Security Design

Invitation tokens are generated using Node.js `crypto.randomBytes(32)` to guarantee 256 bits of entropy. To defend against database breach token leaks, raw tokens are never persisted in plaintext.

```
[Inviter API Request] ──> Generate 32-byte Hex Token (Raw Token)
                                │
                                ├──> SHA-256 Hash ──> Persisted to MongoDB `token` field
                                │
                                └──> Raw Token ──> Returned in API response / Sent in email link
```

### Security Properties
- **Plaintext Separation:** Raw tokens exist strictly in memory during request execution and are transmitted to the recipient via email/link.
- **SHA-256 Hashing:** The database stores `crypto.createHash("sha256").update(rawToken).digest("hex")`.
- **Token Matching:** Upon token submission (`POST /api/v1/workspaces/invitations/accept`), the incoming raw token is hashed via SHA-256 and matched against MongoDB indexed hash.
- **Anti-Timing Attack:** Token verification uses string comparison over indexed hashes.

---

## 4. End-to-End Invitation Workflow Sequences

### Workflow 1: Issuing an Invitation (`POST /api/v1/workspaces/:workspaceId/invitations`)

```
User (Owner/Admin)           Server / Middleware                     Database
     │                                │                                 │
     ├── POST /invitations ──────────>│                                 │
     │   { email, role }              ├─ 1. Authenticate & Resolve Ws   │
     │                                ├─ 2. Check requirePermission     │
     │                                │      (MEMBER_INVITE)            │
     │                                ├─ 3. Check isPersonal !== true   │
     │                                ├─ 4. Check existing member? ────>│
     │                                │      (Return 409 if member)     │
     │                                ├─ 5. Check pending invitation? ─>│
     │                                │      (Revoke old if existing)   │
     │                                ├─ 6. Generate random token       │
     │                                ├─ 7. Hash token & set dates      │
     │                                ├─ 8. Save WorkspaceInvitation ──>│
     │                                │                                 │
     │<── 201 Created ────────────────┼─ 9. Return rawToken & details   │
     │    { rawToken, invitation }    │                                 │
```

### Workflow 2: Accepting an Invitation (`POST /api/v1/workspaces/invitations/accept`)

```
Recipient User               Server / Middleware                     Database
     │                                │                                 │
     ├── POST /accept ───────────────>│                                 │
     │   { token }                    ├─ 1. Authenticate user session   │
     │                                ├─ 2. Hash incoming raw token     │
     │                                ├─ 3. Query WorkspaceInvitation ─>│
     │                                │      WHERE token = hashedToken  │
     │                                │        AND status = 'pending'   │
     │                                ├─ 4. Check expiresAt > now       │
     │                                │      (If expired, update status │
     │                                │       to 'expired' & throw 400) │
     │                                ├─ 5. Create WorkspaceMember ────>│
     │                                │      { workspaceId, userId,     │
     │                                │        role: invitation.role }  │
     │                                ├─ 6. Update invitation status ──>│
     │                                │      to 'accepted'              │
     │                                │                                 │
     │<── 200 OK ─────────────────────┼─ 7. Return joined workspace   │
     │    { workspace, member }       │                                 │
```

---

## 5. Security & Isolation Constraints

1. **Personal Workspace Guard:**
   - Personal workspaces (`isPersonal: true`) **cannot** issue invitations. Attempting to issue an invitation for a personal workspace returns `400 Bad Request` (`"Personal workspaces cannot invite external members."`).
2. **Existing Membership Guard:**
   - Inviting a user who is already an active member of the target workspace returns `409 Conflict` (`"User is already a member of this workspace."`).
3. **Role Escalation Defense:**
   - Inviting users with role `"OWNER"` is prohibited. Ownership transfer is a distinct administrative operation. Invitations permit only `ADMIN`, `MEMBER`, or `VIEWER`.
4. **Anti-Enumeration Defense:**
   - Non-members attempting to issue or list invitations receive `404 Workspace not found`.
5. **Self-Leave Guard:**
   - A workspace `OWNER` cannot leave or remove themselves if they are the sole `OWNER` of the workspace. Another owner must be designated first, or the workspace must be deleted. Returning status `403 Forbidden` (`"Sole workspace owner cannot leave the workspace."`).
