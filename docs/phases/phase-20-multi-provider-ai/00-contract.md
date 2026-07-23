# Phase 20 Contract — Multi-Provider AI Architecture & Gemini Integration

**Phase:** 20  
**Status:** DRAFT — Awaiting Investigation  
**Implementation Authorization:** NONE  
**Investigation Authorization:** READ-ONLY ONLY  
**Risk Level:** HIGH  
**Primary Domain:** AI Infrastructure / Backend Architecture  
**Current Provider:** Anthropic Claude  
**New Provider:** Google Gemini  

---

# 1. Phase Objective

Transform the existing AI subsystem from an architecture that currently operates through a single concrete provider, Anthropic Claude, into a genuinely provider-independent multi-provider AI architecture.

Google Gemini will be integrated as the second production-capable AI provider.

The purpose of this phase is NOT to replace Anthropic.

The purpose is to ensure that AI Project Manager is not permanently coupled to any single AI vendor, model family, pricing structure, SDK, or provider-specific implementation.

At the completion of Phase 20, the application should be capable of executing its existing AI capabilities through either Anthropic or Gemini without requiring domain services to understand provider-specific implementation details.

The architecture should establish a clean foundation for future capabilities such as:

- provider routing
- provider failover
- cost-aware model selection
- provider-specific model configuration
- AI observability
- usage tracking
- evaluation
- additional providers

Those future capabilities must NOT automatically be implemented during this phase unless explicitly approved after investigation.

---

# 2. Product Problem

AI Project Manager currently relies on Anthropic Claude for its AI capabilities.

Although the existing AI subsystem already contains abstractions such as `AIService` and an `AIProvider` interface, Anthropic is currently the only concrete provider implementation.

This creates several long-term risks.

## 2.1 Vendor Dependency

If the application can only execute AI workloads through Anthropic, the product remains operationally dependent on a single external vendor.

## 2.2 Cost Dependency

Different AI workloads have different complexity requirements.

Using an expensive model for every operation may eventually become economically inefficient.

For example, relatively constrained operations such as task auto-labeling may not require the same model capability or cost profile as complex project decomposition.

Adding Gemini creates the first real opportunity for future cost-aware provider decisions.

## 2.3 Availability Risk

A single-provider system creates a single external AI availability dependency.

Provider-independent architecture creates the foundation for future resilience strategies.

Automatic failover itself is NOT assumed to be part of Phase 20.

## 2.4 Architectural Lock-In

Provider-specific SDK behavior, request structures, response structures, model identifiers, errors, or configuration must not leak throughout the application.

The existing provider abstraction should become a real architectural boundary rather than an abstraction that only happens to contain one implementation.

---

# 3. User Value

Phase 20 is primarily an infrastructure and architecture phase rather than a large visible product-feature phase.

However, it creates substantial long-term product value.

Users should eventually benefit from:

- reduced dependency on one AI vendor
- greater AI service resilience
- greater flexibility in model selection
- future cost optimization
- easier adoption of improved models
- consistent AI capabilities regardless of provider
- reduced risk from provider pricing or availability changes

Existing users must not experience regressions in current AI functionality as a result of this phase.

---

# 4. Existing AI Capabilities That Must Be Preserved

The current AI functionality must remain operational throughout Phase 20.

This includes the existing AI features documented during Phase 19:

1. Project Task Generation
2. Task Auto-Labeling
3. Project Summary Generation

Their existing:

- API contracts
- domain behavior
- prompt contracts
- structured outputs
- Zod validation
- authorization behavior
- error handling expectations

must remain compatible unless a change is explicitly justified, documented, and approved.

Phase 20 must not casually rewrite existing AI features simply because a second provider is being introduced.

---

# 5. Existing Architectural Invariants

The current AI subsystem contains several architectural boundaries established during Phase 19.

These must be investigated before any implementation begins.

Known components include:

- `AIService`
- `AIProvider`
- `AnthropicProvider`
- `PromptRegistry`
- prompt definitions
- prompt validation
- prompt builder / assembly logic
- structured output validation
- Zod response schemas
- AI configuration
- AI-specific errors
- AI logging
- domain-level AI services

The exact current implementation must be verified from source code.

Documentation is useful context but source code is authoritative when implementation details differ.

---

# 6. Desired Architectural Direction

The desired conceptual architecture is:

                     Domain Services
                           │
                           ▼
                       AIService
                           │
                           ▼
                  Provider Abstraction
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      AnthropicProvider          GeminiProvider
              │                         │
              ▼                         ▼
       Anthropic SDK             Gemini SDK/API
              │                         │
              ▼                         ▼
           Claude                    Gemini

Domain services should not need to know which provider is executing the request.

Provider-specific concerns should remain behind the provider abstraction wherever technically appropriate.

