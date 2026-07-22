# Phase 20 — Multi-Provider AI Architecture + Gemini Integration

## Investigation Report (Corrected)

**Status of this document:** This is an _independent research review and correction_ of a prior repository-aware investigation. It was produced without direct repository access. All repository-specific claims below are carried over from the repository-aware agent's original `01-investigation.md` and are explicitly marked as such. All external (Gemini/Anthropic SDK, model lifecycle, API behavior) claims have been independently re-verified against current official documentation as of **July 22, 2026** and corrected where the original investigation was stale, overconfident, or unverifiable.

**Governing contract:** `00-contract.md` (Gate: Investigation / READ-ONLY only). Nothing in this document authorizes implementation.

---

### 1. Executive Summary

The original investigation's _repository_ findings (domain isolation, eager provider instantiation, hardcoded model strings, prompt portability, Zod validation boundary) are structurally sound and are preserved below, sourced back to the original document since they cannot be independently re-verified without repository access.

The original investigation's _external_ (Gemini) research contained several material problems that this correction fixes:

1. **The SDK's primary API surface is changing.** The original investigation described only `ai.models.generateContent(...)`. As of June 22, 2026, Google has moved the **Interactions API** to General Availability and now recommends it for _all new projects_; `generateContent` is now labeled **legacy** (still fully supported, still receiving new mainline models, but no longer the default recommendation). This is a load-bearing fact for a _new_ integration being designed in July 2026 and was entirely absent from the original investigation. **VERIFIED CURRENT FACT.**
2. **The recommended model lineup is out of date.** The original investigation recommends `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-2.5-flash-lite` as primary or alternative candidates. Google's official deprecation page confirms the entire Gemini 2.5 family is deprecated, with a minimum shutdown date of **October 16, 2026** on the Agent Platform (Vertex) track, and the 2.5 family is being superseded by Gemini 3.x across the board. Recommending 2.5-series models as the _primary_ choice for a brand-new July 2026 integration is not sound guidance. **VERIFIED CURRENT FACT, CORRECTS ORIGINAL.**
3. **"Gemini 3.6 Flash" cannot yet be confirmed as a stable, generally available model.** Independent research found conflicting signals: some sources describe it as an unannounced identifier (`gemini-3.6-flash-tiered`) sighted only inside Google's Antigravity IDE on July 21, 2026, with no model card, pricing, or official documentation; other very recent sources (dated "1 day ago" relative to this review) describe it as GA with an official changelog entry. Google's own `ai.google.dev` changelog page, as fetched directly, is cached as of June 1, 2026 and does **not** yet list Gemini 3.6 Flash; its live navigation still reads "Current: Gemini 3.5." **This is classified as IMPLEMENTATION EXPERIMENT REQUIRED / UNCONFIRMED, not a fact to build on.** The safe, currently-confirmed frontier Flash model is **`gemini-3.5-flash`** (GA May 19, 2026, no shutdown date announced), with **`gemini-3.1-flash-lite`** as the confirmed cost-tier option and **`gemini-3.1-pro-preview`** as the confirmed reasoning-tier option (Gemini 3.5 Pro was not found to be GA at investigation time).
4. **Structured output mechanics were partially right but incomplete.** `responseMimeType` + `responseSchema` (or `responseJsonSchema`) are real, current, officially documented fields on `GenerateContentConfig`, and the SDK **does** support deriving the schema from a Zod definition — either via Zod v4's native `z.toJSONSchema()` or the community `zod-to-json-schema` package feeding `responseSchema`/`responseJsonSchema`. The original investigation asserted this compatibility correctly in spirit but did not identify the _actual_ conversion mechanism, incorrectly implying Gemini "natively" consumes Zod objects with no conversion step.
5. **Timeout/cancellation support is real and verifiable**: `GenerateContentConfig` officially exposes an `abortSignal?: AbortSignal` field, confirming standard `AbortController`-based cancellation is supported — the original investigation asserted this existed but did not cite the actual field.
6. **Safety-block representation is a legitimate structural concern the original investigation underplayed.** Blocked or filtered generations are represented via `promptFeedback.blockReason` (prompt-level block) and per-candidate `finishReason` (e.g., a safety-related stop before a full JSON payload is produced) rather than as a thrown SDK exception in all cases. This means a "successful" SDK call can still return no usable JSON candidate — a distinct failure mode from `JSON.parse` failure that the provider boundary must be able to distinguish. The original investigation collapsed this into generic "error mapping" without noting that safety blocks may not throw at all.
7. **Package/SDK identity was correct.** `@google/genai` remains the official, actively maintained Node/TS SDK; `@google/generative-ai` remains deprecated. This part of the original investigation is confirmed.
8. **The repository-side findings are preserved essentially unchanged** — domain isolation, eager instantiation, hardcoded model config, prompt portability, and the Zod validation boundary — because this review has no independent means to verify or refute them and the original investigation's account of them is internally consistent and appropriately evidenced (specific files/line ranges cited).

Net effect: the architectural _shape_ of the original investigation's recommendation (thin provider abstraction, factory/resolver, lazy instantiation, Zod remains the trust boundary, `AI_PROVIDER` env selection, no automatic failover) is corrected as still sound. What changes is (a) which Gemini API surface and models to target, (b) how much confidence to place in specific claims, and (c) explicit identification of several items that require hands-on experimentation before specification, which the original investigation had incorrectly marked as fully resolved.

---

### 2. Contract Constraints

Carried over from `00-contract.md`, unchanged:

- This is a **READ-ONLY investigation**. No code, config, dependency, test, or CI changes are authorized.
- Scope is limited to establishing genuine multi-provider architecture with Gemini as a second provider, preserving the three existing AI capabilities (task generation, task auto-labeling, project summary generation), and preserving the Zod-based trust boundary.
- Explicitly **out of scope**: automatic failover, dynamic/cost-based routing, provider racing, streaming UI, RAG/embeddings/vector DB, OpenAI or local model integration, prompt management platforms, and any refactor unrelated to provider independence.
- Gate 1 (this document) is followed by a STOP for human review before any specification work begins.

---

### 3. Current Repository Architecture

_(Carried forward from repository evidence in the original `01-investigation.md`. Not independently re-verified — classified below as_ **REPOSITORY EVIDENCE, AS SUPPLIED**._)_

```
Client → Express Route → Controller → Domain AI Service → AIService (singleton)
    → PromptRegistry / PromptBuilder → AnthropicProvider → Anthropic SDK → Claude API
    → validateAIResponse (Zod safeParse) → Domain Service → Persistence
```

Key components as reported:

| Component                          | Path (as reported)                                  | Responsibility                                                 |
| ---------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `AIProvider` contract              | `server/src/ai/providers/base.provider.ts`          | `generateStructured<T>(prompt, schema, options): Promise<T>`   |
| `AnthropicProvider`                | `server/src/ai/providers/anthropic.provider.ts`     | Concrete Anthropic SDK wrapper                                 |
| `AIService`                        | `server/src/ai/ai.service.ts`                       | Facade: prompt build, provider invocation, validation, logging |
| `PromptRegistry` / `PromptBuilder` | `server/src/ai/prompts/**`                          | XML-tagged prompt assembly                                     |
| Response validator                 | `server/src/ai/validation/ai-response.validator.ts` | Zod `safeParse` boundary                                       |
| AI logger                          | `server/src/ai/utils/logger.ts`                     | Structured execution telemetry                                 |

This structure is plausible and internally consistent with the three documented AI runtime flows (task generation, auto-labeling, summary generation) also carried forward unchanged from the original document, since they are pure repository evidence this review cannot independently check.

**Classification: REPOSITORY VERIFICATION REQUIRED for exact current line numbers and symbol names** — treat file:line references in the original investigation as _approximately_ accurate pointers, not guaranteed-current citations, since repository state may have moved since that investigation ran.

