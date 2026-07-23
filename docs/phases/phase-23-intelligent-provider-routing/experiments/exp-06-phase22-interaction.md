# Experiment 06: Phase 22 Fallback Interaction & Alternate Provider Resolution

## 1. Question / Hypothesis
When Phase 23 dynamically selects Attempt 1 provider (e.g. `'gemini'`), does Phase 22 correctly resolve the alternate provider (e.g. `'anthropic'`) if Attempt 1 fails with an eligible error? What happens if only one provider has credentials configured?

## 2. Repository Evidence Inspected
- `server/src/ai/ai.service.ts`
- `server/src/ai/providers/provider.factory.ts`
- `server/src/ai/utils/fallback-policy.ts`

### Findings:
1. In `AIService.generateStructuredData()`, Phase 22 resolves the alternate provider name via:
   `const alternateProviderName = this.customFallbackProvider?.providerName ?? AIProviderFactory.resolveAlternateProviderName(primaryProviderName);`
2. `AIProviderFactory.resolveAlternateProviderName('gemini')` returns `'anthropic'`.
3. `AIProviderFactory.resolveAlternateProviderName('anthropic')` returns `'gemini'`.
4. If Attempt 1 target was `'gemini'` (routed by Phase 23 for `FAST_JSON`), and it encounters a network or timeout error, Phase 22 resolves `'anthropic'` as Attempt 2 target.
5. If only `'gemini'` has an API key configured and Attempt 1 fails:
   - Phase 22 attempts lazy construction: `AIProviderFactory.getProvider('anthropic')`.
   - `AnthropicProvider` constructor throws `AIConfigurationError('Anthropic API key is missing')`.
   - Phase 22 catches this construction error and wraps primary error and fallback error into `AIFallbackExecutionError`.

## 3. Analysis & Risk Evaluation
- Phase 22 post-failure fallback handling operates dynamically relative to `primaryProviderName`.
- Passing the router's selected initial provider as `primaryProviderName` enables seamless two-way fallback (`gemini -> anthropic` and `anthropic -> gemini`).
- No changes to Phase 22 logic, `isFallbackEligible` policy, or `AIFallbackExecutionError` handling are required.

## 4. Final Decision
- **Phase 22 remains 100% immutable.**
- Initial provider routing integrates seamlessly with existing Phase 22 fallback orchestration.

## 5. Status
**CONFIRMED** (Phase 22 compatibility verified; zero modification to Phase 22 code required).
