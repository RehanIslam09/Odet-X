---
title: "Engineering Standards & Coding Guidelines"
description: "Authoritative specification for coding conventions, TypeScript strictness, linter rules, and architectural guidelines."
status: "active"
owner: "Architecture Standards Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 1"
related_documents:
  - "docs/architecture/backend-architecture.md"
  - "docs/architecture/frontend-architecture.md"
  - "docs/operations/verification-and-testing.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [Standards](README.md) > Coding Guidelines

# Engineering Standards & Coding Guidelines

This document outlines the coding standards, conventions, and architectural rules enforced across the **AI Project Manager** codebase.

---

## 📋 Table of Contents
1. [General Principles](#1-general-principles)
2. [TypeScript & Linter Conventions](#2-typescript--linter-conventions)
3. [Asynchronous Code & Side Effect Safety](#3-asynchronous-code--side-effect-safety)
4. [Frontend Architecture Conventions](#4-frontend-architecture-conventions)
5. [Backend Architecture Conventions](#5-backend-architecture-conventions)
6. [Testing & Quality Enforcement](#6-testing--quality-enforcement)

---

## 1. General Principles

- **Zero Guesses**: Never guess API signatures, data schemas, or file locations. Inspect authoritative source files.
- **Layered Responsibility**: Maintain strict separation of concerns.
  - *Controllers* handle HTTP request/response parsing only.
  - *Services* own all domain business logic and database interactions.
  - *Models* define data structures and persistence constraints.
  - *AI Service* orchestrates LLM invocation and schema validation without database or HTTP awareness.
- **Single Source of Truth**: Input validation DTO types must be inferred directly from Zod schemas (`z.infer<typeof schema>`).

---

## 2. TypeScript & Linter Conventions

### Strict Type Safety
- Explicitly annotate return types on all public service and controller functions.
- Avoid the use of `any`. Where legacy `any` types exist, they are flagged as warnings (`@typescript-eslint/no-explicit-any`) and MUST NOT be expanded into new code.

### Unused Variables & Arguments
- Unused variables are treated as errors by linters.
- Function parameters required by framework signatures (e.g., Express middleware `(req, res, next)`) that are not read within the function MUST be prefixed with an underscore:
  ```typescript
  // Correct:
  export const errorHandler = (_err: Error, _req: Request, res: Response, _next: NextFunction) => { ... }
  ```

### Optional Catch Binding
- When catching exceptions where the error instance itself is not read, use ES2019 optional catch binding syntax (`catch { ... }`):
  ```typescript
  // Correct:
  try {
    promptRegistry.register(promptTemplate);
  } catch {
    // Ignore if already registered
  }
  ```
- Do NOT introduce unused catch variable bindings like `catch (_e)` merely to satisfy linters.

### Error Causality Preservation
- When catching an exception in a low-level or AI layer and re-throwing a higher-level domain error, preserve the original error instance using `{ cause: error }`:
  ```typescript
  // Correct:
  try {
    return await this.provider.generateStructured(prompt, schema, options);
  } catch (error) {
    throw new Error(`Unexpected failure in AIService: ${(error as Error).message}`, { cause: error });
  }
  ```

---

## 3. Asynchronous Code & Side Effect Safety

- Always `await` Promises explicitly. Never leave floating Promises dangling without error handling.
- **Preserve Side-Effectful Statements**: When refactoring code to remove an unused variable binding, NEVER delete the function call if it performs a required side effect (e.g., database seed call or mutation):
  ```typescript
  // Incorrect (removes task creation):
  // const taskA2 = await createTask(...); -> deleted entirely

  // Correct (removes variable, preserves side effect):
  await createTask(...);
  ```

---

## 4. Frontend Architecture Conventions

- **Token Isolation**: Access tokens MUST live exclusively in module-level memory in `client/src/services/axios.ts`. Tokens MUST NEVER be stored in `localStorage`, `sessionStorage`, Zustand stores, or React component state.
- **HTTP Client**: Components and hooks MUST use `apiClient` from `services/axios.ts`. Direct `axios` imports in feature code are prohibited.
- **Form Error Handling**: Use React Hook Form + Zod. Map server validation errors to forms using `applyServerErrors`.
- **Navigation Protection**: Workspaces with unsaved drafts (such as Task Notes) MUST implement route blocking (`useBlocker`) and browser unload guards (`beforeunload`).

---

## 5. Backend Architecture Conventions

- **Thin Controllers**: Controllers MUST NOT contain database queries or business validation rules.
- **Input Validation**: All public REST endpoints MUST pass through `validate(schema)` middleware before reaching the controller.
- **Soft Delete & Archiving**: Queries for active data MUST explicitly filter `{ isDeleted: false, archived: false }`. Soft delete sets `isDeleted: true`; archiving sets `archived: true`.
- **Asynchronous Audit Logging**: Activity ledger calls (`recordActivity`) MUST execute asynchronously in best-effort mode to prevent audit errors from blocking core transactions.

---

## 6. Testing & Quality Enforcement

- All changes must pass the canonical verification pipeline before PR submission:
  ```bash
  npm run verify
  ```
- Tests must not be deleted, disabled, or weakened to bypass linter or pipeline failures.
