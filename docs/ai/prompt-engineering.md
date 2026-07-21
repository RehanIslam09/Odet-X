# AI Prompt Engineering System

## Prompt Lifecycle

1. **Definition**: Future AI capabilities define a `PromptTemplate` consisting of metadata and sections.
2. **Registration**: The feature registers its template in `PromptRegistry` during application startup.
3. **Execution**: The Application Service passes the retrieved `PromptTemplate` to `AIService`.
4. **Validation**: The `AIService` checks the prompt structure using `prompt.validator.ts`.
5. **Assembly**: The `PromptBuilder` deterministically joins all sections, applying structural delimiters.
6. **Provider Call**: The assembled prompt is dispatched to Anthropic.

## Prompt Directory Organization

- `system/`: Contains immutable, global behavioral strings (e.g., `global-system.prompt.ts`).
- `builder/`: Functional utility that compiles a template into a raw string.
- `validation/`: Enforces metadata and structural correctness on templates.
- `registry/`: Simple central store for retrieving prompts by name.
- `types.ts`: The generic `PromptTemplate` and `PromptSection` data structures.

## Naming Conventions & Versioning

- **Name**: Use standard kebab-case that reflects the specific feature (e.g., `generate-tasks`).
- **Version**: Use semver (e.g., `1.0.0`). Versioning is primarily for logging and observability (tracking which prompt generated which result), not for supporting multiple active versions in code.

## Section Ordering & Delimiter Strategy

To prevent prompt injection, the `PromptBuilder` encapsulates each section in deterministic XML tags corresponding to the section identifier. 

Example:
```xml
<system>
You are an AI assistant.
</system>

<context>
User's raw project notes go here.
</context>
```
The ordering of sections is preserved exactly as defined in the `sections` array of the `PromptTemplate`.

## Creating Future Prompts

Future contributors should NEVER alter the builder, registry, or validation logic when adding a new AI feature. 

Simply define and register a new prompt in your feature module (e.g. `src/features/projects/prompts/`):

```typescript
import { GLOBAL_SYSTEM_BEHAVIOR } from '@/ai/prompts/system/global-system.prompt';
import { PromptTemplate } from '@/ai/prompts/types';
import { promptRegistry } from '@/ai/prompts/registry/prompt.registry';

const myNewPrompt: PromptTemplate = {
  metadata: {
    name: 'project-deconstruction',
    version: '1.0.0',
    description: 'Breaks down a project into tasks.'
  },
  sections: [
    { identifier: 'system', content: GLOBAL_SYSTEM_BEHAVIOR },
    // dynamic sections (context/intent) will be appended at execution time
  ]
};

promptRegistry.register(myNewPrompt);
```
During execution, retrieve it, append your user's dynamic context/intent, and pass to `AIService`.
