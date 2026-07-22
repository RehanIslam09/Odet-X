---
title: "Security Architecture Index"
description: "Directory and index of security specifications, authentication models, and session management guidelines."
status: "active"
owner: "Security Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 6"
related_documents:
  - "docs/README.md"
  - "docs/security/authentication.md"
  - "docs/architecture/frontend-architecture.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > Security Index

# Security Architecture Specifications

This directory contains specifications and security decision logs for **AI Project Manager**.

---

## 📚 Section Directory

| Document | Primary Focus | Key Security Principles |
|---|---|---|
| [`authentication.md`](authentication.md) | Dual-Token Strategy & Session Security | 15-min in-memory access token, 7-day HTTP-only refresh cookie, SHA-256 hashing, token rotation, reuse detection, refresh locking |

---

## 🔒 Core Security Mandates

1. **Token Isolation:** Access tokens MUST live exclusively in module-level memory (`client/src/services/axios.ts`). Storing tokens in `localStorage`, `sessionStorage`, Zustand, or React component state is strictly forbidden.
2. **Refresh Token Scoping:** Refresh tokens MUST be transmitted exclusively via HTTP-only cookies scoped to `Path=/api/v1/auth`.
3. **Database Hashing:** Refresh tokens MUST be hashed with SHA-256 before persisting to MongoDB (`refreshTokenHash`). Raw refresh tokens must never touch database storage.
4. **Generic Failures:** Authentication error responses must return generic error messages to prevent account enumeration attacks.
