# EXP-01 — Gemini Model Discovery & Selection

## Human Review Correction — July 22, 2026
During initial Gate 4 review of EXP-01, an independent fact-check against current official Google Gemini deprecation and migration documentation (dated July 21–22, 2026) identified that the initial model discovery was incomplete. Specifically, the Gemini 2.5 models (`gemini-2.5-flash` and `gemini-2.5-pro`) are scheduled for shutdown on **October 16, 2026**, with Google officially recommending migration to the Gemini 3.x series (`gemini-3.6-flash` and `gemini-3.1-pro-preview`).

Subsequently, **EXP-01B** resolved the `DEEP_CONTEXT` policy by evaluating real repository workloads ([project-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-ai.service.ts), [project-summary-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-summary-ai.service.ts)). **Option A** was selected: configuring `gemini-3.6-flash` (GA/Stable, released July 21, 2026) for BOTH `FAST_JSON` and `DEEP_CONTEXT` capability tiers while preserving full semantic tier isolation in `aiConfig` and application code.

---

## 1. Experiment Question
Which currently available Google Gemini model identifiers should Phase 20 configure for the provider-independent capability tiers (`AIModelTier.FAST_JSON` and `AIModelTier.DEEP_CONTEXT`) based on empirical, authoritative, and lifecycle evidence?

## 2. Repository Requirements
- **FAST_JSON Requirements:**
  - Primary Workload: Task Auto-Labeling (`task-ai.service.ts`).
  - Priorities: Low latency, low cost, structured JSON generation (`responseMimeType: "application/json"`), native JSON schema enforcement (`responseSchema`), adequate context window (>=32k tokens), long-term production stability (no imminent shutdown).
- **DEEP_CONTEXT Requirements:**
  - Primary Workloads: Project Task Generation (`project-ai.service.ts`) and Project Summary Generation (`project-summary-ai.service.ts`).
  - Priorities: Complex reasoning, structured JSON generation, native JSON schema enforcement, large context window (>=128k tokens), production stability.
- **Architectural Boundary:**
  - Both tier selections must fulfill `AIProvider.generateStructuredData()` without requiring any modification to domain services.

## 3. Method
1. Consult official current Google Gemini API deprecations, models, structured output, and migration documentation.
2. Build a complete candidate set including Gemini 3.x and 2.5 generations.
3. Perform lifecycle and shutdown analysis for each candidate model.
4. Construct a candidate matrix comparing lifecycle status, shutdown date, schema support, context window, latency class, and tier fit.
5. Evaluate candidates against project capability tiers (`FAST_JSON` and `DEEP_CONTEXT`).
6. Identify primary recommendations and fallbacks while explicitly documenting production-vs-preview tradeoffs.

## 4. Authoritative Sources
1. **Google Gemini Deprecations & Shutdown Guide**
   - URL: `https://ai.google.dev/gemini-api/docs/deprecations`
   - Access Date: July 22, 2026
   - Supported Claim: Shutdown date of October 16, 2026 for `gemini-2.5-flash` and `gemini-2.5-pro`; official recommended replacements (`gemini-3.6-flash` and `gemini-3.1-pro-preview`).
2. **Google Gemini Models Guide**
   - URL: `https://ai.google.dev/gemini-api/docs/models`
   - Access Date: July 22, 2026
   - Supported Claim: Release dates, model status (GA vs Preview), context window limits (1M tokens for `gemini-3.6-flash` and `gemini-3.1-pro-preview`), and workload positioning.
3. **Google Gemini Structured Outputs Guide**
   - URL: `https://ai.google.dev/gemini-api/docs/structured-output`
   - Access Date: July 22, 2026
   - Supported Claim: Native `responseMimeType: "application/json"` and `responseSchema` support across Gemini 3.x models.
4. **Google Gemini Latest-Model Migration Documentation**
   - URL: `https://ai.google.dev/gemini-api/docs/latest-model`
   - Access Date: July 22, 2026
   - Supported Claim: Migration paths and API compatibility considerations between Gemini 2.5 and 3.x model generations.

## 5. Models Discovered & Lifecycle Analysis
- **`gemini-3.6-flash`** (Released July 21, 2026; GA/Stable; Shutdown: None announced; Recommended replacement for `gemini-2.5-flash`).
- **`gemini-3.5-flash`** (Released May 19, 2026; GA/Stable; Shutdown: None announced).
- **`gemini-3.5-flash-lite`** (Released July 21, 2026; GA/Stable; Shutdown: None announced).
- **`gemini-3.1-pro-preview`** (Released February 19, 2026; Preview status; Shutdown: None announced; Recommended replacement for `gemini-2.5-pro`).
- **`gemini-2.5-flash`** (Released 2025; GA/Stable; **Shutdown: October 16, 2026** — Imminent deprecation risk).
- **`gemini-2.5-pro`** (Released 2025; GA/Stable; **Shutdown: October 16, 2026** — Imminent deprecation risk).
- **`gemini-2.5-flash-lite`** (Released 2025; GA/Stable; **Shutdown: October 16, 2026**).
- **`gemini-1.5-flash` & `gemini-1.5-pro`** (Legacy models; Deprecated/Retired).

