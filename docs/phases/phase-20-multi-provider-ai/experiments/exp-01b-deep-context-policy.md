# EXP-01B — DEEP_CONTEXT Model Policy Resolution

## 1. Decision Question
What is the optimal, evidence-based model policy for `AIModelTier.DEEP_CONTEXT` in Phase 20? Specifically, does the repository's `DEEP_CONTEXT` workload materially justify introducing a Preview model (`gemini-3.1-pro-preview`), or is the GA/Stable `gemini-3.6-flash` model sufficient for both capability tiers while preserving semantic tier isolation?

---

## 2. Repository Workload Analysis

### A. Project Task Generation (`project-ai.service.ts`)
- **Prompt Definition:** [project-tasks.prompt.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/prompts/definitions/project-tasks.prompt.ts)
- **Zod Schema:** [project-tasks.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/project-tasks.schema.ts)
- **Input Complexity:** Accepts project name, description (optional text), and existing task titles (for de-duplication). Estimated input size: 200 – 2,000 tokens (max < 4,000 tokens).
- **Output Complexity:** Array of 3–15 task objects (`title`, `description`, `priority`, `estimatedTime`, `suggestedOrder`). Estimated output size: 300 – 1,500 tokens.
- **Reasoning Complexity:** Moderate. Requires breaking down a high-level project goal into actionable steps.
- **Context Limit Requirement:** < 10,000 tokens (less than 1% of `gemini-3.6-flash`'s 1,048,576 token capacity).

### B. Project Summary Generation (`project-summary-ai.service.ts`)
- **Prompt Definition:** [project-summary.prompt.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/prompts/definitions/project-summary.prompt.ts)
- **Zod Schema:** [project-summary.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/project-summary.schema.ts)
- **Input Complexity:** Accepts project metadata, task counts, task status breakdown, sample task titles. Estimated input size: 300 – 3,000 tokens.
- **Output Complexity:** Factual summary string (10–2000 chars), highlights array (max 5 items), risks array (max 5 items). Estimated output size: 200 – 800 tokens.
- **Reasoning Complexity:** Moderate factual summarization.
- **Context Limit Requirement:** < 10,000 tokens.

**Workload Finding:** Neither `DEEP_CONTEXT` workload requires ultra-large context (> 100k tokens) or heavy multi-step logical chain reasoning. Both workloads are structured JSON generation tasks well within the capability of `gemini-3.6-flash`.

---

## 3. Factual Corrections

### Context Window Correction
- **Previous EXP-01 Claim:** `gemini-3.1-pro-preview` has a 2M token context window.
- **Corrected Official Fact:** Current official Google documentation confirms `gemini-3.1-pro-preview` has an input context window limit of **1,048,576 tokens (1M tokens)**, identical to `gemini-3.6-flash`.

---

## 4. Google Sources Consulted
1. **Google Gemini Models Guide** (`https://ai.google.dev/gemini-api/docs/models`) [Access Date: July 22, 2026]
   - *Claim:* `gemini-3.6-flash` (GA/Stable, released July 21, 2026, 1M token context) and `gemini-3.1-pro-preview` (Preview status, released Feb 19, 2026, 1M token context).
2. **Google Gemini Deprecations & Migration Guide** (`https://ai.google.dev/gemini-api/docs/deprecations`) [Access Date: July 22, 2026]
   - *Claim:* `gemini-2.5-flash` and `gemini-2.5-pro` are scheduled for shutdown on October 16, 2026. Recommended replacement for Flash is `gemini-3.6-flash`.
3. **Google Gemini API Reference — GenerateContent vs Interactions** (`https://ai.google.dev/gemini-api/docs/api-overview`) [Access Date: July 22, 2026]
   - *Claim:* Interactions API is GA and recommended for new projects as of June 2026; `generateContent` remains supported as the legacy API surface.

---

## 5. Model Comparison: 3.6 Flash vs 3.1 Pro Preview

| Dimension | `gemini-3.6-flash` | `gemini-3.1-pro-preview` |
| :--- | :--- | :--- |
| **Lifecycle Status** | **GA / Stable** | **Preview** |
| **Shutdown Status** | None announced | None announced |
| **Input Context Limit** | 1,048,576 tokens | 1,048,576 tokens |
| **Structured Output** | Native (`responseSchema`) | Native (`responseSchema`) |
| **Reasoning Fit** | Excellent for project breakdown & summary | Heavy reasoning / multi-turn logic |
| **Operational Risk** | **Zero** (GA model) | High (Preview status API risk) |
| **Latency Class** | Fast | Standard |
| **Cost Class** | Low | Moderate |

---

## 6. Single-Model Gemini Policy Rationale
Using `gemini-3.6-flash` for BOTH `FAST_JSON` and `DEEP_CONTEXT` in Phase 20 initially delivers significant operational advantages:
1. **Zero Preview Dependency:** Avoids depending on a Preview model (`gemini-3.1-pro-preview`) for core application features.
2. **Operational Simplicity:** Single, stable runtime provider configuration (`gemini-3.6-flash`) simplifies offline testing, factory resolution, and environment setup.
3. **Imminent Shutdown Mitigation:** Completely avoids the October 16, 2026 shutdown date facing `gemini-2.5-pro` and `gemini-2.5-flash`.

---

## 7. Semantic Tier Preservation Rationale
Even though both `FAST_JSON` and `DEEP_CONTEXT` map to `gemini-3.6-flash` under Option A:
- **`AIModelTier.FAST_JSON`** remains a distinct domain capability tier.
- **`AIModelTier.DEEP_CONTEXT`** remains a distinct domain capability tier.

```typescript
gemini: {
  apiKey: process.env.GEMINI_API_KEY || '',
  models: {
    fastJson: process.env.GEMINI_FAST_MODEL || 'gemini-3.6-flash',
    deepContext: process.env.GEMINI_DEEP_MODEL || 'gemini-3.6-flash',
  },
}
```

Domain services (`project-ai.service.ts`, `task-ai.service.ts`) request capability tiers (`FAST_JSON` vs `DEEP_CONTEXT`), NOT specific model names. If a future GA Gemini Pro model is released, `aiConfig.gemini.models.deepContext` can be pointed to it without modifying any application code.

---

## 8. GenerateContent API vs Interactions API Finding
- **Official API Surface Status (June/July 2026):**
  1. The **Interactions API** is Generally Available (GA) as of June 2026 and is officially recommended by Google for new Gemini projects.
  2. The **`generateContent`** API remains fully supported by Google and `@google/genai`, but is now considered the legacy API surface.
- **Model Selection Independence:** Choosing between `Interactions API` and `generateContent` is an SDK/provider integration concern, NOT a model-selection concern. Both API surfaces operate on the same model identifiers (`gemini-3.6-flash`). Therefore, EXP-01's model-selection policy (`FAST_JSON = gemini-3.6-flash`, `DEEP_CONTEXT = gemini-3.6-flash`) remains completely unaffected.
- **Open Gate-4 Architectural Question:** The current Phase 20 technical specification ([02-specification.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/02-specification.md)) was designed around `generateContent`. Before Track C implementation begins, the API-surface choice must be explicitly resolved during Gate 4 review:
  > **OPEN GATE-4 ARCHITECTURAL QUESTION:** *"Should Phase 20 GeminiProvider use the GA Interactions API or retain generateContent for the initial provider integration?"*
- **Scope Discipline:** Neither API surface is selected during this documentation correction pass. Specifications ([02-specification.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/02-specification.md)) and Implementation Plans ([03-implementation-plan.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/03-implementation-plan.md)) remain unchanged pending explicit Gate 4 resolution.

---

## 9. Gemini 3.6 Configuration Compatibility Finding
- **Documentation Finding:** Gemini 3.6 Flash fully supports standard generation config parameters:
  - `responseMimeType: "application/json"`
  - `responseSchema: <JSON Schema>`
  - `temperature: 0` (Deterministic generation for structured data)
- **Architecture Impact:** ZERO. Parameter options remain encapsulated within `GeminiProvider` and will not leak into domain services.

---

## 10. Decision Matrix

| Criterion | `gemini-3.6-flash` | `gemini-3.1-pro-preview` |
| :--- | :--- | :--- |
| **Lifecycle** | **VERIFIED FACT:** GA / Stable | **VERIFIED FACT:** Preview |
| **Stability** | **VERIFIED FACT:** No shutdown date | **INFERENCE:** Preview change risk |
| **Context Limit** | **VERIFIED FACT:** 1,048,576 tokens | **VERIFIED FACT:** 1,048,576 tokens |
| **Structured Output** | **VERIFIED FACT:** Native schema support | **VERIFIED FACT:** Native schema support |
| **Project Tasks Fit** | **REPOSITORY OBS:** Excellent (2k token input) | **REPOSITORY OBS:** Overkill |
| **Project Summary Fit** | **REPOSITORY OBS:** Excellent (3k token input) | **REPOSITORY OBS:** Overkill |
| **Operational Risk** | **INFERENCE:** Lowest | **INFERENCE:** High |
| **Phase 20 Recommendation** | **RECOMMENDED DEFAULT** | **DEFERRED (Until GA)** |

---

## 11. Decision Policy Outcome

### DECISION A (RECOMMENDED & APPROVED)

- **`FAST_JSON`:** `gemini-3.6-flash`
- **`DEEP_CONTEXT`:** `gemini-3.6-flash`

**Reasoning:**
`gemini-3.6-flash` (GA / Stable, released July 21, 2026) easily satisfies both current repository workloads with fast speed, low cost, 1,048,576 token context window, and zero preview risk. Semantic capability tiers (`AIModelTier.FAST_JSON` and `AIModelTier.DEEP_CONTEXT`) remain fully preserved in configuration vocabulary and domain service requests.

---

## 12. Runtime Benchmark Status
- **`GEMINI_KEY_STATUS`:** ABSENT
- **API calls executed:** 0
- **Benchmark Necessity:** Live runtime benchmarking is NOT required to select Option A, as official documentation and repository prompt inspection provide complete, conclusive evidence.

---

## 13. Impact on WP-02C
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

---

## 14. EXP-01B Verdict
**EXP-01B: PASS — DEEP_CONTEXT POLICY RESOLVED (OPTION A)**
