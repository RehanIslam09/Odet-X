# Phase 35.6 — Master Stabilization Execution Checklist & Playbook
## Document 07: Master Stabilization Execution Checklist & Playbook

**Status**: Master Execution Blueprint — DO NOT MODIFY SOURCE CODE  
**Phase**: 35.6 (Stabilization Execution Planning)  
**Date**: 2026-08-05  
**Execution Lead**: Principal Software Architect / Lead QA Engineer / Lead Release Engineer  
**Classification**: Permanent Reference — Single Source of Truth for Stabilization Work Packages  

---

> [!IMPORTANT]
> This document is the definitive master execution playbook for all Phase 35.6 Stabilization Work Packages (SWPs).
> It defines the exact dependency-ordered roadmap, reusable SWP templates, verification gates, manual QA checklists, regression tracking matrices, engineering rules, and release criteria.
> Do NOT modify source code or run execution commands during this planning stage.

---

## 1. Executive Summary

### Why Stabilization Exists
Phase 35 introduced **Workspace Platform V2** (multi-tenant workspace architecture, workspace-prefixed URL routing `/w/:workspaceSlug/*`, redesigned workspace switcher popover, 4-step workspace creation wizard, and adaptive settings). 

While static verification (`npm run verify`, TypeScript, ESLint, unit tests) passed with 349+ green tests, manual runtime testing uncovered severe cross-tenant regressions:
* Outgoing REST API calls omitted the `X-Workspace-Slug` HTTP header.
* Server-side middleware silently fell back to Personal Workspace data.
* Projects and tasks created inside Team Workspaces were mislocated into Personal Workspaces.
* Notification action buttons persisted after invitation acceptance.
* Multiple owners were created in `WorkspaceMember` during ownership transfers.
* AI Settings and accent color swatches failed to persist across reloads.

### Why Code Changes Were Frozen
To prevent secondary regressions and fragmented "band-aid" patches, all feature development was strictly frozen. Six exhaustive software forensics investigations (01 through 06) were conducted to locate root causes, trace dynamic runtime workflows, audit test coverage gaps, and establish a master dependency graph.

### Moving to Ordered Remediation
With 100% of root causes identified, stabilization now proceeds through **Stabilization Work Packages (SWPs)** executed in strict dependency order (Tenant Header Signal -> DB Schemas -> Context & Router -> Query Cache -> Middleware Guards -> Feature Persistence -> Verification).

---

## 2. Overall Stabilization Philosophy

1. **Fix Root Causes, Never Symptoms**: A single root cause (missing `setActiveWorkspaceSlug` call) produced 10+ user symptoms. SWPs target the core architectural defect, not individual component workarounds.
2. **Strict Single Subsystem Scope**: Never modify multiple architectural layers simultaneously. One subsystem -> One SWP -> Complete Verification -> Merge -> Next SWP.
3. **Monotonic Health Improvement**: Every SWP must leave the repository in a strictly healthier state than before. No temporary regressions or "broken intermediate commits" are permitted.
4. **Mandatory Boundary Assertions**: Unit tests alone are insufficient. Every SWP must include real HTTP boundary assertions or manual QA verification.
5. **No False Green Releases**: A green test suite is invalid if runtime HTTP headers or database persistence fail.

---

## 3. Master Stabilization Roadmap

```
                               STABILIZATION EXECUTION ROADMAP
Stage 0: Pre-Flight Baseline
   │
Stage 1: Axios Header Bridge Repair (SWP-01)
   │
Stage 2: Mongoose Schema & Type Contract Parity (SWP-02)
   │
Stage 3: Workspace Context & URL Slug Sync (SWP-03)
   │
Stage 4: React Query Key Partitioning (SWP-04)
   │
Stage 5: Service Layer & Middleware Fallback Protection (SWP-05)
   │
Stage 6: Ownership Transfer Invariant Enforcement (SWP-06)
   │
Stage 7: Settings Persistence Wiring (SWP-07)
   │
Stage 8: Notification & Invitation Lifecycle Cleanup (SWP-08)
   │
Stage 9: Workspace Navigation & Command Palette URLs (SWP-09)
   │
Stage 10: Activity Log Event Formatting (SWP-10)
   │
Stage 11: Tenant Isolation Integration Test Suite (SWP-11)
   │
Stage 12: Production Readiness & Manual QA Sign-Off (SWP-12)
```