## 6. Candidate Filtering
- **`gemini-2.5-flash` & `gemini-2.5-pro`:** REJECTED AS LONG-TERM DEFAULTS (Shutdown scheduled for October 16, 2026; using them creates immediate architectural debt requiring migration within ~3 months).
- **`gemini-1.5-flash` & `gemini-1.5-pro`:** REJECTED (Deprecated / retired legacy models).
- **`gemini-3.5-flash`:** REJECTED FOR FAST_JSON PRIMARY (Superseded by `gemini-3.6-flash` released July 21, 2026, which is Google's official recommended Flash model).

## 7. Candidate Matrix

| Model | Lifecycle Status | Shutdown Date | Structured Output | Context Limit | FAST_JSON Fit | DEEP_CONTEXT Fit | Long-Term Default Suitability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gemini-3.6-flash` | GA / Stable | None | Native (`responseSchema`) | 1M tokens | **PRIMARY** | **PRIMARY (Option A)** | **EXCELLENT** (Current Google default) |
| `gemini-3.5-flash-lite` | GA / Stable | None | Native (`responseSchema`) | 1M tokens | Fallback | Unsuitable | **GOOD** (Ultra-fast/low-cost fallback) |
| `gemini-3.5-flash` | GA / Stable | None | Native (`responseSchema`) | 1M tokens | Secondary | Moderate | Moderate (Superseded by 3.6 Flash) |
| `gemini-3.1-pro-preview` | **Preview** | None | Native (`responseSchema`) | 1M tokens | Overkill | Alternative | Deferred until GA |
| `gemini-2.5-pro` | GA / Stable | **Oct 16, 2026** | Native (`responseSchema`) | 2M tokens | Overkill | Alternative | **POOR** (Imminent shutdown risk) |
| `gemini-2.5-flash` | GA / Stable | **Oct 16, 2026** | Native (`responseSchema`) | 1M tokens | Alternative | Moderate | **POOR** (Imminent shutdown risk) |

## 8. Bounded API Probe
- **API calls executed:** 0 (No local `GEMINI_API_KEY` present in environment; discovery conducted strictly using authoritative official Google documentation).

## 9. FAST_JSON Evaluation
- **Target Workload:** Task Auto-Labeling (`task-ai.service.ts`).
- **Primary Selection:** `gemini-3.6-flash`
- **Justification:** `gemini-3.6-flash` (released July 21, 2026) is Google's official recommended replacement for `gemini-2.5-flash`. It is GA/Stable, has no announced shutdown date, supports native `responseSchema`, and delivers fast, cost-effective structured JSON generations.
- **Fallback:** `gemini-3.5-flash-lite` (GA/Stable, ultra-low cost).

## 10. DEEP_CONTEXT Evaluation (Resolved in EXP-01B)
- **Target Workloads:** Project Task Generation (`project-ai.service.ts`) and Project Summary Generation (`project-summary-ai.service.ts`).
- **Policy Selection (Option A):** `gemini-3.6-flash`
- **Justification:** `gemini-3.6-flash` easily satisfies both repository workloads (max input < 4,000 tokens) with GA/Stable production guarantees and zero preview dependency risk. Full semantic tier isolation is preserved in `aiConfig` vocabulary and domain service requests.

## 11. Primary Recommendations
- **FAST_JSON:**
  - Exact API identifier: `gemini-3.6-flash`
  - Evidence status: VERIFIED FACT (Official Google Documentation)
  - Lifecycle status: GA / Stable (No shutdown announced)
- **DEEP_CONTEXT:**
  - Exact API identifier: `gemini-3.6-flash`
  - Evidence status: VERIFIED FACT (Official Google Documentation & EXP-01B Workload Inspection)
  - Lifecycle status: GA / Stable (No shutdown announced)

## 12. Fallback Candidates
- **FAST_JSON:**
  - Primary: `gemini-3.6-flash`
  - Fallback: `gemini-3.5-flash-lite`
- **DEEP_CONTEXT:**
  - Primary: `gemini-3.6-flash`
  - Fallback: `gemini-3.5-flash-lite`

## 13. Verified Facts
1. Official Google documentation dated July 2026 states `gemini-2.5-flash` and `gemini-2.5-pro` are scheduled for shutdown on **October 16, 2026**.
2. Official Google documentation lists `gemini-3.6-flash` (released July 21, 2026) as the recommended GA replacement for `gemini-2.5-flash`.
3. `gemini-3.6-flash` supports native `responseMimeType: "application/json"` and `responseSchema`.
4. `gemini-3.1-pro-preview` input context window limit is 1,048,576 tokens (1M tokens).

## 14. Experimental Observations
- Local `GEMINI_API_KEY` was absent in environment; zero live network API calls were made.

## 15. Inferences
- `gemini-3.6-flash` is the definitive GA/Stable default choice for both `AIModelTier.FAST_JSON` and `AIModelTier.DEEP_CONTEXT` in Phase 20.
- Preserving semantic capability tiers ensures `aiConfig.gemini.models.deepContext` can be updated to a future GA Gemini Pro model without code changes.

## 16. Unresolved Questions
None. DEEP_CONTEXT model policy is fully resolved by EXP-01B (Option A).

## 17. Impact on WP-02C
When Gate 4 approves EXP-01 and EXP-01B, WP-02C will configure `ai.config.ts` with:
```typescript
gemini: {
  apiKey: process.env.GEMINI_API_KEY || '',
  models: {
    fastJson: process.env.GEMINI_FAST_MODEL || 'gemini-3.6-flash',
    deepContext: process.env.GEMINI_DEEP_MODEL || 'gemini-3.6-flash',
  },
}
```

## 18. EXP-01 Verdict
**EXP-01: PASS — MODEL POLICY READY FOR GATE 4 REVIEW**
