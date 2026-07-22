---
title: "ADR 001: Dual-Token Authentication with In-Memory Access Tokens & SHA-256 Refresh Hashing"
description: "Architecture decision record for dual-token auth, in-memory access token storage, and SHA-256 refresh hashing."
status: "accepted"
owner: "Security Architecture Team"
last_updated: "2026-07-05"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 7"
current_since: "Phase 7"
related_documents:
  - "docs/security/authentication.md"
  - "docs/architecture/frontend-architecture.md"
superseded_by: null
review_frequency: "annual"
---

[Docs Wiki Portal](../README.md) > [ADRs](README.md) > ADR 001

# ADR 001: Dual-Token Authentication with In-Memory Access Tokens & SHA-256 Refresh Hashing

## Context & Problem Statement
A SaaS application requires secure user authentication. Storing tokens in `localStorage` or `sessionStorage` leaves the system vulnerable to XSS token theft. Using long-lived session cookies requires constant database reads on every API call or complex session state invalidation.

## Decision Drivers
- Mitigate XSS token theft risk.
- Avoid raw refresh tokens in database storage.
- Support transparent session restoration without UX interruption.
- Ensure automatic session invalidation upon token reuse detection.

## Considered Options
1. **Option 1:** Single long-lived JWT stored in `localStorage`.
2. **Option 2:** Session ID in HTTP-only cookie with Redis session state.
3. **Option 3:** Dual-Token system: 15-minute access token in client module memory, 7-day refresh token in HTTP-only cookie hashed with SHA-256 in MongoDB.

## Decision Outcome
**Chosen Option: Option 3 (Dual-Token System)**.

### Rationale
- **In-Memory Access Token:** Access tokens exist only in `services/axios.ts` module memory. JavaScript XSS scripts cannot read `localStorage` to extract tokens.
- **HTTP-Only Refresh Cookie:** The browser handles transmission automatically. JavaScript cannot access document cookies for `Path=/api/v1/auth`.
- **SHA-256 Hashing:** Refresh tokens are hashed before MongoDB persistence (`refreshTokenHash`). Database leaks yield un-usable hashes.
- **Rotation & Reuse Detection:** Every refresh rotates the token. Presenting an old token triggers global session invalidation.

## Consequences
- **Positive:** Maximum protection against XSS token exfiltration; zero raw refresh tokens stored in DB.
- **Negative:** Page refresh clears in-memory access token, requiring an initial `/auth/me` bootstrap fetch on startup (handled cleanly by `<AuthBootstrap>`).