### Stage Overview Specifications

| Stage | SWP ID | Target Subsystem | Primary Goal | Dependencies | Difficulty | Risk Level |
|---|---|---|---|---|---|---|
| **0** | `SWP-00` | Baseline Snapshot | Lock code baseline & freeze active branches | None | Low | Low |
| **1** | `SWP-01` | Axios Header Bridge | Re-connect `setActiveWorkspaceSlug` to Axios | `SWP-00` | Low | Low |
| **2** | `SWP-02` | Mongoose Schemas | Add `isPersonal`, `accentColor`, `aiSettings` to DB | `SWP-01` | Low | Low |
| **3** | `SWP-03` | Context & Router | Re-wire `useEffect` slug sync & legacy redirects | `SWP-01`, `02` | Medium | Medium |
| **4** | `SWP-04` | Query Cache Keys | Add `workspaceId` to `projectKeys` & `taskKeys` | `SWP-03` | Medium | High |
| **5** | `SWP-05` | Server Middleware | Reject un-tenanted REST requests on `/projects` | `SWP-01`, `03` | Medium | High |
| **6** | `SWP-06` | Ownership Transfer | Demote former owner to `ADMIN` atomically | `SWP-02` | Low | Medium |
| **7** | `SWP-07` | Settings Persistence| Wire `<AISettingsTab />` & colors to Mongoose API | `SWP-02`, `05` | Medium | Low |
| **8** | `SWP-08` | Notifications | Mutate `Notification` DB doc on invite accept | `SWP-05` | Low | Medium |
| **9** | `SWP-09` | Search Navigation | Update `generateNavigationUrl` with `/w/:slug` | `SWP-03` | Low | Low |
| **10** | `SWP-10` | Activity Log | Add workspace & member event string formatters | None | Low | Low |
| **11** | `SWP-11` | Integration Tests | Implement Supertest Tenant Isolation Suite | `SWP-01`-`10` | High | Low |
| **12** | `SWP-12` | Production Sign-Off| Execute 20-point Manual QA Checklist | `SWP-11` | Medium | Low |

---

## 4. Stabilization Work Package (SWP) Template

All future stabilization pull requests and work package executions MUST adhere to this exact markdown template:

```markdown
# SWP-[ID]: [Title of Work Package]

## 1. Status & Metadata
- **Status**: [Not Started | In Progress | Blocked | Ready For Review | Completed]
- **Target Stage**: Stage [X]
- **Owner**: [Engineer Name / Agent ID]
- **Assigned Date**: YYYY-MM-DD
- **Completion Date**: YYYY-MM-DD

## 2. Purpose & Objectives
Brief 2-3 sentence summary of what this specific work package repairs and which root cause it targets.

## 3. Root Cause Addressed
Reference to specific finding from Investigations 01-06 (e.g. Investigation 01 Finding #1: Disconnected Axios Header Bridge).

## 4. Files Allowed to Change (Whitelisted)
- `client/src/features/...`
- `server/src/services/...`

## 5. Files Forbidden to Change (Blacklisted)
- `client/src/app/router.tsx` (Unless explicit target of this SWP)
- Any file outside the whitelisted scope.

## 6. Implementation Plan
Step-by-step description of code modifications.

## 7. Verification Results
- [ ] TypeScript (`tsc --noEmit`) Passed
- [ ] ESLint (`eslint .`) Passed
- [ ] Unit Tests Passed
- [ ] Integration Tests Passed
- [ ] Manual QA Workflow Verified
- [ ] No Console / Network Errors

## 8. Exit Criteria
Specific criteria that must be true before merging.

## 9. Rollback Strategy
Git commands or revert strategy if verification fails.
```

