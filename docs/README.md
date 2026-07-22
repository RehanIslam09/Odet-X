---
title: "AI Project Manager Internal Engineering Wiki"
description: "Master navigation portal and information architecture index for the AI Project Manager repository."
status: "active"
owner: "Senior Staff Documentation Architect"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "README.md"
  - "docs/architecture.md"
  - "docs/current-project-state.md"
superseded_by: null
review_frequency: "monthly"
---

# AI Project Manager — Engineering Wiki & Documentation Portal

Welcome to the internal engineering documentation portal for **AI Project Manager**. This wiki serves as the authoritative source of truth for living system architecture, security policies, API contracts, engineering standards, and historical evolution.

---

## 🗺️ Documentation Portal Map

```
docs/
├── README.md                           # Master Wiki Navigation Portal (This Document)
├── architecture.md                     # Canonical High-Level System Architecture Overview
├── current-project-state.md            # Verified Living Technical Baseline (Pre-Phase 20)
│
├── architecture/                       # LIVING SYSTEM ARCHITECTURE DEEP-DIVES
│   ├── README.md                       # Architecture Section Index
│   ├── system-overview.md              # Request Flow, Entry Points & Process Boundaries
│   ├── frontend-architecture.md        # Feature-First Client, 4-Tier State, Token Memory
│   ├── backend-architecture.md         # Express 5-Layer Pattern & Service Layer Rules
│   ├── database-design.md              # MongoDB Schemas, Indexes, Soft-Delete, OCC (__v)
│   └── ai-subsystem.md                 # AIService Facade, Provider Contract & Validation
│
├── security/                           # SECURITY & COMPLIANCE ARCHITECTURE
│   ├── README.md                       # Security Index
│   └── authentication.md               # Dual-Token Strategy, SHA-256 Hashing & Rotation
│
├── api/                                # AUTHORITATIVE API SPECIFICATIONS
│   ├── README.md                       # API Index & Response Envelopes
│   ├── rest-api-reference.md           # Complete REST Endpoint Specification & DTO Schemas
│   └── ai-endpoints.md                 # AI Endpoints (Task Gen, Auto-Label, Summary)
│
├── ai/                                 # AI SUBSYSTEM DEEP-DIVES & FEATURES
│   ├── README.md                       # AI Subsystem Overview Index
│   ├── prompt-engineering.md           # Prompt Registry, XML Delimiters & Injection Defense
│   ├── execution-pipeline.md           # 7-Step AI Request Execution Lifecycle
│   ├── research-synthesis.md           # External AI Research & Industry Patterns
│   └── features/                       # Feature Specifications
│       ├── project-task-generation.md
│       ├── task-auto-labeling.md
│       └── project-summary-generation.md
│
├── standards/                          # ENGINEERING STANDARDS & CONVENTIONS
│   ├── README.md                       # Standards Overview
│   └── coding-guidelines.md            # TypeScript Standards, Linter Rules, Error Causality
│
├── operations/                         # TESTING, VERIFICATION & CI/CD
│   ├── README.md                       # Operations Index
│   ├── verification-and-testing.md     # `npm run verify` Pipeline & Test Strategy
│   └── ci-cd-infrastructure.md        # GitHub Actions CI Workflow & Local/CI Parity
│
├── product/                            # PRODUCT VISION & DOMAIN MODEL
│   ├── README.md                       # Product Section Index
│   └── domain-model.md                 # Product Vision, Core Principles & Entity Graph
│
├── roadmap/                            # ROADMAP & PHASE TRACKING
│   ├── README.md                       # Master Roadmap Tracker (Phases 1–30+)
│   └── phase-templates/                # Standardized 17-Section Phase Spec Template
│       └── phase-template.md
│
├── decisions/                          # ARCHITECTURE DECISION RECORDS (ADRs)
│   ├── README.md                       # ADR Index
│   ├── adr-001-dual-token-auth.md      # ADR 1: Dual-Token Auth with In-Memory Access Tokens
│   ├── adr-002-mongoose-occ.md         # ADR 2: Task Notes Concurrency via Mongoose __v
│   └── adr-003-ai-facade.md            # ADR 3: AIService Facade & Zod Validation Boundary
│
└── history/                            # IMMUTABLE HISTORICAL ARCHIVE
    ├── README.md                       # History Archive Index
    ├── project-evolution.md            # Chronological Phase History (Phases 1–19)
    ├── engineering-lessons.md          # 15 Hardening Lessons & Incident Post-Mortems
    ├── audits/                         # Historical Audit Snapshots
    │   └── 2026-07-20-phase-18-product-audit.md
    ├── research/                       # Historical Research & Specs
    │   ├── initial-ai-internal-analysis.md
    │   └── initial-design-and-schema.md
    └── specs/                          # Historical Phase Specifications
        ├── phase-01-foundation-plan.md
        ├── phase-10-task-backend.md
        └── phase-13-task-frontend.md
```

---

## 🧭 Navigation Pathways by Role

### 1. New Developer / Contributor Onboarding
1. Read the public [Root README](../README.md) for quickstart instructions and repository overview.
2. Review [Current Project State](current-project-state.md) to understand the active codebase baseline.
3. Review [Engineering Standards](standards/coding-guidelines.md) for linter and TypeScript rules.
4. Execute `npm run verify` locally to validate your workstation setup.

### 2. Full-Stack / Backend Engineer
1. Study [Architecture Overview](architecture.md) and [System Overview](architecture/system-overview.md).
2. Deep dive into [Backend Architecture](architecture/backend-architecture.md) and [Database Design](architecture/database-design.md).
3. Reference [REST API Reference](api/rest-api-reference.md) for exact DTO schemas and HTTP status codes.
4. Check [Security Architecture](security/authentication.md) when touching auth flows.

### 3. Frontend Engineer
1. Review [Frontend Architecture](architecture/frontend-architecture.md) for React 19, React Query, and Zustand patterns.
2. Inspect [Token Isolation Rules](security/authentication.md#frontend-authentication-architecture) in `services/axios.ts`.
3. Consult [REST API Reference](api/rest-api-reference.md) for response envelopes.

### 4. AI Subsystem Engineer
1. Read [AI Subsystem Overview](architecture/ai-subsystem.md).
2. Study [Prompt Engineering & Injection Defense](ai/prompt-engineering.md).
3. Review [Execution Pipeline](ai/execution-pipeline.md) and [AI Endpoints](api/ai-endpoints.md).
4. Inspect feature specs under [AI Features](ai/features/).

### 5. Architect / Maintainer
1. Review [Architecture Decision Records](decisions/README.md).
2. Manage roadmap and phase specs in [Roadmap Index](roadmap/README.md).
3. Consult [Historical Evolution](history/project-evolution.md) and [Engineering Lessons](history/engineering-lessons.md) for background rationale.

---

## 📜 Documentation Governance & Maintenance Rules

1. **Single Source of Truth (SSOT):** Living system specs in `/docs/architecture/`, `/docs/api/`, `/docs/security/`, and `/docs/standards/` are authoritative. Never create duplicate full-text copies.
2. **Current vs. History Separation:** Living docs describe *how the system works today*. Historical docs in `/docs/history/` capture *how we got here*.
3. **Phase Completion Workflow:** After completing a phase:
   - Update `docs/current-project-state.md` with verified code state.
   - Update relevant living architecture documents.
   - Append phase summary to `docs/history/project-evolution.md`.
4. **Verification Gate:** Any doc change that modifies CLI commands or environment variables MUST be verified against `npm run verify`.
