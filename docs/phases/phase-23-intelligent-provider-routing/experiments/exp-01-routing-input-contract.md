# Experiment 01: Routing Input Contract & PreferredProvider Reconcilation

## 1. Question / Hypothesis
Does `AIRequestOptions` currently contain `preferredProvider`? Should `preferredProvider` be exposed to domain AI services or added to `AIRequestOptions` for Phase 23?

## 2. Repository Evidence Inspected
- `server/src/ai/types/index.ts`
- `server/src/services/project-ai.service.ts`
- `server/src/services/task-ai.service.ts`
- `server/src/services/project-summary-ai.service.ts`

### Findings:
1. `AIRequestOptions` in `server/src/ai/types/index.ts` contains only `tier: AIModelTier` and `timeoutMs?: number`. It does NOT contain `preferredProvider`.
2. All three domain services pass `{ tier: AIModelTier.DEEP_CONTEXT }` when invoking `AIService.generateStructuredData`.
3. None of the domain services specify or require explicit provider overrides.

## 3. Analysis & Risk Evaluation
- Adding `preferredProvider` to `AIRequestOptions` would alter the public API contract of the AI module.
- Exposing `preferredProvider` to domain services would entice callers to hardcode provider names, violating **INV-23-03 (Domain-Service Neutrality)**.
- Gate 1 pseudocode introduced `preferredProvider` speculatively without repository evidence.

## 4. Final Decision
- **REJECT / REMOVE `preferredProvider` ENTIRELY** from Phase 23 specification, types, and routing logic.
- `AIRequestOptions` remains 100% unchanged.
- `AIRoutingContext` is simplified to `{ tier: AIModelTier }`.

## 5. Status
**CONFIRMED & RECONCILED** (Contradiction resolved by removing speculative `preferredProvider` parameter).