---

# 7. Functional Scope

Phase 20 is expected to investigate and, after explicit approval, implement the following capabilities.

## 7.1 Genuine Multi-Provider Architecture

Verify whether the existing `AIProvider` abstraction is sufficiently provider-independent.

If it is sufficient, preserve it.

If changes are required, propose the smallest justified changes necessary.

Do NOT redesign the abstraction simply because a different architecture appears aesthetically cleaner.

---

## 7.2 Gemini Provider Integration

Introduce Google Gemini as a second concrete AI provider.

The Gemini implementation must respect the same application-level contracts currently expected from AI providers.

Provider-specific:

- SDK calls
- authentication
- request construction
- model configuration
- response extraction
- errors

should remain encapsulated within the appropriate provider/configuration boundaries.

---

## 7.3 Provider Configuration

The application requires a deterministic mechanism for selecting the configured AI provider.

The exact mechanism must be determined during investigation.

Possible approaches may include environment-based configuration, configuration objects, provider factories, or another minimal architecture supported by the existing codebase.

No approach is pre-approved by this contract.

The investigation must recommend one based on the current architecture.

---

## 7.4 Provider Parity

Gemini must be evaluated against every existing AI capability.

At minimum:

- Project Task Generation
- Task Auto-Labeling
- Project Summary Generation

The investigation must determine whether existing prompts and structured-output contracts operate correctly across providers or whether provider-specific adaptation is necessary.

Provider differences must NOT leak into domain services unless there is a compelling architectural reason.

---

## 7.5 Structured Output Safety

Existing structured output validation remains mandatory.

LLM output must continue to be treated as untrusted input.

Gemini responses must pass through the same conceptual safety boundary used for existing AI responses:

AI Provider
    ↓
Untrusted Model Output
    ↓
Parsing / Extraction
    ↓
Schema Validation
    ↓
Typed Application Data

Provider integration must not bypass existing Zod validation or equivalent application-level runtime validation.

---

## 7.6 Error Boundaries

Provider-specific failures must be investigated carefully.

Examples include:

- authentication failure
- rate limiting
- provider outage
- malformed response
- empty response
- invalid structured output
- timeout
- SDK failure
- unsupported model
- safety/filter rejection

The investigation must determine how these errors currently flow through:

Provider
→ AIService
→ Domain Service
→ Controller
→ API response

Provider-specific implementation details should not unnecessarily leak into application-level error contracts.

---

## 7.7 Configuration Validation

Required provider configuration must fail predictably.

The investigation must determine how environment validation currently works and how provider-specific configuration should interact with startup.

One important requirement:

Configuring Anthropic should not unnecessarily require Gemini credentials.

Configuring Gemini should not unnecessarily require Anthropic credentials.

The exact configuration strategy must be proposed before implementation.

---

# 8. Explicitly Out of Scope

The following features are NOT authorized as part of Phase 20 unless we explicitly amend this contract.

- automatic provider failover
- automatic provider routing
- cost-based routing
- latency-based routing
- provider benchmarking infrastructure
- AI evaluation framework
- AI usage dashboard
- token billing system
- streaming UI
- conversational AI
- persistent AI memory
- RAG
- vector databases
- embeddings infrastructure
- OpenAI integration
- local model integration
- prompt management SaaS
- major prompt rewrites
- frontend redesign
- unrelated backend refactors
- database redesign
- authentication changes
- notification redesign
- worker redesign

These may become future phases.

Phase 20 should create a foundation that does not unnecessarily block them, but it must not implement speculative infrastructure for them.

---

# 9. Systems Potentially Affected

The investigation should examine at minimum:

## AI subsystem

`server/src/ai/**`

Including:

- provider contracts
- Anthropic provider
- AI service
- AI configuration
- prompt registry
- prompt builder
- prompt definitions
- validators
- schemas
- errors
- logging
- tests

## Domain AI services

Investigate all services consuming `AIService`, including existing project/task AI services.

## Environment Configuration

Investigate:

- `.env`
- `.env.example`
- environment validation
- startup behavior
- smoke-test configuration
- test configuration

## Testing Infrastructure

Determine how provider behavior is currently mocked and how Gemini can be tested without making real network requests.

## CI

Determine whether Gemini-related configuration affects:

- `npm run verify`
- GitHub Actions
- smoke verification

CI must NEVER require a real Gemini credential or consume paid AI requests.

---

# 10. Security and Data Constraints

AI providers are external trust boundaries.

The investigation must identify exactly what application data is transmitted to AI providers.

Phase 20 must preserve existing security principles.

At minimum:

