# Experiment 05: Custom Provider Test Seams & Offline Compatibility

## 1. Question / Hypothesis
How do `customProvider` and `customFallbackProvider` in `AIService` interact with `AIRouter`? Will `AIRouter` break existing unit tests that inject mock providers without setting environment API keys?

## 2. Repository Evidence Inspected
- `server/src/ai/ai.service.ts`
- `server/src/ai/tests/execution.test.ts`
- `server/src/tests/fallback-orchestration.test.ts`
- `server/src/tests/telemetry.test.ts`

### Findings:
1. All Phase 20/21/22 unit and integration tests instantiate `AIService` passing `MockProvider` or `MockFallbackProvider` via the constructor: `new AIService(customProvider, customFallbackProvider)`.
2. In test environments, `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` are intentionally empty strings or unset.
3. If `AIService.generateStructuredData()` invoked `AIRouter.selectInitialProvider()` unconditionally when `this.customProvider` is present, `AIRouter` would check `aiConfig`, find zero configured keys, and throw `AIConfigurationError` before the test mock provider ever executed!

## 3. Analysis & Risk Evaluation
- Unconditionally running `AIRouter` when a custom provider is injected would break existing offline test suites across the repository.
- `this.customProvider` is an explicit dependency injection seam for testing and custom providers.
- When `this.customProvider` is defined, `AIService` MUST bypass `AIRouter` (or assign `INJECTED_PROVIDER_OVERRIDE` strategy) and execute `this.customProvider` directly as Attempt 1.

## 4. Final Decision
- When `this.customProvider` is set on `AIService`, Attempt 1 target is `this.customProvider`.
- `AIRouter` is bypassed for Attempt 1 selection in custom provider injection mode.
- Telemetry captures strategy `'INJECTED_PROVIDER_OVERRIDE'` and reason `'INJECTED_PROVIDER_OVERRIDE'`.
- All existing unit/integration tests remain 100% functional and credential-independent.

## 5. Status
**CONFIRMED** (Custom provider test seam protected; 100% offline test compatibility guaranteed).