---

### 4. Existing Provider Boundary

The `AIProvider` interface as reported:

```typescript
export interface AIProvider {
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions,
  ): Promise<T>;
}
```

**Assessment (architectural reasoning, not new repository evidence):** This shape is provider-neutral on its face — it takes a prompt string, a Zod schema, and options, and returns typed data. That's a reasonable contract to keep. Two things worth flagging for specification (not resolving here):

- The interface accepts a single fully-assembled `prompt: string`. This is compatible with Gemini's `contents` field, but Gemini's config also supports a separate `systemInstruction` field. Whether `GeminiProvider` should extract a system section from the assembled prompt or send it as one undifferentiated block is a **SPECIFICATION DECISION** (see Section 10 — Prompt Parity Analysis). The interface itself does not need to change either way.
- `AIRequestOptions` (`tier`, `timeoutMs?`) is provider-neutral in name but its _values_ currently resolve to Anthropic-specific model strings per the original investigation's coupling audit (Section 5 below). That resolution logic, not the interface, is where the coupling lives.

---

### 5. Anthropic Coupling Audit

_(Carried forward as REPOSITORY EVIDENCE, AS SUPPLIED, from the original investigation's "Provider Coupling Inventory" and "AnthropicProvider Audit" sections.)_

| Location (as reported)               | Coupling type          | Evidence (as reported)                                           |
| ------------------------------------ | ---------------------- | ---------------------------------------------------------------- |
| `AIService` constructor              | Architectural coupling | `this.provider = new AnthropicProvider();` — eager instantiation |
| `resolveModelFromTier`               | Configuration coupling | Resolves Anthropic-only model names for both tiers               |
| `ai.config.ts: aiConfig.provider`    | Configuration coupling | Hardcoded string `'anthropic'`                                   |
| `ai.config.ts: aiConfig.models`      | Configuration coupling | Default values are Claude model strings                          |
| `server/package.json: scripts.smoke` | Test/CI coupling       | Smoke script hardcodes `ANTHROPIC_API_KEY`                       |
| `.github/workflows/ci.yml`           | CI coupling            | CI env hardcodes dummy Anthropic key                             |
| `execution.test.ts`                  | Test coupling          | Overwrites `.provider` _after_ real constructor already ran      |

**This audit is credible on its face** — it is specific (named symbols, described mechanism) and internally consistent with the eager-instantiation problem described elsewhere in the original document. It cannot be independently confirmed without repository access and is retained as supplied evidence, not as this review's own finding.

One internal-consistency check worth noting for the human reviewer: the original investigation states in its "Question 1" answer that the `AIProvider` interface itself contains "no Anthropic-specific types or assumptions," while separately stating the _constructor_ and _config_ layers are where coupling lives. These two claims do not contradict each other, but a repository-aware reader should confirm this distinction survives scrutiny — that no Anthropic-shaped assumption (e.g., "prompt goes in as one big user message with no system separation," "output is always one JSON blob with no `finishReason`-style partial/blocked state") is silently baked into `AIService`'s _use_ of the interface, even if the interface signature itself is clean. This is flagged as **REPOSITORY VERIFICATION REQUIRED**, not asserted either way.

---

### 6. Current AI Execution Flows

_(Carried forward unchanged as REPOSITORY EVIDENCE, AS SUPPLIED — Project Task Generation, Task Auto-Labeling, Project Summary Generation. See the original investigation's flow diagrams; not reproduced here to avoid restating unverifiable detail without adding value. The key structural fact used throughout this document is: all three flows route through `aiService.generateStructuredData(template, schema, { tier })`, which is the single choke point where provider selection must be introduced.)_

---

### 7. Gemini SDK Research (Independently Re-Verified)

**Package identity — VERIFIED CURRENT FACT.**
`@google/genai` ("Google Gen AI SDK") is the official, actively maintained Node.js/TypeScript SDK from Google, currently at major version 2.x, with frequent releases. It targets Gemini 2.0+ and covers both the Gemini Developer API and the Gemini Enterprise Agent Platform (the April 2026 rebrand of Vertex AI). The legacy `@google/generative-ai` package is explicitly marked deprecated by Google in its own repository, directing developers to migrate to `@google/genai`. **The original investigation's conclusion here (use `@google/genai`, avoid `@google/generative-ai`) is CONFIRMED.**

**API surface — CORRECTS ORIGINAL, VERIFIED CURRENT FACT.**
As of June 22, 2026, Google's **Interactions API** reached General Availability and is now described in official documentation as "the best way to build with Gemini models and agents," recommended for **all new projects**. The original `generateContent` API:

- Remains fully supported and will continue to receive new mainline Gemini models.
- Is now explicitly labeled **legacy** in Google's own docs, with documentation pages carrying a toggle between "generateContent" and "Interactions API" versions of the same content.
- Is explicitly still the _recommended path for stable production deployments_ per Google's own generateContent reference page ("For production workloads, you should continue to use the standard generateContent API... we will continue to actively develop and maintain it").

This is a nuanced, slightly self-contradictory pair of signals from Google itself: Interactions is "recommended for new projects" architecturally, but `generateContent` is "recommended... for stable deployments" operationally. Given that:

- The Interactions API is explicitly still described by third-party trackers as **Beta**, with schemas that have already had at least one breaking change (May 2026) and are noted as "subject to breaking changes."
- Phase 20's contract explicitly excludes streaming UI, agentic orchestration, and persistent conversational state — precisely the capabilities the Interactions API adds (`previous_interaction_id`, background execution, observable execution steps, managed agents).
- The application's current three AI capabilities are single-turn, stateless, structured-JSON generations — exactly generateContent's use case.

**RECOMMENDATION (not a fact — flagged as an architectural recommendation, not certainty):** Target the `generateContent` API surface (`ai.models.generateContent(...)`) for `GeminiProvider` in Phase 20, not the Interactions API. This preserves parity with the existing stateless, single-turn `AnthropicProvider` contract, avoids taking a dependency on a Beta API with an unstable schema, and matches Google's own "stable deployments" guidance. Re-evaluate the Interactions API in a later phase if/when agentic or multi-turn capabilities become in-scope. **This directly overturns nothing in the original investigation's code sample (which did use `generateContent`), but the original investigation never disclosed that Interactions API exists or that generateContent's status has shifted to "legacy" — that omission is corrected here because it materially affects the specification writer's confidence that `generateContent` is still the right choice, and why.**

**Initialization pattern — VERIFIED CURRENT FACT, minor correction.**

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash", // see Section 8 — do not default to 2.5-series
  contents: "Prompt content here",
  config: {
    systemInstruction: "System behavior instructions here", // optional; see Section 10
    responseMimeType: "application/json",
    responseSchema: {
      /* JSON Schema, or derived from Zod — see Section 9 */
    },
  },
});