- secrets must never be committed
- provider credentials must remain server-side
- credentials must never be exposed to the client
- logs must not expose API keys
- model output remains untrusted
- authorization must occur before AI operations receive protected resources
- provider integrations must not bypass existing validation
- CI must use fake credentials/mocks where appropriate
- automated tests must not consume real provider credits

If Gemini introduces materially different data handling or safety behavior, it must be documented before implementation.

---

# 11. Compatibility Requirements

Phase 20 should preserve backward compatibility wherever possible.

Existing Anthropic behavior should continue working.

Existing consumers of `AIService` should ideally require little or no modification.

Existing API routes should continue functioning.

Existing request and response DTOs should remain stable.

Existing prompt definitions should not be duplicated solely because another provider exists unless investigation proves provider-specific prompts are necessary.

Existing tests must remain valid.

---

# 12. Testing Expectations

Phase 20 requires significantly stronger verification than simply checking whether Gemini returns a response once.

The eventual implementation plan must include multiple layers of testing.

Expected categories include:

### Provider Contract Tests

Verify that concrete providers satisfy the application-level provider contract.

### Gemini Provider Tests

Verify:

- request construction
- structured response extraction
- error mapping
- invalid responses
- configuration behavior

These tests should use mocks/fakes and must not consume real API credits.

### Existing Anthropic Regression Tests

Existing Anthropic behavior must remain protected.

### AIService Tests

Verify provider-independent orchestration.

### Domain Integration Tests

Verify existing AI features continue consuming typed validated output correctly.

### Configuration Tests

Verify provider selection and missing configuration behavior.

### Smoke Verification

Application initialization must continue succeeding under the intended safe smoke environment.

### Full Repository Verification

The canonical:

`npm run verify`

must pass before Phase 20 can be considered complete.

---

# 13. Observability Expectations

Phase 20 should investigate whether existing AI logging can identify which provider and model executed an operation.

At minimum, future debugging should be able to answer:

- which provider handled the operation?
- which model was used?
- which AI capability executed?
- did it succeed or fail?
- how long did execution take?

Whether additional observability fields require implementation must be proposed during planning.

This contract does NOT authorize building a full AI observability platform.

---

# 14. Documentation Expectations

Documentation is part of the implementation.

Phase 20 must eventually update the relevant documentation describing:

- multi-provider architecture
- Gemini configuration
- provider abstraction
- provider selection
- local development setup
- testing strategy
- environment variables
- architectural decisions
- Phase 20 historical record

Documentation must reflect actual implemented behavior rather than speculative architecture.

---

# 15. Unknowns Requiring Investigation

The following questions MUST be answered before implementation planning.

1. Is the existing `AIProvider` interface truly provider-independent?

2. Which Anthropic-specific assumptions currently leak outside `AnthropicProvider`?

3. How is `AIService` instantiated today?

4. Is the Anthropic provider eagerly instantiated during module import?

5. How should provider creation be performed?

6. Should provider selection occur during startup, configuration loading, AIService construction, or elsewhere?

7. Which Gemini SDK/API is appropriate for the existing Node/TypeScript architecture?

8. Which Gemini model should initially provide parity with existing Claude usage?

9. Does Gemini support the structured-output behavior required by the existing architecture?

10. Can the existing prompt format be reused unchanged?

11. Are existing prompts accidentally Anthropic-specific?

12. How should Gemini errors map into the existing AI error hierarchy?

13. How should provider-specific environment variables be validated?

14. How should the smoke test operate when multiple providers exist?

15. How should CI operate without real provider credentials?

16. How should provider behavior be mocked in tests?

17. Are existing AI logs provider-aware?

18. Does any domain service import or reference Anthropic-specific implementation details?

19. Would adding Gemini require changes to existing API contracts?

20. What is the smallest implementation that establishes genuine provider independence?

21. What architectural decisions should explicitly be deferred to later phases?

---

# 16. Investigation Deliverable

The first authorized activity for Phase 20 is READ-ONLY investigation.

The investigation must produce:

`PHASE-20-INVESTIGATION.md`

or an equivalent temporary planning artifact.

It must contain:

## A. Current Architecture

Trace the exact runtime path from:

API request
→ controller
→ domain service
→ AIService
→ prompt system
→ provider
→ external model
→ validation
→ domain result

## B. Provider Coupling Audit

Identify every Anthropic-specific dependency and classify it as:

- correctly encapsulated
- minor coupling
- architectural coupling
- configuration coupling
- test coupling

## C. Gemini Technical Research

Research the CURRENT official Google Gemini Node/TypeScript SDK and relevant APIs.

Use primary documentation wherever possible.

Do not rely on memory for current SDK behavior.

## D. Structured Output Compatibility

Compare current application requirements against Gemini capabilities.

## E. Configuration Analysis

Document current environment/startup behavior and recommend provider configuration architecture.