---

## 5. Global Stabilization Subsystem Checklist

Master tracker for tracking subsystem stabilization across all SWPs:

- [ ] **Axios HTTP Header Interceptor**
  - [ ] Fixed (`setActiveWorkspaceSlug` connected in `WorkspaceContext`)
  - [ ] Verified (Request headers contain `X-Workspace-Slug`)
  - [ ] Integration Test Added
  - [ ] Manual QA Verified
- [ ] **Mongoose Workspace Model Schema**
  - [ ] Fixed (`isPersonal`, `accentColor`, `aiSettings`, `preferences` added)
  - [ ] Verified (API returns fields in JSON payload)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Workspace Context & Routing**
  - [ ] Fixed (Syncs URL slug to Axios & localStorage synchronously)
  - [ ] Verified (Direct link navigation preserves active workspace)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **TanStack Query Key Partitioning**
  - [ ] Fixed (`projectKeys` and `taskKeys` include `workspaceId`)
  - [ ] Verified (Workspace switching isolates project/task cache)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Server Workspace Middleware Protection**
  - [ ] Fixed (`resolveOptionalWorkspace` hardens tenant endpoints)
  - [ ] Verified (Un-tenanted REST calls handled safely)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Workspace Ownership Transfer**
  - [ ] Fixed (`transferWorkspaceOwnership` demotes former owner to `ADMIN`)
  - [ ] Verified (`WorkspaceMember` has exactly 1 `OWNER` doc)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Workspace Settings Persistence**
  - [ ] Fixed (`AISettingsTab` & color swatches wired to Mongoose API)
  - [ ] Verified (Settings persist across page refresh)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Notification & Invitation Resolution**
  - [ ] Fixed (Accepting invite updates `Notification` DB document)
  - [ ] Verified (Action buttons vanish after acceptance)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Command Palette Navigation URLs**
  - [ ] Fixed (`generateNavigationUrl` produces `/w/:slug/...`)
  - [ ] Verified (Clicking search item preserves workspace slug)
  - [ ] Test Added
  - [ ] Manual QA Verified
- [ ] **Activity Log Event Formatting**
  - [ ] Fixed (`activity.utils.ts` handles workspace and member event types)
  - [ ] Verified (Feed displays readable event descriptions)
  - [ ] Test Added
  - [ ] Manual QA Verified

---

## 6. Verification Gates

No SWP shall be marked **Completed** or merged into `main` until every single gate passes:

```
[SWP Code Changes]
       │
   [GATE 1] ──> TypeScript (`tsc --noEmit`) Zero Errors
       │
   [GATE 2] ──> ESLint (`eslint .`) Zero Warnings
       │
   [GATE 3] ──> Unit Tests Passing (100% pass rate)
       │
   [GATE 4] ──> Integration Tests Passing (Boundary assertion verified)
       │
   [GATE 5] ──> Manual QA Workflow Retested (Pass rating on affected flow)
       │
   [GATE 6] ──> Browser Console & Network Log Audit (Zero red 4xx/5xx errors)
       │
   [GATE 7] ──> Documentation Updated & SWP Logged
       │
[SWP APPROVED & MERGED]
```

---

## 7. Manual QA Checklist

Comprehensive 20-point manual testing checklist covering all major feature flows:

