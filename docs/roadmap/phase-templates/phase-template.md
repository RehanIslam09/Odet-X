---
title: "Phase Specification Template (17-Section Standard)"
description: "Standardized 17-section template for documenting future development phases."
status: "active"
owner: "Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "N/A"
current_since: "N/A"
related_documents:
  - "docs/roadmap/README.md"
superseded_by: null
review_frequency: "annual"
---

# Phase XX — [Phase Title]

> **Phase Status:** Draft / In-Progress / Verified Complete  
> **Target Timeline:** [Dates]  
> **Authoritative Specification:** `docs/roadmap/phases/phase-XX-[name].md`

---

## 📋 Table of Contents
1. [Phase Overview & Objectives](#1-phase-overview--objectives)
2. [User Stories & Acceptance Criteria](#2-user-stories--acceptance-criteria)
3. [Research & Architectural Decisions (ADR References)](#3-research--architectural-decisions-adr-references)
4. [Domain Model & Database Schema Modifications](#4-domain-model--database-schema-modifications)
5. [REST & AI API Contract Updates](#5-rest--ai-api-contract-updates)
6. [Frontend Component & State Architecture](#6-frontend-component--state-architecture)
7. [Backend Service & Business Logic Modifications](#7-backend-service--business-logic-modifications)
8. [AI Subsystem Integration & Prompts](#8-ai-subsystem-integration--prompts)
9. [Security, Authorization & Multi-Tenant Scoping](#9-security-authorization--multi-tenant-scoping)
10. [Testing & Automated Verification Plan](#10-testing--automated-verification-plan)
11. [Performance & Concurrency Considerations](#11-performance--concurrency-considerations)
12. [Migration & Backward Compatibility Strategy](#12-migration--backward-compatibility-strategy)
13. [Breaking Changes & Deprecations](#13-breaking-changes--deprecations)
14. [Operational & Environment Variables Configuration](#14-operational--environment-variables-configuration)
15. [Engineering Lessons Learned](#15-engineering-lessons-learned)
16. [Verification Sign-Off & Verification Checklist](#16-verification-sign-off--verification-checklist)
17. [Living Documentation Update Log](#17-living-documentation-update-log)

---

## 1. Phase Overview & Objectives
[Describe the problem, background, and what this phase accomplishes.]

## 2. User Stories & Acceptance Criteria
[Define target user stories and strict acceptance criteria.]

## 3. Research & Architectural Decisions (ADR References)
[Link to relevant ADRs or document trade-offs evaluated.]

## 4. Domain Model & Database Schema Modifications
[Specify Mongoose schema updates, indexes, soft-delete, and OCC requirements.]

## 5. REST & AI API Contract Updates
[Detail new or updated API endpoints, request DTOs, and response envelopes.]

## 6. Frontend Component & State Architecture
[Specify React components, hooks, Zustand store, and TanStack Query keys.]

## 7. Backend Service & Business Logic Modifications
[Specify Express middleware, thin controller handlers, and domain services.]

## 8. AI Subsystem Integration & Prompts
[Detail PromptTemplates, XML tags, Zod schemas, and model tier selections.]

## 9. Security, Authorization & Multi-Tenant Scoping
[Detail BOLA checks, token isolation, and permission verification.]

## 10. Testing & Automated Verification Plan
[Specify Vitest client tests and Node.js server test runner additions.]

## 11. Performance & Concurrency Considerations
[Document payload sizes, indexes, debouncing, or optimistic locking.]

## 12. Migration & Backward Compatibility Strategy
[Specify database migration scripts or API backward compatibility.]

## 13. Breaking Changes & Deprecations
[Highlight any breaking changes or deprecated parameters.]

## 14. Operational & Environment Variables Configuration
[List any new environment variables required.]

## 15. Engineering Lessons Learned
[Post-implementation post-mortem and hardening principles learned.]

## 16. Verification Sign-Off & Verification Checklist
- [ ] `npm run lint` PASS
- [ ] `npm run typecheck` PASS
- [ ] `npm test` PASS
- [ ] `npm run build` PASS
- [ ] `npm run smoke` PASS
- [ ] `npm run verify` PASS (100% Green)

## 17. Living Documentation Update Log
[List living architecture docs updated as a result of this phase.]