const textOutput = response.text;
```

This matches the original investigation's sample almost exactly; the only correction is the default model string (see Section 8) and confirmation that `temperature`/`top_p`/`top_k` are now marked **deprecated** sampling parameters in Google's own June 1, 2026 changelog entry, which is new information not in the original investigation and may be relevant if `AnthropicProvider`-parity code currently sets `temperature: 0` for determinism — the Gemini equivalent should be re-verified against current parameter guidance rather than assumed. **IMPLEMENTATION EXPERIMENT REQUIRED.**

**Node/TypeScript support — VERIFIED CURRENT FACT.** The SDK is TypeScript-native, ships official type definitions, and is listed by Google alongside Python, Go, and Java as an official first-party library.

**Structured-output API — see Section 9.**

**Error behavior — see Section 12.**

**Timeout/cancellation — VERIFIED CURRENT FACT.** `GenerateContentConfig` exposes `abortSignal?: AbortSignal` directly, per the SDK's published TypeScript interface. Standard `AbortController`/`AbortSignal` cancellation is supported natively; there is no need to invent or infer a timeout mechanism. See Section 14.

**Production readiness guidance — VERIFIED CURRENT FACT.** Google's SDK documentation explicitly cautions against exposing API keys client-side and recommends server-side-only usage in production — consistent with the contract's existing security requirements and requiring no special handling beyond what's already true for `ANTHROPIC_API_KEY`.

---

### 8. Current Gemini Model Research (Independently Re-Verified — Corrects Original)

This section replaces the original investigation's model table, which recommended `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-2.5-flash-lite` as primary/alternative candidates. That table is now **OUTDATED**.

**Gemini 2.5 family status — VERIFIED CURRENT FACT.** Google's official deprecations page (`ai.google.dev/gemini-api/docs/deprecations`, last updated July 21, 2026) and multiple independent trackers confirm the entire Gemini 2.5 family (Pro, Flash, Flash-Lite) is on a deprecation track. On the Agent Platform (Vertex) track specifically, Google confirmed via direct developer communication a **minimum** shutdown date of **October 16, 2026**, explicitly described as "no earlier than" — the actual date is tied to Gemini 3's GA and will come with at least six months' additional notice once locked. Building a _brand-new_ Phase 20 integration in July 2026 around a family already mid-deprecation, with a shutdown horizon of roughly three months at minimum, is not sound for a system intended to be a durable second provider. **This directly contradicts the original investigation's primary recommendation of `gemini-2.5-pro`/`gemini-2.5-flash` and is the most significant correction in this document.**

**Gemini 3.x family status — VERIFIED CURRENT FACT (as of the models confirmed below).**

| Model                                                         | Status (per official changelog / deprecations page)                                                                                                                       | Notes                                                                                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gemini-3.5-flash`                                            | **GA**, released May 19, 2026. No shutdown date announced.                                                                                                                | Google's own description: "our most intelligent model for sustained frontier performance on agentic and coding tasks." Currently the flagship Flash-tier model. |
| `gemini-3.1-flash-lite`                                       | **GA**, released May 7, 2026. No shutdown date announced (one tracker cites a May 7, 2027 minimum).                                                                       | Optimized for speed/scale/cost. Successor to `gemini-2.5-flash-lite`.                                                                                           |
| `gemini-3.1-pro-preview`                                      | **Preview**, released Feb 19, 2026. No shutdown date announced.                                                                                                           | Current Pro-tier reasoning model at investigation time; no confirmed GA "3.x Pro" stable release was found.                                                     |
| `gemini-3-pro-preview`                                        | Deprecated/redirected — now points to `gemini-3.1-pro-preview` since March 9, 2026.                                                                                       | Do not target this identifier directly.                                                                                                                         |
| `gemini-3.6-flash`                                            | **UNCONFIRMED / CONFLICTING SIGNALS.**                                                                                                                                    | See callout below. **IMPLEMENTATION EXPERIMENT REQUIRED** before any reliance on this model.                                                                    |
| `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite` | **Deprecated family**, minimum shutdown Oct 16, 2026 (Agent Platform track); separate AI-Studio-track deprecation timeline also in effect per Google's deprecations page. | Do not select as the primary choice for a new July 2026 integration.                                                                                            |
| `gemini-2.0-flash*` family                                    | **Shut down June 1, 2026** per Google's official changelog.                                                                                                               | Fully retired; not viable at all.                                                                                                                               |

**Callout — Gemini 3.6 Flash status is genuinely unresolved by this research pass:**

- One class of sources (dated "1 day ago" relative to this review, i.e. ~July 21, 2026) describes `gemini-3.6-flash-tiered` as an _unannounced_ identifier spotted only inside Google's Antigravity IDE, with **no model card, no pricing, no context window, no benchmark, no Vertex/AI Studio listing, and no Google blog post** — explicitly "not officially released" as of that writing.
- A second, similarly-dated class of sources (including what purports to be Google's own `ai.google.dev/gemini-api/docs/changelog` content) describes `gemini-3.6-flash` and `gemini-3.5-flash-lite` as newly **GA**, with a changelog entry describing improved token efficiency and agentic/coding planning at a lower price point than 3.5 Flash.
- This review directly fetched `ai.google.dev/gemini-api/docs/changelog` and received a version of the page **cached as of "Last updated 2026-06-01 UTC"** with no Gemini 3.6 Flash entry, and with live navigation still reading "Current: Gemini 3.5" — i.e., the authoritative source itself did not corroborate GA status at fetch time, likely due to caching or a very recent (within-the-last-day) rollout that has not fully propagated.

**Classification: IMPLEMENTATION EXPERIMENT REQUIRED.** Before specification, re-fetch `ai.google.dev/gemini-api/docs/models` and `ai.google.dev/gemini-api/docs/changelog` directly (or run a live `ai.models.list()` call against the Gemini API with a real key) to determine Gemini 3.6 Flash's actual current status, pricing, and context window before deciding whether it is a viable `DEEP_CONTEXT` or `FAST_JSON` candidate. **Do not hardcode `gemini-3.6-flash` into configuration based on this investigation alone.**

**Corrected model tier candidates:**

**FAST_JSON** (Task Auto-Labeling — low complexity, small context, latency-sensitive):

- Primary candidate: `gemini-3.1-flash-lite` — confirmed GA, explicitly positioned for speed/scale/cost-efficiency, direct successor to the deprecated `gemini-2.5-flash-lite`.
- Alternative candidate: `gemini-3.5-flash` (if flash-lite proves insufficiently reliable on strict JSON adherence during benchmarking).

**DEEP_CONTEXT** (Project Task Generation, Project Summary Generation — higher reasoning, larger context, structural synthesis):

- Primary candidate: `gemini-3.5-flash` — confirmed GA, Google's own description centers on "sustained frontier performance," and it is the safest currently-confirmed non-deprecated option with strong reasoning claims.
- Alternative candidate: `gemini-3.1-pro-preview` — confirmed to exist and be current, but is a **preview** model, which carries different (typically less strict) deprecation-notice guarantees than GA models per Google's own model-alias documentation ("preview models... will be deprecated with at least 2 weeks notice" vs. GA models' longer notice periods). A preview-tier model should not be the _primary_ choice for production DEEP_CONTEXT workloads without an explicit, documented risk acceptance.
- **Do not select `gemini-3.6-flash` as primary or alternative until its status is experimentally confirmed** (see callout above). If confirmed GA at specification time with a suitable context window and pricing, it becomes a strong DEEP_CONTEXT candidate given Google's stated positioning around "agentic and coding tasks" and "sustained frontier performance," but this cannot be asserted from this investigation alone.

**This is a SPECIFICATION DECISION, not a locked mapping** — per the contract's own instruction not to prematurely lock the tier mapping. The above is a defensible starting point for benchmarking, not a final answer.

---

### 9. Structured Output & Zod Compatibility (Independently Re-Verified)

**Core mechanism — VERIFIED CURRENT FACT.** Gemini models support constrained JSON generation via two `GenerateContentConfig` fields:

- `responseMimeType: "application/json"` — forces JSON-shaped output.
- `responseSchema` (accepts a JSON-Schema-like object, OpenAPI-subset dialect) — or `responseJsonSchema` (accepts stricter/fuller JSON Schema in some SDK paths) — constrains the shape of that JSON.

Both fields are present on the officially published `GenerateContentConfig` TypeScript interface, confirming the original investigation's core claim.

**Zod interoperability — CORRECTS ORIGINAL (adds missing mechanism).** The original investigation stated Gemini "supports" structured output compatible with the app's Zod schemas but did not identify _how_ a Zod schema becomes a Gemini-compatible schema. Independently verified: this is **not automatic/native** — a conversion step is required, and there are two current, real approaches:

1. **`zod-to-json-schema`** (community package): `zodToJsonSchema(mySchema)` produces a JSON Schema object, which is then passed into `config.responseSchema` (as shown in Google's own official structured-output documentation sample for the `generateContent` API, which explicitly imports and uses `zodToJsonSchema` from the `zod-to-json-schema` package).
2. **Native `z.toJSONSchema()`** (Zod v4+): if the application's Zod version is v4 or later, Zod itself now ships a built-in JSON Schema exporter, removing the need for the third-party package.

Google's own docs also state the GenAI SDKs "allow defining schemas using... Zod (JavaScript)" directly in some structured-output guide variants — but the concrete code sample in Google's own `generate-content/structured-output` reference page uses `zodToJsonSchema(...)` explicitly rather than passing a raw Zod object, which is the more conservative and currently-demonstrated pattern. **Treat "Gemini can consume a Zod schema directly with zero conversion" as unconfirmed; treat "Gemini can consume a JSON Schema derived from a Zod schema via `zodToJsonSchema` or `z.toJSONSchema()`" as VERIFIED CURRENT FACT.**

**Recommended pipeline (validates the contract's proposed pipeline as technically sound):**

```
Existing application Zod schema (single source of truth)
        │
        ▼
zodToJsonSchema(schema)  — or  z.toJSONSchema(schema) if on Zod v4+
        │
        ▼
config.responseSchema / config.responseJsonSchema  (Gemini request)
        │
        ▼
Gemini generateContent() call
        │
        ▼
response.text  →  JSON.parse()
        │
        ▼
Existing zodSchema.safeParse()   ← UNCHANGED, same boundary used for Anthropic today
        │
        ▼
Typed application data<T>
```

This is **technically sensible with the current SDK** and requires no change to the existing `validateAIResponse` boundary. The conversion step (`zodToJsonSchema` / `z.toJSONSchema`) belongs entirely inside `GeminiProvider` — it is provider-side output _shaping_, feeding Gemini's own generation constraints, and must not be treated as a substitute for the existing Zod `safeParse` step, which remains the application's trust boundary. **This distinction (provider-side shaping vs. application-side trust boundary) is explicitly preserved and is a correct architectural instinct in the original investigation — this section only strengthens it with the actual conversion mechanism.**

**Schema limitations — IMPLEMENTATION EXPERIMENT REQUIRED, not previously identified in the original investigation.** Because Gemini's `responseSchema` uses an OpenAPI-subset schema dialect rather than full JSON Schema, and third-party guidance explicitly warns that "Gemini rejects unsupported keywords silently-ish," the following must be verified experimentally against each of the three application response schemas before specification is finalized:

- Deeply nested object/array structures (the task-generation and summary schemas both appear, per the repository evidence, to involve arrays of objects with several fields — this is a plausible risk area).
- Optional field handling (`z.optional()` semantics vs. `required` arrays in the target dialect).
- Enum handling (labels/priorities/statuses, which the repository evidence indicates are used).
- Any Zod refinements, transforms, or unions in the existing schemas that don't have a clean JSON Schema equivalent.
- `propertyOrdering` — a Gemini-specific hint with no Anthropic equivalent, which may need explicit handling for deterministic field order but is optional.

**Do not assume the existing three Zod schemas will convert and validate cleanly with zero adjustment.** This must be an explicit line item in the implementation experiment backlog (Section 22).

---

### 10. Prompt Parity Analysis

Per contract Section 9, this section evaluates system-instruction extraction rather than assuming it.

**APPROACH A — Send the fully assembled XML-tagged prompt unchanged, as a single content block (no `systemInstruction` extraction).**

- Behavioral parity: Highest. Byte-for-byte (modulo provider formatting instruction differences) identical logical input to both providers.
- Provider neutrality: Highest — `GeminiProvider` and `AnthropicProvider` both receive and forward the same string; neither needs prompt-structure-aware parsing logic.
- Semantic differences: None introduced.
- Testing burden: Lowest — existing prompt tests (`PromptRegistry`/`buildPrompt`, reported as "100% Provider-Independent" in the original investigation) remain valid unchanged for both providers.
- Architectural coupling: None — no provider needs to understand the `<system>`/`<context>`/`<intent>`/`<schema>` tag structure.
- Future maintainability: High — a third provider can be added the same way with zero prompt-parsing work.

**APPROACH B — Parse the `<system>` section out of the assembled prompt and pass it via Gemini's native `systemInstruction` config field.**

- Behavioral parity: **Not guaranteed identical.** System instructions and user content are processed differently by the model depending on how the provider's serving stack weights/positions them internally — this is exactly the kind of provider-specific behavior the contract asks to keep behind the boundary, but extraction risks introducing new, Gemini-specific behavior into what's supposed to be a parity test.
- Provider neutrality: Lower — `GeminiProvider` (and only `GeminiProvider`) now needs prompt-structure-aware parsing logic (finding and stripping a `<system>...</system>` block) that `AnthropicProvider` does not have and never needed.
- Semantic differences: **Likely.** Extracting `<system>` changes what the model receives as "system-level" framing vs. "user-level" content — this is a semantic change, not a formatting change, and the contract explicitly says to flag this if true.
- Testing burden: Higher — needs Gemini-specific tests for correct extraction, plus behavioral comparison testing to confirm output quality/shape doesn't regress relative to the unified-prompt approach.
- Architectural coupling: Higher — couples `GeminiProvider` to the _specific_ XML tag names/structure the prompt builder currently happens to emit, which is otherwise treated as an internal implementation detail of `PromptBuilder`.
- Future maintainability: Lower — if `PromptBuilder`'s tag structure changes for unrelated reasons, `GeminiProvider`'s extraction logic silently breaks or silently stops finding a system section.

**Recommendation:** Favor **Approach A** for Phase 20. It directly serves the contract's stated goal of "provider parity with minimal semantic drift" and keeps the provider boundary thin, matching the "smallest architecture that satisfies the contract" instruction elsewhere in the contract. Approach B optimizes for a Gemini-native feature that Phase 20 does not need and that introduces exactly the kind of provider-specific behavioral drift the contract is trying to avoid. If a future phase determines system-instruction separation meaningfully improves output quality or cost (system-instruction tokens are sometimes priced or cached differently), that can be revisited with real before/after evidence — not speculatively adopted now.

**Classification: SPECIFICATION DECISION**, with a stated recommendation (Approach A) rather than an assumed default. The original investigation's compatibility matrix listed "`GeminiProvider` extracts system section" under "Architectural Action" as if this were settled — **that overstated confidence is corrected here.**

---

### 11. Provider Construction & Configuration

_(Architectural reasoning building on the repository evidence in Section 5; this reasoning is sound regardless of exact repository line numbers.)_

**Constraint from contract Section 7.7 and Section 12 (Initialization and Configuration):** Selecting `AI_PROVIDER=gemini` must not require `ANTHROPIC_API_KEY`, and vice versa.

**Given the reported eager-instantiation pattern** (`AIService` constructor directly calling `new AnthropicProvider()`, which itself validates its own API key in its constructor), the only way to satisfy this invariant is for provider construction to become **lazy and selective** — the _unselected_ provider's class must never be instantiated (and therefore never validate its credentials) during application startup, smoke test, or CI.

**Architectural options (evaluated against "smallest abstraction that solves the problem," per contract Section 7.1 and Section 10 of the original investigation):**

- **Option A — inline conditional in `AIService` constructor.** Smallest possible diff, but keeps provider selection logic inside a class whose job is orchestration, not construction — mild SRP violation, and harder to unit-test provider-selection logic in isolation from `AIService`'s other responsibilities.
- **Option B — small factory/resolver function** (e.g., `createAIProvider(config): AIProvider` or a tiny `AIProviderFactory`). Matches contract Section 10's own suggested `createAIProvider(config)` pattern almost exactly. Small, testable in isolation, and defers construction until explicitly requested rather than at module-import time.
- **Option C — full DI container** (InversifyJS, TSyringe, etc.). Explicitly over-engineered for a two-provider system per the contract's own instruction not to build for a hypothetical twenty providers.

**Recommendation: Option B**, consistent with both the contract's own suggested pattern and the original investigation's conclusion. This is the one part of the original investigation's architectural reasoning that required no correction — it was already appropriately conservative and directly responsive to the contract's explicit guidance.

**Configuration validation shape (reasoning, not repository-verified):** Credential validation should be conditional on the resolved `AI_PROVIDER` value, not unconditional — i.e., the code path that checks for `GEMINI_API_KEY` should only execute when `AI_PROVIDER=gemini` is selected, and must not execute (and must not throw) when `AI_PROVIDER=anthropic` is selected, and vice versa. This is a **SPECIFICATION DECISION** on exact mechanism (e.g., validated inside `aiConfig` at load time vs. inside the factory at construction time), but the _invariant_ itself is a hard contract requirement, not optional.

---

### 12. Error Normalization Research (Independently Re-Verified)

**What is verifiable from official sources today:**

- Gemini responses carry a `promptFeedback.blockReason` field (values include at least `SAFETY`, `OTHER`, `BLOCKLIST`, `PROHIBITED_CONTENT`, `JAILBREAK`, `MODEL_ARMOR` per Google's protobuf-derived API reference) representing a **prompt-level block** — the request was rejected before generation, and this is reflected in the response object's `promptFeedback`, not necessarily as a thrown exception in every SDK surface.
- Per-candidate `finishReason` values (distinct from `blockReason`) represent why _generation_ stopped for a given candidate — this can include safety-related early stops distinct from a clean completion, meaning a response can come back "successfully" at the network/SDK level while still containing no usable JSON payload.
- `GenerateContentConfig.abortSignal` confirms standard cancellation support (Section 14).

**What is not fully confirmed and should not be asserted as fact:** The _exact_ JS/TS exception class hierarchy the current `@google/genai` SDK throws for authentication failure, rate limiting, and generic API errors was not independently confirmed with the same level of certainty as the Anthropic SDK's documented `APIConnectionTimeoutError`/`AuthenticationError`/`RateLimitError`/`APIError` classes (which the original investigation's `AnthropicProvider` audit describes as already being mapped in the existing code). The original investigation asserted a full symmetric error-mapping table (`AIConfigurationError`, `AITimeoutError`, `AIProviderError`) for Gemini without citing SDK-specific exception types. That table is a reasonable _target shape_ for the mapping, but the specific Gemini-side exceptions/status codes that should map to each domain error should be confirmed by writing a small experimental script against the real SDK (with a throwaway key) rather than assumed. **Classification: IMPLEMENTATION EXPERIMENT REQUIRED** for exact Gemini-side error/exception shapes; the _target_ domain error hierarchy (`AIConfigurationError` / `AITimeoutError` / `AIProviderError` / `AIValidationError`) is a sound, already-established internal contract per the repository evidence and needs no change.

**One specific correction to the original investigation's Risk Register:** The original investigation frames "Gemini JSON codeblock formatting" (Gemini wrapping JSON in markdown fences) as a risk requiring regex fence-stripping parity with `AnthropicProvider`. This is a reasonable defensive measure, but it is **secondary** to the more structurally important error case identified above: a safety-blocked or early-stopped generation may return **no text at all** (or empty/partial text), which is a different failure mode than "text present but wrapped in fences." `GeminiProvider`'s response-handling logic needs to explicitly check for the blocked/incomplete case _before_ attempting fence-stripping and `JSON.parse`, or a blocked generation could produce a confusing `AIValidationError` (JSON parse failure) when the more accurate and actionable error would be something like "provider declined to generate" (mappable to `AIProviderError` with a safety-block-specific message). This distinction was not present in the original investigation and is a legitimate correction.

---

### 13. Safety Behavior (Independently Re-Verified)

- Blocked generations are represented structurally in the response object (`promptFeedback.blockReason` for prompt-level blocks; per-candidate `finishReason` for generation-level stops), not solely via thrown exceptions — confirmed above.
- Safety metadata (`safetyRatings`) is available alongside block reasons in the response, giving the provider layer enough signal to distinguish "the model was blocked" from "the model produced malformed JSON" — these are different problems requiring different handling and different domain error types.
- **What requires hands-on experimentation rather than documentation-only confirmation:** the _exact_ shape of `response.text` (or equivalent SDK accessor) when a candidate is blocked — whether it's `undefined`, an empty string, or throws when accessed — was not confirmed with certainty from documentation alone. **Classification: IMPLEMENTATION EXPERIMENT REQUIRED.** This is exactly the kind of runtime-shape question the contract's own Section 15 unknown #9 (does Gemini support required structured-output behavior) and the implementation experiment backlog are meant to surface, and the original investigation had marked all "Contract Unknowns" as fully "ANSWERED" — that blanket closure was premature for this specific item.

---

### 14. Timeout / Cancellation Research (Independently Re-Verified — Confirms and Sharpens Original)

**VERIFIED CURRENT FACT:** `GenerateContentConfig` (the config object passed to `ai.models.generateContent(...)`) has a published `abortSignal?: AbortSignal` field. This means `GeminiProvider` can implement timeout behavior using the same idiomatic pattern as any modern fetch-based Node client:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);
try {
  const response = await ai.models.generateContent({
    model,
    contents,
    config: { ...otherConfig, abortSignal: controller.signal },
  });
  return response;
} finally {
  clearTimeout(timeout);
}
```

This gives `GeminiProvider` a direct, idiomatic path to the same `timeoutMs`-driven behavior `AIRequestOptions` already exposes provider-neutrally, without needing any Gemini-specific timeout config field. **This confirms behavioral parity is achievable** and slightly strengthens the original investigation's claim (which asserted "AbortSignal / SDK timeout option" existed but did not cite the specific field name/interface).

---

### 15. Testing & CI Constraints

_(Architectural reasoning consistent with the repository evidence in Section 5 and Section 6; the underlying facts about existing test structure are REPOSITORY EVIDENCE, AS SUPPLIED and are not independently re-verified here.)_

Given eager instantiation is reported to currently force `ANTHROPIC_API_KEY` to be present even for smoke tests and module import, and given the contract's hard requirement that CI never make real paid calls to either provider:

- **Provider contract tests** should exercise `AIProvider`-conformance for both concrete providers against a shared test suite (same inputs, same expected shape of outputs/errors), using constructor-injected fakes/mocks for the underlying SDK client (`Anthropic` / `GoogleGenAI`) rather than real network calls — this is a natural extension of the existing `MockProvider`-injection pattern reported in `execution.test.ts`, not a new testing paradigm.
- **Gemini-specific provider unit tests** need mocked `GoogleGenAI`/`ai.models.generateContent` responses covering: a normal successful JSON response, a fenced/markdown-wrapped JSON response, a `promptFeedback.blockReason`-carrying response with no usable candidate, a `finishReason`-truncated response, and a thrown network/auth error — this list is broader than the original investigation's testing section, which only mentioned "JSON cleaning, error translation, and option handling" without enumerating the safety-block and truncation cases identified in Sections 12–13 above.
- **Smoke/CI invariant:** once provider construction is lazy and selective (Section 11), the smoke script and CI workflow need a dummy key **only for whichever provider is selected** by the active `AI_PROVIDER` value in that environment — not both unconditionally. Whether CI should run the smoke test once per provider (matrix) or just once against a default provider is a **SPECIFICATION DECISION**, not resolved by this investigation.
- This document does **not** design the final test suite — per contract Section 17 ("DO NOT... modify tests"), this is scoped to identifying testing _requirements and gaps_, not implementing them.

---

### 16. Observability Considerations

_(Reasoning built on repository evidence reported in the original investigation's logger/observability sections.)_

If `resolveModelFromTier` currently hardcodes Anthropic model name strings for logging purposes (as reported), the minimum necessary change for Phase 20 is for model-name resolution to become provider-aware — i.e., look up the _active_ provider's configured model string for the given tier, rather than always returning an Anthropic string regardless of which provider actually executed the call. This is required simply to keep existing log fields (`provider`, `model`) truthful once a second provider exists; it is not a telemetry overhaul and stays well within the contract's explicit non-goal of building an AI observability platform. No new log fields are required by Phase 20 beyond what's already reported to exist (`provider`, `model`, `promptName`, `executionTimeMs`, `success`) — those fields already answer the questions contract Section 13 poses ("which provider," "which model," "which capability," "success/failure," "how long").

---

## 17. Hidden Provider Coupling Audit

**CONFIRMED FROM PROVIDED REPOSITORY EVIDENCE** (i.e., explicitly stated as such in the original investigation, and internally consistent with the rest of that document):

- `AIService` constructor directly instantiates `new AnthropicProvider()` — architectural coupling.
- `aiConfig.provider` is a hardcoded string literal `'anthropic'` — configuration coupling.
- `aiConfig.models` defaults are Claude-specific model identifiers — configuration coupling.
- `server/package.json`'s `smoke` script hardcodes `ANTHROPIC_API_KEY` — CI/test coupling.
- `.github/workflows/ci.yml` hardcodes a dummy Anthropic key — CI coupling.
- `execution.test.ts` overwrites `.provider` _after_ the real `AnthropicProvider` constructor has already executed once — test coupling, and independently corroborates the eager-instantiation problem (a test needing to override an already-constructed dependency is a classic symptom of non-lazy construction).
- Domain services (`project-ai.service.ts`, `task-ai.service.ts`, `project-summary-ai.service.ts`) reportedly import only `aiService`, `AIModelTier`, `promptRegistry`, and Zod schemas — no Anthropic-specific imports.
- Prompt definition files reportedly contain no vendor-specific strings ("Claude," "Anthropic," "Human:," "Assistant:").

**REQUIRES REPOSITORY VERIFICATION** (plausible based on the pattern described, but not independently confirmable without repository access, and not explicitly addressed with the same evidentiary specificity as the items above):

- Whether any test file instantiates `AnthropicProvider` (the _real_ class, not a mock) anywhere outside the reported `execution.test.ts` override pattern, which would constitute an import-time side effect risk even under a lazy-factory refactor.
- Whether `AIRequestOptions` or any type in the shared `ai/` module tree has any field, comment, or default value implicitly shaped around Anthropic's response format (e.g., an assumption that output is always a single complete JSON blob with no possibility of a partial/blocked state) — flagged in Section 5 above as worth an explicit second look given the new safety-block/finishReason findings in Sections 12–13.
- Whether any logging, error-formatting, or client-facing message string anywhere in the codebase (not just `server/src/ai/`) contains the word "Claude," "Anthropic," or a Claude-specific model name outside the provider/config files already audited — e.g., in API error messages surfaced to the frontend, or in documentation strings.
- Whether `.env.example` or any deployment/infra config (outside what was already inspected) references Anthropic-specific variable names in a way that would need a parallel Gemini entry.

---

## 18. Recommended Architectural Direction

Unchanged in shape from the original investigation, and independently assessed here as sound against the contract's stated preferences ("smallest architecture," "no enterprise abstractions," "no automatic failover"):

```
Domain AI Services
        │
        ▼
     AIService  ──────────────►  AIProviderFactory (lazy resolver)
        │                                │
        ▼                     ┌──────────┴──────────┐
Provider Abstraction          ▼                      ▼
 (AIProvider interface)  AnthropicProvider      GeminiProvider
                               │                      │
                               ▼                      ▼
                         Anthropic SDK          @google/genai SDK
                         (generateContent-      (generateContent
                          equivalent, existing)  surface — Section 7)
```

- Keep the existing `AIProvider` interface signature unchanged (Section 4).
- Introduce a small factory/resolver (Option B, Section 11) rather than an inline conditional or a DI framework.
- Select the active provider via `AI_PROVIDER=anthropic|gemini` at the application-global level (Section 11) — no per-capability provider selection, per contract Section 7.3/7.4 and explicit non-goals.
- `GeminiProvider` sends the fully assembled prompt as-is (Approach A, Section 10) rather than extracting `<system>` into `systemInstruction`, pending future evidence otherwise.
- `GeminiProvider` targets the `generateContent` API surface, not the Interactions API, for the reasons in Section 7.
- `GeminiProvider` derives its `responseSchema`/`responseJsonSchema` from the existing Zod schemas via `zodToJsonSchema` (or `z.toJSONSchema()` if the app is on Zod v4+), and the existing `validateAIResponse` Zod boundary remains unchanged and mandatory (Section 9).
- Model tier → model-string mapping becomes provider-aware, resolved from the active provider's own config block rather than a single shared Anthropic-only mapping (Sections 8, 16).

---

## 19. Explicit Non-Goals

Unchanged from the contract (Section 8) and correctly respected by the original investigation; reaffirmed here:

- No automatic failover, routing, or ensembling.
- No streaming UI.
- No RAG, embeddings, or vector database work.
- No OpenAI or local-model integration.
- No prompt-management platform.
- No conversational/multi-turn state, and — newly relevant given Section 7's finding — **no adoption of the Interactions API's stateful/agentic capabilities**, which would implicitly pull in exactly this kind of out-of-scope functionality.
- No DI framework.
- No per-capability provider routing.

---

## 20. Risks

| Risk                                                                                                             | Likelihood                                             | Impact      | Note                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic regression during `AIService`/factory refactor                                                         | Low                                                    | High        | Mitigate via existing provider-contract tests; unchanged from original assessment.                                                                             |
| Eager-instantiation startup crash under one-provider-configured environments                                     | High (until fixed)                                     | High        | Root cause identified in repository evidence; lazy factory is the fix (Section 11).                                                                            |
| **New:** Building around a model already mid-deprecation (Gemini 2.5 family)                                     | Was High under original investigation's recommendation | High        | **Corrected** by targeting the 3.x line (Section 8) instead.                                                                                                   |
| **New:** Targeting the wrong Gemini API surface (Interactions vs. generateContent) for a stateless-JSON use case | Medium                                                 | Medium–High | Interactions API is Beta with an unstable schema; generateContent is explicitly still Google's own recommendation for stable production workloads (Section 7). |
| **New:** Gemini schema dialect silently rejecting unsupported Zod-derived constructs                             | Medium                                                 | Medium      | Requires experimental verification against the app's actual three schemas (Section 9).                                                                         |
| **New:** Safety-blocked/truncated generation mishandled as a generic JSON-parse failure                          | Medium                                                 | Medium      | Requires explicit `finishReason`/`blockReason` handling before fence-stripping/parsing (Sections 12–13).                                                       |
| CI/smoke failure from unconditional dual-provider credential checks                                              | Medium                                                 | High        | Same fix (lazy, selective construction) resolves both the original and this restated version of the risk.                                                      |
| Observability model-name mismatch once a second provider exists                                                  | Medium                                                 | Low         | Provider-aware tier resolution (Section 16).                                                                                                                   |
| **New:** Relying on unconfirmed `gemini-3.6-flash` status                                                        | Medium                                                 | Medium      | Do not hardcode until independently re-confirmed at specification time (Section 8).                                                                            |

---

## 21. Specification Decisions Still Required

Explicitly not resolved by this investigation, and flagged as such rather than silently decided:

1. Whether `GeminiProvider` extracts `<system>` into native `systemInstruction` (Approach A recommended, Section 10) — **SPECIFICATION DECISION.**
2. Exact final `FAST_JSON`/`DEEP_CONTEXT` → Gemini model string mapping, pending Gemini 3.6 Flash status confirmation and empirical benchmarking against the three real prompts/schemas (Section 8) — **SPECIFICATION DECISION, blocked on an IMPLEMENTATION EXPERIMENT.**
3. Whether to use `zodToJsonSchema` (package) or `z.toJSONSchema()` (native, Zod v4+) depending on the application's current Zod version — **SPECIFICATION DECISION**, trivially resolved by checking `package.json`'s Zod version (REPOSITORY VERIFICATION REQUIRED).
4. Exact Gemini SDK exception → domain error class mapping table (target hierarchy is settled; source-side exception shapes are not) — **SPECIFICATION DECISION, blocked on an IMPLEMENTATION EXPERIMENT** (Section 12).
5. Where in the app lifecycle provider selection/config validation occurs precisely (config-load time vs. factory-call time) — **SPECIFICATION DECISION** (Section 11 gives an invariant, not a mechanism).
6. Whether CI should smoke-test both providers (matrix) or one default provider — **SPECIFICATION DECISION** (Section 15).

---

## 22. Implementation Experiment Backlog

To be performed before or during specification/implementation, not during this investigation:

1. Re-fetch `ai.google.dev/gemini-api/docs/models` and `/changelog` (or call the live API) immediately before specification to confirm current status, pricing, and context window of `gemini-3.6-flash`, and confirm whether `gemini-3.5-flash`/`gemini-3.1-pro-preview` remain the best-available non-preview options at that time.
2. Verify `zodToJsonSchema(schema)` (or `z.toJSONSchema(schema)`) output against each of the three existing application Zod schemas (task generation, task labels, project summary) for unsupported-keyword rejection, nesting depth issues, and enum/optional-field handling.
3. Verify the actual `response.text` / candidate shape returned by `@google/genai`'s `generateContent` when a generation is safety-blocked or truncated, including whether this throws, returns undefined, or returns partial text.
4. Verify actual thrown exception types/status codes from `@google/genai` for: missing/invalid API key, rate limiting, network failure, and malformed request — and map each to `AIConfigurationError` / `AITimeoutError` / `AIProviderError` accordingly.
5. Verify `AbortSignal`-based timeout behavior end-to-end (confirm the SDK actually aborts the underlying HTTP call and surfaces a distinguishable error, not just that the field exists on the type).
6. Confirm whether the installed Zod major version in `package.json` supports native `z.toJSONSchema()`, or whether the `zod-to-json-schema` package must be added as a new dependency (a dependency-installation event requiring contract Gate 2+ authorization, not Gate 1).
7. Compare output quality/parity for at least one representative prompt using Approach A (unified prompt) vs. Approach B (extracted `systemInstruction`) empirically, if there is any appetite to revisit the Section 10 recommendation with real evidence rather than reasoning alone.
8. Confirm `GeminiProvider` can be constructed and can execute a real (throwaway-key) smoke call with **only** `GEMINI_API_KEY` set and `ANTHROPIC_API_KEY` absent from the environment, and vice versa for `AnthropicProvider` — direct validation of the contract's core invariant (Section 11).
9. Confirm current recommended handling of `temperature`/`top_p`/`top_k` given Google's June 1, 2026 changelog note marking these as deprecated sampling parameters, if the existing `AnthropicProvider` parity behavior (`temperature: 0`) needs a Gemini-side equivalent for deterministic structured output.

---

## 23. Fact-Check Matrix

| Original Investigation Claim                                                                                             | Verdict                                                                       | Current Evidence                                                                                                                                                                      | Correction / Notes                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@google/genai` is the current official Node/TS SDK; `@google/generative-ai` is deprecated                               | **CONFIRMED**                                                                 | Official npm listing, GitHub `googleapis/js-genai`, Google's own deprecated-SDK repo notice                                                                                           | No change.                                                                                                             |
| `generateContent` is presented with no mention of any alternative/newer API surface                                      | **OUTDATED**                                                                  | Interactions API reached GA June 22, 2026 and is Google's recommendation for new projects; `generateContent` is now "legacy" but still recommended for stable production              | Recommend continuing to target `generateContent` for Phase 20 (Section 7), but the omission itself was a material gap. |
| `gemini-2.5-flash` / `gemini-2.5-pro` / `gemini-2.5-flash-lite` as primary/alternative model candidates                  | **OUTDATED**                                                                  | Entire 2.5 family deprecated; minimum shutdown Oct 16, 2026 (Agent Platform track)                                                                                                    | Replace with 3.x-line candidates (Section 8).                                                                          |
| `gemini-3.6-flash` listed as a viable alternative candidate with no caveat                                               | **UNSUPPORTED** (at time of original writing) / **REQUIRES EXPERIMENT** (now) | Conflicting sources; not confirmed via direct fetch of Google's own changelog at review time                                                                                          | Do not rely on without a fresh, direct confirmation immediately before specification.                                  |
| Gemini supports `responseMimeType`/`responseSchema` for structured output                                                | **CONFIRMED**                                                                 | Official structured-output docs, `GenerateContentConfig` type reference                                                                                                               | No change.                                                                                                             |
| Gemini "natively" works with the app's Zod schemas with no conversion described                                          | **PARTIALLY CORRECT**                                                         | Requires `zodToJsonSchema()` or `z.toJSONSchema()` conversion step; not zero-effort                                                                                                   | Mechanism now specified (Section 9).                                                                                   |
| `GeminiProvider` should extract `<system>` and use native `systemInstruction` (stated as settled "Architectural Action") | **UNSUPPORTED as a settled decision**                                         | No evidence this preserves behavioral parity; contract explicitly asks to minimize semantic drift                                                                                     | Reclassified as SPECIFICATION DECISION, recommend against by default (Section 10).                                     |
| AbortSignal / SDK timeout option exists                                                                                  | **CONFIRMED**, previously under-cited                                         | `GenerateContentConfig.abortSignal?: AbortSignal` is a real, published field                                                                                                          | Strengthened with exact field name (Section 14).                                                                       |
| Gemini errors map cleanly to `AIConfigurationError`/`AITimeoutError`/`AIProviderError` with implied certainty            | **REQUIRES EXPERIMENT**                                                       | Target hierarchy is reasonable; exact source-side SDK exception shapes not independently confirmed to the same standard as the Anthropic side                                         | Section 12.                                                                                                            |
| Safety-blocked output handling not distinguished from malformed-JSON handling                                            | **PARTIALLY CORRECT / gap identified**                                        | `promptFeedback.blockReason` and per-candidate `finishReason` are real, distinct signals that must be checked before JSON parsing                                                     | New handling requirement added (Sections 12–13).                                                                       |
| Provider Factory / lazy resolver as recommended architecture                                                             | **CONFIRMED**                                                                 | Directly matches contract's own suggested pattern (`createAIProvider(config)`) and sound general engineering practice for this problem size                                           | No change.                                                                                                             |
| Application-global `AI_PROVIDER` env selection (not per-capability)                                                      | **CONFIRMED**                                                                 | Matches contract Section 7.3/7.4 and explicit non-goals                                                                                                                               | No change.                                                                                                             |
| "All contract unknowns have been conclusively answered... Open Questions: None"                                          | **UNSUPPORTED (overstated)**                                                  | Multiple items in this corrected document (model status, schema-dialect limits, exact SDK error shapes, blocked-candidate response shape) are not resolvable from documentation alone | This blanket closure is the original investigation's single largest process error — see Section 24.                    |

---

## 24. Gate 1 Readiness Assessment

**GATE 1: APPROVE WITH CORRECTIONS**

Reasoning:

- The **repository-side architectural understanding** (domain isolation, eager instantiation, hardcoded config, prompt portability, Zod boundary, coupling inventory) presented in the original investigation is coherent, specific, and — as far as this review can assess without repository access — trustworthy as _evidence_, not merely assertion. Nothing here found an internal contradiction serious enough to require re-doing the repository investigation from scratch.
- The **architectural recommendation** (thin provider interface preserved, small lazy factory, application-global env-based selection, Zod remains the trust boundary, no DI framework, no automatic failover) is sound, appropriately minimal, and well-aligned with the contract's explicit preferences. This does not need to be redone.
- However, the original investigation's **external technical research** contained one materially significant error (recommending a deprecating model family as the primary choice for a brand-new integration), one significant omission (the existence and GA status of the Interactions API and what it implies about `generateContent`'s status), one incomplete mechanism (Zod→Gemini schema conversion asserted without the actual conversion step), and — most importantly as a _process_ issue — a blanket closure of all "Contract Unknowns" and "Open Questions: None," when several of those questions cannot actually be answered from documentation alone and require hands-on experimentation (exact SDK error/exception shapes, exact blocked-candidate response shape, current status of specific bleeding-edge model identifiers).
- None of these corrections invalidate the overall Phase 20 approach. They change _which specific model strings and API surface to target_ and _how much confidence to place in specific implementation details_ — exactly the kind of correction an investigation gate is supposed to catch before specification work locks in stale assumptions.
- This document does not approve implementation. It approves the investigation's foundational understanding, subject to the corrections above, and hands off a sharpened, appropriately-hedged evidence base plus an explicit experiment backlog (Section 22) to carry into Gate 2 (Specification).

