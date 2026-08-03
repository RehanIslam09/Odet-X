# 07 — Categorized & Ranked Integration Priority Roadmap

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Purpose**: Prioritized Execution Roadmap to close all remaining integration gaps, elevate product readiness, and transform the application into a enterprise-grade production SaaS.

---

## Priority Tier Breakdown & Technical Rationale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIORITY 1: CRITICAL PRODUCT BLOCKERS                                       │
│ Items that block core SaaS workflows or leave visible dead buttons/placeholders│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIORITY 2: MAJOR MISSING WORKFLOWS                                        │
│ Core domain capabilities missing endpoints or UI actions (e.g. clone, bulk) │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIORITY 3: QUALITY-OF-LIFE IMPROVEMENTS                                    │
│ Ergonomic enhancements, breadcrumb navigation & quiet connection status      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIORITY 4: POLISH & AESTHETIC ENHANCEMENTS                                 │
│ Fine-grained UI density controls, animation polish & secondary settings     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Priority 1 — Critical Product Blockers

| Item ID | Feature Gap / Task Title | Subsystem | Technical Description & Rationale | Estimated Impact |
| :--- | :--- | :---: | :--- | :---: |
| **P1-01** | Wire Dashboard AI Buttons to Global Command Palette | AI / Dashboard | Remove `disabled` attributes and tooltips from `AIDailyBrief.tsx` and `QuickActions.tsx`. Wire click handlers to launch Command Palette (`Ctrl+K`) in Copilot query mode. Eliminates prominent dead UI on the primary dashboard. | **CRITICAL** |
| **P1-02** | Implement Workspace Member Invitation Endpoints | Workspaces | Add backend endpoints `POST /workspaces/:id/invitations`, `GET /invitations/:token`, `POST /invitations/:token/accept`, and `POST /invitations/:token/reject`. Wire `WorkspaceMembersTab.tsx` email invitation form. Enables team collaboration onboarding. | **CRITICAL** |
| **P1-03** | Task Board (Kanban) View Implementation | Tasks | Implement `TaskBoardView.tsx` component rendering tasks grouped by status columns (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with drag-and-drop or status updates. Unlocks the disabled toggle in `TaskViewToggle.tsx`. | **HIGH** |

---

## 2. Priority 2 — Major Missing Workflows

| Item ID | Feature Gap / Task Title | Subsystem | Technical Description & Rationale | Estimated Impact |
| :--- | :--- | :---: | :--- | :---: |
| **P2-01** | Workspace Role Promotion & Demotion | Workspaces | Implement `PATCH /workspaces/:id/members/:userId/role` endpoint and update `WorkspaceMembersTab.tsx` to allow workspace Owners to promote/demote members between `OWNER` and `MEMBER`. | **HIGH** |
| **P2-02** | Project Duplication Endpoint & Action | Projects | Implement `POST /projects/:id/duplicate` on backend and add 'Duplicate Project' action in `ProjectDetailPage.tsx` and `ProjectCard.tsx`. Enables cloning project templates and task structures. | **MEDIUM** |
| **P2-03** | Bulk Task Selection & Operations | Tasks | Add `PATCH /tasks/bulk` and `DELETE /tasks/bulk` endpoints. Add checkbox multi-selection in `TasksPage.tsx` table view for bulk status change, archiving, and deletion. | **MEDIUM** |

---

## 3. Priority 3 — Quality-of-Life Improvements

| Item ID | Feature Gap / Task Title | Subsystem | Technical Description & Rationale | Estimated Impact |
| :--- | :--- | :---: | :--- | :---: |
| **P3-01** | Unified Breadcrumb Navigation Header | Layout / Navigation | Add dynamic `Breadcrumbs` component in `DashboardNavbar.tsx` tracing current workspace, module, entity, and sub-page (e.g. `Workspace > Projects > AI Engine > Task #102 > Notes`). Improves deep-link navigation context. | **MEDIUM** |
| **P3-02** | Quiet Network Connection Badge Behavior | Realtime | Update `DashboardNavbar.tsx` connection badge to remain hidden when status is `CONNECTED`, appearing only during network drops (`Reconnecting...` or `Offline`). Reduces visual noise. | **LOW** |
| **P3-03** | Custom User Avatar Upload Support | Users / Settings | Add `POST /users/me/avatar` image upload endpoint (or S3/Cloudinary presigned URL) and wire avatar change button in `ProfileSettings.tsx`. | **LOW** |

---

## 4. Priority 4 — Polish & Aesthetic Enhancements

| Item ID | Feature Gap / Task Title | Subsystem | Technical Description & Rationale | Estimated Impact |
| :--- | :--- | :---: | :--- | :---: |
| **P4-01** | Client-Side Interface Density Control | Settings | Wire interface density selector in `AppearanceSettings.tsx` (`Compact`, `Comfortable`, `Spacious`) to client-side CSS variables / padding tokens. | **LOW** |
| **P4-02** | 2FA / TOTP Security Settings Spec | Security | Implement backend TOTP secret generation & verification endpoints (`POST /users/me/2fa/enable`, `POST /users/me/2fa/verify`) and connect switch in `SecuritySettings.tsx`. | **LOW** |
