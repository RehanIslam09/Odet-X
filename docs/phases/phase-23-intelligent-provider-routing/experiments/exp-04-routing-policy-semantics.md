# Experiment 04: Routing Policy Truth Table & Strategy Semantics

## 1. Question / Hypothesis
What is the exact deterministic truth table for initial provider routing? Is `SINGLE_AVAILABLE_FALLBACK` semantically accurate for Attempt 1 initial target selection?

## 2. Repository Evidence Inspected
- `server/src/ai/config/ai.config.ts`
- `server/src/ai/types/index.ts`
- `docs/phases/phase-23-intelligent-provider-routing/02-specification.md`

### Findings:
1. Phase 23 governs **Attempt 1 initial provider target selection**.
2. Phase 22 exclusively governs **Attempt 2 post-failure fallback execution**.
3. Gate 1 proposed `SINGLE_AVAILABLE_FALLBACK` for strategy when only one provider has credentials configured. This is semantically misleading because Attempt 1 is an initial execution attempt, not a post-failure fallback.

## 3. Policy Truth Table

| Anthropic Configured | Gemini Configured | Requested Tier | Configured Primary | Expected Attempt 1 Target | Routing Strategy |
|----------------------|-------------------|----------------|--------------------|---------------------------|------------------|
| NO | NO | `FAST_JSON` | anthropic | **THROW `AIConfigurationError`** | N/A (Fail-Fast) |
| NO | NO | `DEEP_CONTEXT` | anthropic | **THROW `AIConfigurationError`** | N/A (Fail-Fast) |
| YES | NO | `FAST_JSON` | anthropic | `'anthropic'` | `SINGLE_CONFIGURED_PROVIDER` |
| YES | NO | `DEEP_CONTEXT` | anthropic | `'anthropic'` | `SINGLE_CONFIGURED_PROVIDER` |
| NO | YES | `FAST_JSON` | anthropic | `'gemini'` | `SINGLE_CONFIGURED_PROVIDER` |
| NO | YES | `DEEP_CONTEXT` | anthropic | `'gemini'` | `SINGLE_CONFIGURED_PROVIDER` |
| YES | YES | `FAST_JSON` | anthropic | `'gemini'` | `STATIC_TIER_POLICY` |
| YES | YES | `FAST_JSON` | gemini | `'gemini'` | `STATIC_TIER_POLICY` |
| YES | YES | `DEEP_CONTEXT` | anthropic | `'anthropic'` | `STATIC_TIER_POLICY` |
| YES | YES | `DEEP_CONTEXT` | gemini | `'gemini'` | `STATIC_TIER_POLICY` |

## 4. Final Decision
- Rename `SINGLE_AVAILABLE_FALLBACK` to **`SINGLE_CONFIGURED_PROVIDER`**.
- Final Routing Strategy Union:
  - `'STATIC_TIER_POLICY'`: Both providers available; target selected by tier rule.
  - `'SINGLE_CONFIGURED_PROVIDER'`: Only one provider has credentials configured.
  - `'INJECTED_PROVIDER_OVERRIDE'`: Custom provider injected for testing.

## 5. Status
**CONFIRMED & REFINED** (Truth table finalized; strategy name corrected).