**Recommended immediate next step:** before Gate 2 specification work begins, run Implementation Experiment Backlog item #1 (Section 22) — a fresh, direct check of Gemini's model status page — since model-lifecycle information in this fast-moving space can go stale within days, and this document's own model research is only as current as July 22, 2026.

---

## 25. Sources

### Google Gemini Official Documentation

- "Interactions API | Gemini API | Google AI for Developers" — `ai.google.dev/gemini-api/docs/interactions-overview` — supports: Interactions API reached GA June 22, 2026, recommended for new projects, `generateContent` now legacy-but-supported.
- "Gemini generateContent API | Google AI for Developers" — `ai.google.dev/gemini-api/docs/generate-content` — supports: `generateContent` still recommended for stable production deployments; Interactions API breaking-changes history.
- "Migrating to the Interactions API | Gemini API | Google AI for Developers" — `ai.google.dev/gemini-api/docs/migrate-to-interactions` — supports: migration guidance, tool-calling representation differences.
- "Structured outputs | Gemini API | Google AI for Developers" (`generateContent` legacy version) — `ai.google.dev/gemini-api/docs/generate-content/structured-output` — supports: `responseMimeType`/`responseSchema`/`responseJsonSchema`, official `zodToJsonSchema` code sample.
- "Structured outputs | Gemini API" (Interactions version) — `ai.google.dev/gemini-api/docs/structured-output` — supports: Pydantic/Zod schema-definition support statement.
- "Gemini deprecations | Gemini API | Google AI for Developers" — `ai.google.dev/gemini-api/docs/deprecations` (last updated 2026-07-21 per page metadata) — supports: model shutdown-date policy language ("earliest possible dates"), 3.x model release/shutdown table.
- "Release notes | Gemini API | Google AI for Developers" — `ai.google.dev/gemini-api/docs/changelog` (fetched directly; cached "Last updated 2026-06-01 UTC" at fetch time) — supports: `gemini-3.5-flash` GA May 19 2026, `gemini-3.1-flash-lite` GA May 7 2026, `gemini-2.0-flash*` family shutdown June 1 2026, deprecated sampling-parameter note, no Gemini 3.6 Flash entry present at fetch time.
- "Gemini API libraries | Google AI for Developers" — `ai.google.dev/gemini-api/docs/libraries` — supports: official SDK language list, Google GenAI SDK as the recommended library.
- "Models | Gemini API | Google AI for Developers" — `ai.google.dev/gemini-api/docs/models` — supports: preview/latest/GA alias lifecycle and notice-period language.
- Interface reference: `GenerateContentConfig` — `googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html` — supports: `abortSignal`, `responseSchema`, `responseJsonSchema`, `responseMimeType`, `systemInstruction` field names, confirming exact TypeScript interface shape.