| Test ID | Feature Workflow | Expected Behavior | Status | Notes / Screenshots |
|---|---|---|---|---|
| **QA-01** | App Startup (Cold) | Navigating to `/` redirects to `/w/:defaultSlug/dashboard` and sets Axios header | [ ] PASS | |
| **QA-02** | Deep Link Navigation | Opening `/w/team-alpha/projects` directly renders Team Alpha projects | [ ] PASS | |
| **QA-03** | Workspace Switcher | Selecting "Acme Team" switches URL to `/w/acme-team/...` and updates header | [ ] PASS | |
| **QA-04** | Rapid Switching | Rapidly switching A -> B -> C leaves socket room and cache on Workspace C | [ ] PASS | |
| **QA-05** | Workspace Creation | 4-step wizard creates team workspace and redirects to `/w/new-slug/dashboard` | [ ] PASS | |
| **QA-06** | Project Creation | Creating project in `/w/team-alpha/projects` saves project under `team-alpha` ID | [ ] PASS | |
| **QA-07** | Task Creation | Creating task in Team project associates task with project's workspace ID | [ ] PASS | |
| **QA-08** | Invite Generation | Admin sends invite email; pending invitation record created in DB | [ ] PASS | |
| **QA-09** | Invitation Accept | Recipient clicks Accept in notification bell; joins workspace; buttons vanish | [ ] PASS | |
| **QA-10** | Re-Accept Protection | Notification bell no longer presents Accept button for resolved tokens | [ ] PASS | |
| **QA-11** | Ownership Transfer | Transferring ownership sets new owner and demotes former owner to `ADMIN` | [ ] PASS | |
| **QA-12** | General Settings | Renaming workspace & changing slug updates URL bar and sidebar identity card | [ ] PASS | |
| **QA-13** | Accent Color Swatch | Selecting accent color swatch & clicking Save persists color across refresh | [ ] PASS | |
| **QA-14** | AI Settings Tab | Changing AI model to "Gemini 1.5 Pro" & saving persists choice on reload | [ ] PASS | |
| **QA-15** | Adaptive Settings Guard | Navigating to `/settings/members` in Personal Workspace redirects to `/general` | [ ] PASS | |
| **QA-16** | Command Palette | Selecting project in search palette navigates to `/w/:slug/projects/:id` | [ ] PASS | |
| **QA-17** | Activity Feed | Activity feed displays formatted text ("Transferred ownership to User B") | [ ] PASS | |
| **QA-18** | Realtime Presence | Connected team members appear in Workspace Presence Avatar Stack | [ ] PASS | |
| **QA-19** | Reconnection Sync | Disconnecting & reconnecting socket maintains active workspace subscription | [ ] PASS | |
| **QA-20** | Workspace Deletion | Deleting Team Workspace removes workspace & redirects to Personal Workspace | [ ] PASS | |

---

## 8. Production Bug Tracking & Regression Matrix

Mapping all 20 discovered production issues to their assigned SWP remediation packages:

| Bug ID | Issue Description | Root Cause Subsystem | Assigned SWP | Target Fix Stage | Status |
|---|---|---|---|---|---|
| `BUG-01` | Dashboard shows Personal Workspace data | Disconnected Axios Header Bridge | `SWP-01` | Stage 1 | Open |
| `BUG-02` | Projects created in Team WS show up in Personal WS | Missing `X-Workspace-Slug` on POST | `SWP-01`, `05` | Stage 1, 5 | Open |
| `BUG-03` | Tasks created in Team WS show up in Personal WS | Un-tenanted `POST /tasks` request | `SWP-01`, `05` | Stage 1, 5 | Open |
| `BUG-04` | Stale projects rendered when switching workspaces | Unpartitioned `projectKeys` cache | `SWP-04` | Stage 4 | Open |
| `BUG-05` | Stale tasks rendered when switching workspaces | Unpartitioned `taskKeys` cache | `SWP-04` | Stage 4 | Open |
| `BUG-06` | Notification Accept/Decline buttons persist after accept | Immutable `Notification` DB record | `SWP-08` | Stage 8 | Open |
| `BUG-07` | Re-accepting resolved invitation throws 400 error | Persisted notification action buttons | `SWP-08` | Stage 8 | Open |
| `BUG-08` | Multiple `OWNER` records exist in single workspace | Missing demotion in `transferOwnership` | `SWP-06` | Stage 6 | Open |
| `BUG-09` | Former owner retains full owner permissions | Un-demoted `WorkspaceMember` record | `SWP-06` | Stage 6 | Open |
| `BUG-10` | AI Settings revert to defaults on tab switch | Local React `useState` only, no API call | `SWP-07` | Stage 7 | Open |
| `BUG-11` | Workspace accent color swatch not saved on reload | Missing `accentColor` in Mongoose schema | `SWP-02`, `07` | Stage 2, 7 | Open |
| `BUG-12` | `AdaptiveRouteGuard` fails type check | Missing `type` property in Mongoose schema | `SWP-02` | Stage 2 | Open |
| `BUG-13` | Command Palette search click resets workspace slug | Un-prefixed `generateNavigationUrl` | `SWP-09` | Stage 9 | Open |
| `BUG-14` | Sidebar recently viewed items mix workspace items | Unscoped `localStorage` keys | `SWP-09` | Stage 9 | Open |
| `BUG-15` | Activity feed renders "Updated workspaceMember" | Missing case handlers in `activity.utils` | `SWP-10` | Stage 10 | Open |
| `BUG-16` | Direct URL reload flickers on default redirect | Context hydration loading state | `SWP-03` | Stage 3 | Open |
| `BUG-17` | Realtime socket reconnection refetches without header | Un-tenanted refetch on socket reconnect | `SWP-01` | Stage 1 | Open |
| `BUG-18` | Creating workspace redirects to Personal data | Missing header post-creation redirect | `SWP-01`, `03` | Stage 1, 3 | Open |
| `BUG-19` | Event router invalidates global `["tasks"]` key | Global query key invalidation prefix | `SWP-04` | Stage 4 | Open |
| `BUG-20` | Unit tests pass while HTTP headers fail | Excessive context & Axios mocking | `SWP-11` | Stage 11 | Open |

