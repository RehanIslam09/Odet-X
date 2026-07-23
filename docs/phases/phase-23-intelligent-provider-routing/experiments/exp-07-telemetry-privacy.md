# Experiment 07: Routing Telemetry & Privacy Audit

## 1. Question / Hypothesis
What routing decision metadata should be added to `AITelemetryEvent`? How can we ensure free-form text leaks or un-sanitized context string leaks do not occur?

## 2. Repository Evidence Inspected
- `server/src/ai/types/index.ts`
- `server/src/ai/utils/logger.ts`
- `server/src/tests/telemetry.test.ts`
- `server/src/tests/fallback-telemetry.test.ts`

### Findings:
1. `AITelemetryEvent` currently captures `executionId`, `timestamp`, `provider`, `tier`, `model`, `promptName`, `promptVersion`, `durationMs`, `success`, `attempt`, `isFallback`, `fallbackFromProvider`, `primaryErrorCategory`, `usage`, `errorType`, `errorCategory`, `errorMessage`.
2. Free-form string fields create a risk of accidentally leaking sensitive context, API keys, or prompt content.
3. Replacing free-form `routingReason` strings with a bounded reason code enum `routingReasonCode` (`AIRoutingReasonCode`) ensures 100% telemetry privacy and clean log queryability.

## 3. Telemetry Schema Additions

```typescript
export type AIRoutingReasonCode =
  | 'FAST_TIER_OPTIMAL_TARGET'
  | 'DEEP_TIER_PRIMARY_TARGET'
  | 'SINGLE_PROVIDER_AVAILABLE'
  | 'INJECTED_PROVIDER_OVERRIDE';

export interface AITelemetryEvent {
  // ... existing fields ...
  routingStrategy?: string;
  routingReasonCode?: AIRoutingReasonCode;
  candidateProviders?: string[];
  costClass?: 'LOW' | 'HIGH';
  latencyClass?: 'FAST' | 'DEEP';
}
```

## 4. Privacy Audit Checklist
- `routingStrategy`: Enumerable strategy string (e.g. `'STATIC_TIER_POLICY'`) [SAFE]
- `routingReasonCode`: Enumerable reason code (e.g. `'FAST_TIER_OPTIMAL_TARGET'`) [SAFE]
- `candidateProviders`: String array of provider names (e.g. `['anthropic', 'gemini']`) [SAFE]
- `costClass`: Enumerable policy metadata (`'LOW'` | `'HIGH'`) [SAFE]
- `latencyClass`: Enumerable policy metadata (`'FAST'` | `'DEEP'`) [SAFE]
- **PROHIBITED:** Prompts, user IDs, business payloads, environment variable names, API keys.

## 5. Status
**CONFIRMED & REFINED** (Bounded telemetry schema established; privacy boundary verified).