### Anthropic Official Documentation

- No new first-party Anthropic documentation was required for this correction pass; existing Anthropic-side findings are carried over unchanged from repository evidence (Section 5) and were not independently re-verified against Anthropic docs, since the repository-reported behavior (SDK exception classes, request shape) was internally consistent and not in question.

### SDK / Package Documentation

- `@google/genai` — npm — `npmjs.com/package/@google/genai` — supports: package identity, TS/JS SDK designation, current major version (2.13.0 at time of research), Node/TS support statement, API-key security guidance.
- `@google/generative-ai` — npm — `npmjs.com/package/@google/generative-ai` — supports: deprecation/migration notice to `@google/genai`.
- `googleapis/js-genai` — GitHub — `github.com/googleapis/js-genai` — supports: SDK scope (Gemini 2.0+), Enterprise/Developer API dual support, AFC breaking-change notice.
- `google-gemini/deprecated-generative-ai-js` — GitHub — `github.com/google-gemini/deprecated-generative-ai-js` — supports: explicit "now deprecated" repository notice for the legacy SDK.
- "Zod v4 & Gemini: Fix Structured Output with z.toJSONSchema" — Build with Matija — `buildwithmatija.com/blog/zod-v4-gemini-fix-structured-output-z-tojsonschema` — supports: native `z.toJSONSchema()` as a Zod v4+ alternative to `zod-to-json-schema`.