---

## 9. Permanent Engineering Execution Rules

1. **Rule 1 (Header Signal Mandatory)**: Every tenant-aware REST request MUST carry `X-Workspace-Slug`.
2. **Rule 2 (No Unpartitioned Query Keys)**: Every workspace resource query key MUST include `workspaceId`.
3. **Rule 3 (Single Owner Enforcement)**: `WorkspaceMember` MUST contain exactly one `role: "OWNER"` document per workspace.
4. **Rule 4 (Notification Lifecycle)**: Resolving an invitation MUST mutate/delete the corresponding `Notification` record.
5. **Rule 5 (Persistence Mandate)**: Every settings tab MUST persist state to Mongoose DB or `localStorage`.
6. **Rule 6 (No Global Provider Mocks)**: Integration tests MUST NOT mock `WorkspaceContext` or `axios` instances.
7. **Rule 7 (Workspace-Prefixed URLs)**: All navigation targets MUST be workspace-prefixed (`/w/:slug/...`).
8. **Rule 8 (Schema Parity)**: Mongoose DB schemas MUST match client TypeScript interface contracts.
9. **Rule 9 (Activity Handler Completeness)**: Utility formatters MUST explicitly handle all domain activity types.
10. **Rule 10 (Manual QA Gate)**: No SWP shall merge without manual workflow testing sign-off.

---

## 10. Future Test Strategy Roadmap

```
                               Future Testing Stack
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Supertest Integration Suite (Target Stage: Stage 11)                                  │
│    Executes full HTTP request pipeline asserting `X-Workspace-Slug` headers.              │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Tenant Isolation Integration Suite (Target Stage: Stage 11)                           │
│    Sends un-tenanted requests and verifies server security rejection.                    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. Playwright E2E Workflow Suite (Target Stage: Stage 12)                                │
│    Headless browser automation testing Workflows 1-9 on a live staging build.            │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. Single-Owner Invariant Test Suite (Target Stage: Stage 6)                             │
│    Verifies atomic demotion of former owner during ownership transfer.                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Stabilization Progress Dashboard

```
==========================================================================================
                          PHASE 35.6 STABILIZATION PROGRESS DASHBOARD
==========================================================================================

Overall Progress:  [░░░░░░░░░░░░░░░░░░░░] 0% Complete (0 / 12 SWPs)
Active SWP:        SWP-01 (Axios Header Bridge Repair - STAGE 1)
Pipeline Status:   TESTING FROZEN — Awaiting SWP-01 Execution Launch

