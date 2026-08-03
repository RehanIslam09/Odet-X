# 10 — Multi-Tenant Workspace Collaboration Architecture Review

**Author**: Lead Product Architect & Principal Backend Engineer  
**Date**: August 2, 2026  
**Scope**: Multi-Tenant Workspaces, Roster Management, Invitations, RBAC & Scoping  

---

## 1. Collaboration Subsystem Audit & Gaps

| Capability | Backend API Endpoint | Client Hook / Component | Status | Required Action |
| :--- | :--- | :--- | :---: | :--- |
| Workspace Creation | `POST /workspaces` | `CreateWorkspaceModal.tsx` | **Complete** | None |
| Workspace List & Switching | `GET /workspaces` | `WorkspaceSwitcher.tsx` | **Complete** | None |
| View Members List | `GET /workspaces/:id/members` | `WorkspaceMembersTab.tsx` | **Complete** | None |
| Remove Member / Self-Leave | `DELETE /workspaces/:id/members/:userId` | `WorkspaceMembersTab.tsx` | **Complete** | None |
| Rename / Update Slug | `PATCH /workspaces/:id` | `DangerZone.tsx` | **Complete** | None |
| Delete Workspace | `DELETE /workspaces/:id` | `DangerZone.tsx` | **Complete** | None |
| Invite Member via Email | `POST /workspaces/:id/invitations` | `WorkspaceMembersTab.tsx` | **MISSING** | Implement invitation model, service, routes & UI form. |
| Accept / Reject Invitation | `POST /invitations/:token/accept` | `AcceptInvitationPage.tsx` | **MISSING** | Implement invitation token acceptance route & page. |
| Role Promotion / Demotion | `PATCH /workspaces/:id/members/:userId/role` | `WorkspaceMembersTab.tsx` | **MISSING** | Implement role update endpoint & dropdown in table. |
| Transfer Ownership | `POST /workspaces/:id/transfer-ownership` | `WorkspaceMembersTab.tsx` | **MISSING** | Implement ownership transfer endpoint & dialog. |

---

## 2. Invitation & Role Management Implementation Plan

### A. Backend Invitation Schema (`WorkspaceInvitation`)
```typescript
interface IWorkspaceInvitation {
  workspaceId: Types.ObjectId;
  email: string;
  role: "OWNER" | "MEMBER";
  invitedBy: Types.ObjectId;
  token: string; // Secure random crypto token
  expiresAt: Date;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
}
```

### B. REST API Endpoints to Implement:
1. `POST /api/v1/workspaces/:workspaceId/invitations` — Generate invitation token and record invitation.
2. `GET /api/v1/workspaces/:workspaceId/invitations` — List pending invitations for workspace.
3. `DELETE /api/v1/workspaces/:workspaceId/invitations/:invitationId` — Revoke pending invitation.
4. `GET /api/v1/invitations/:token` — Validate invitation token (Public endpoint).
5. `POST /api/v1/invitations/:token/accept` — Accept invitation and join workspace.
6. `PATCH /api/v1/workspaces/:workspaceId/members/:userId/role` — Update member role (`OWNER` / `MEMBER`).

### C. Frontend UI Integration (`WorkspaceMembersTab.tsx`):
- Connect "Invite Member" email form to `POST /workspaces/:id/invitations`.
- Render "Pending Invitations" table with "Revoke" button.
- Render role selection dropdown on member table rows allowing Owners to promote/demote members.