### Other Sources (lower-confidence — used only for triangulation/context, flagged accordingly in-text)

- "Gemini Interactions API vs generateContent: Which Should You Choose?" — Apiyi.com Blog — supports: independent-tester confirmation that `generateContent` remains the safer near-term production choice as of early July 2026.
- "Gemini Interactions API Explained" — Mervin Praison — supports: GA date (June 22, 2026), positioning of Interactions vs. generateContent going forward.
- "Google replaces Gemini's generateContent with Interactions API" — Logicity — supports: same GA-date confirmation via an independent secondary source.
- "Gemini deprecations" table excerpt and "Google Is Retiring Gemini 2.5 on Agent Platform" — gcpstudyhub.com — supports: October 16, 2026 minimum shutdown date and "no earlier than" framing for the 2.5 family on Agent Platform.
- "Migrate Gemini model lineup from deprecated 2.5 family to Gemini 3" — GitHub issue, `parleq/parleq-speech` — supports (as corroborating, non-authoritative signal only): real-world developer account of 2.5 Flash-Lite already returning intermittent errors ahead of formal shutdown.
- "Gemini 3.6 Flash vs Claude" and "What Is Gemini 3.6 Flash?" — kie.ai — supports (flagged low-confidence, conflicting with other sources): the "unconfirmed/leaked-only" account of Gemini 3.6 Flash status as of July 21, 2026.
- Various X/Twitter sightings (AiBattle, testingcatalog, GitHub Changelog account) — supports (flagged lowest-confidence): community sighting of `gemini-3.6-flash-tiered` identifier and possible GA framing; explicitly not treated as confirmed given the direct-fetch discrepancy noted in Section 8.
- "Google Gemini Structured Output: responseSchema and JSON Mode" — JSONKit — supports: plain-language description of `responseSchema`/`responseMimeType` mechanics and `propertyOrdering`, used only as an illustrative secondary explanation alongside the primary official sources above.

_Research conducted July 22, 2026. Given the pace of change in this space (evidenced directly by the Gemini 3.6 Flash ambiguity above), re-verify model-status and API-surface claims immediately before Gate 2 specification work, not just at Gate 1._