## F. Error Model Analysis

Compare Anthropic and Gemini failure modes against the existing application error architecture.

## G. Testing Strategy

Explain exactly how both providers can be tested without real paid network calls.

## H. CI / Smoke Impact

Determine changes required, if any.

## I. Risks

Identify:

- regression risks
- provider semantic differences
- structured-output risks
- configuration risks
- testing risks
- operational risks

## J. Recommended Architecture

Provide the smallest architecture that satisfies this contract.

Include alternatives considered and explain why the recommendation is preferable.

## K. Proposed Work Packages

Suggest logical implementation work packages.

Do NOT implement them.

---

# 17. Investigation Rules

During investigation:

DO:

- read source code
- read tests
- read configuration
- read documentation
- inspect package manifests
- inspect Git history where useful
- research official Gemini documentation
- trace runtime flows
- identify coupling
- identify unknowns
- produce evidence
- cite exact files and relevant symbols

DO NOT:

- modify application code
- install packages
- modify package manifests
- modify lockfiles
- modify tests
- modify configuration
- modify CI
- create production implementation files
- refactor existing code
- run automated fixers
- implement Gemini
- create provider factories
- change prompts

Investigation means investigation.

---

# 18. Human Approval Gates

Phase 20 uses explicit human authorization gates.

## Gate 1 — Investigation Approval

This contract authorizes READ-ONLY investigation only.

After investigation, STOP.

We will review the evidence.

## Gate 2 — Specification Approval

After investigation is approved, a formal Phase 20 specification may be produced.

After specification creation, STOP.

## Gate 3 — Implementation Plan Approval

After specification approval, produce an implementation plan.

The plan must include:

- exact files affected
- architecture
- migration strategy
- tests
- verification
- work packages
- risks
- rollback considerations

Then STOP.

## Gate 4 — Work Package Authorization

Implementation will occur through bounded work packages.

No work package begins without explicit approval.

## Gate 5 — Phase Completion

Phase 20 is not complete until:

- implementation is finished
- targeted tests pass
- regression tests pass
- full verification passes
- documentation is synchronized
- final architecture is reviewed
- final diff is reviewed
- CI passes

---

# 19. Initial Risk Classification

**Risk Level: HIGH**

Reasons:

- modifies a critical external-service boundary
- affects every existing AI capability
- introduces a second vendor SDK/API
- touches environment configuration
- may affect application startup
- may affect CI/smoke verification
- introduces differences in provider semantics
- structured output behavior may differ between vendors
- poor abstraction decisions could create long-term architectural debt

Because of this classification, Phase 20 must NOT be implemented as one large autonomous task.

---

# 20. Definition of Done

Phase 20 will eventually be considered complete only when:

- [ ] Existing Anthropic provider remains operational.
- [ ] Gemini exists as a second supported provider.
- [ ] Provider-specific SDK logic remains appropriately encapsulated.
- [ ] Domain services remain provider-independent.
- [ ] Existing three AI capabilities work through the approved multi-provider architecture.
- [ ] Structured model output remains runtime validated.
- [ ] Provider selection is deterministic and documented.
- [ ] Provider-specific configuration is safely validated.
- [ ] Missing credentials fail predictably.
- [ ] Tests make no paid AI requests.
- [ ] CI makes no paid AI requests.
- [ ] Existing AI regression tests pass.
- [ ] Gemini provider tests pass.
- [ ] Configuration tests pass.
- [ ] Application smoke verification passes.
- [ ] `npm run verify` passes.
- [ ] GitHub Actions CI passes.
- [ ] No unrelated architectural refactors were introduced.
- [ ] Relevant documentation reflects the final architecture.
- [ ] Final diff has been manually reviewed.
- [ ] Phase 20 architectural decisions are recorded.

---

# 21. Explicit Non-Goal

Phase 20 is NOT an attempt to build the final form of the application's AI infrastructure.

It establishes one critical property:

> AI Project Manager must be capable of using more than one AI provider without its product and domain architecture becoming coupled to those providers.

Gemini is the first proof that this abstraction is real.

Future phases may build routing, failover, cost intelligence, evaluations, streaming, memory, or additional providers on top of this foundation.

Those systems should be designed when their requirements are known rather than speculatively implemented now.

---

# 22. Current Authorization

AUTHORIZED:

- Read-only repository investigation
- Official Gemini technical research
- Architecture analysis
- Risk analysis
- Test architecture analysis
- Creation of the Phase 20 investigation artifact

NOT AUTHORIZED:

- Implementation
- Dependency installation
- Source modification
- Configuration modification
- Test modification
- CI modification
- Prompt modification
- Refactoring

When the investigation artifact is complete:

**STOP AND WAIT FOR HUMAN REVIEW.**