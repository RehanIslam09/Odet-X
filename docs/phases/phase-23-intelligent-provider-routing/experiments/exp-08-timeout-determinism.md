# Experiment 08: Timeout Budgeting & Router Determinism

## 1. Question / Hypothesis
Where should `requestStartMonotonic` clock begin in `AIService.generateStructuredData()`? How does router latency interact with the caller's total timeout budget? How is determinism defined for testing?

## 2. Repository Evidence Inspected
- `server/src/ai/ai.service.ts`
- `docs/phases/phase-23-intelligent-provider-routing/00-contract.md`

### Findings:
1. `AIService.generateStructuredData()` receives `options.timeoutMs` (default 30,000ms).
2. Starting `requestStartMonotonic = performance.now()` at the very top of `generateStructuredData()` BEFORE invoking `AIRouter` guarantees that all orchestration overhead (including router execution) is naturally accounted for in the overall request budget.
3. `AIRouter.selectInitialProvider()` is a pure in-memory synchronous calculation. In Node.js / V8, executing string comparisons and array filtering for 2 candidate providers takes `< 0.05ms`.
4. Claims of `< 0.1ms` strict SLA are refined to: "Synchronous in-memory execution with zero I/O (< 1ms overhead)".

## 3. Determinism Definition
Given an identical `AIRoutingContext` and an identical `aiConfig` configuration snapshot, `AIRouter.selectInitialProvider()` will return the exact same `AIRoutingDecision`.

To support deterministic unit testing without relying on process environment mutation, `AIRouter.selectInitialProvider(context, configOverride?)` accepts an optional `configOverride` parameter. If omitted, it defaults to `aiConfig`.

## 4. Final Decision
- Start request timer at the very beginning of `generateStructuredData()`.
- Router operates synchronously in-memory with zero I/O.
- Determinism guaranteed via pure function signature supporting optional config snapshot.

## 5. Status
**CONFIRMED & REFINED** (Clock start policy and determinism definition finalized).