------------------------------------------------------------------------------------------
SWP Execution Tracker:
  [ ] SWP-01: Axios Header Bridge Repair                   (Stage 1  - OPEN)
  [ ] SWP-02: Mongoose Schema & Type Contract Alignment    (Stage 2  - PENDING)
  [ ] SWP-03: Workspace Context & URL Slug Sync            (Stage 3  - PENDING)
  [ ] SWP-04: React Query Key Partitioning                 (Stage 4  - PENDING)
  [ ] SWP-05: Server Middleware Fallback Protection        (Stage 5  - PENDING)
  [ ] SWP-06: Workspace Ownership Transfer Fix             (Stage 6  - PENDING)
  [ ] SWP-07: Workspace Settings Persistence Integration   (Stage 7  - PENDING)
  [ ] SWP-08: Notification Lifecycle & Action Resolution  (Stage 8  - PENDING)
  [ ] SWP-09: Command Palette & Navigation URLs           (Stage 9  - PENDING)
  [ ] SWP-10: Activity Log Description Formatters          (Stage 10 - PENDING)
  [ ] SWP-11: Tenant Isolation Integration Test Suite       (Stage 11 - PENDING)
  [ ] SWP-12: Final Manual QA & Production Release Gate   (Stage 12 - PENDING)

------------------------------------------------------------------------------------------
Production Bug Resolution:
  Critical Bugs Open: 4 / 4
  High Bugs Open:     8 / 8
  Medium Bugs Open:   8 / 8
  Total Bugs Fixed:   0 / 20

Manual QA Checklist Progress: 0 / 20 Workflows Verified (0%)
==========================================================================================
```

---

## 12. Final Release Readiness Sign-Off Checklist

Before Phase 35.6 Workspace Platform V2 is approved for production deployment, ALL 16 verification gates MUST be checked:

- [ ] **Gate 1**: `SWP-01` through `SWP-12` executed and merged in dependency order.
- [ ] **Gate 2**: `setActiveWorkspaceSlug` confirmed working in `WorkspaceContext`.
- [ ] **Gate 3**: Outgoing REST API requests verified carrying `X-Workspace-Slug` HTTP header.
- [ ] **Gate 4**: `projectKeys` and `taskKeys` factories updated with `workspaceId` parameters.
- [ ] **Gate 5**: Server middleware `resolveOptionalWorkspace` verified rejecting un-tenanted requests.
- [ ] **Gate 6**: Ownership transfer confirmed demoting former owner to `ADMIN` atomically.
- [ ] **Gate 7**: `<AISettingsTab />` and accent colors verified persisting across page reloads.
- [ ] **Gate 8**: Accepting invitations confirmed updating `Notification` MongoDB documents.
- [ ] **Gate 9**: Command palette search items verified generating `/w/:slug/...` URLs.
- [ ] **Gate 10**: Activity feed verified displaying formatted descriptions for workspace events.
- [ ] **Gate 11**: All 20 Manual QA Workflows executed and marked **PASS**.
- [ ] **Gate 12**: Supertest Tenant Isolation Integration Suite (`SWP-11`) passing 100%.
- [ ] **Gate 13**: `npm run verify` passing (TypeScript 0 errors, ESLint 0 warnings, unit tests 100%).
- [ ] **Gate 14**: Zero red 4xx/5xx network errors or unhandled console exceptions during QA.
- [ ] **Gate 15**: Permanent investigation docs (01-07) synchronized in repository `docs/investigations/`.
- [ ] **Gate 16**: **FINAL RELEASE SIGN-OFF APPROVED BY PRINCIPAL QA & ARCHITECTURE LEAD**.

---

*End of Document 07.*  
*This document is permanent and complete. Do not modify.*  
*Planning Phase is officially CONCLUDED.*  
*The repository is ready for SWP-01 Execution Launch.*
