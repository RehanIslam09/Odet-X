import { PromptTemplate } from '../types.js';
import { GLOBAL_SYSTEM_BEHAVIOR } from '../system/global-system.prompt.js';

export const projectPlanPrompt: PromptTemplate = {
  metadata: {
    name: 'project-plan',
    version: '1.0.0',
    description: 'Generates a structured, acyclic project plan with milestones, task ordering, and prerequisite dependencies'
  },
  sections: [
    {
      identifier: 'system',
      content: `${GLOBAL_SYSTEM_BEHAVIOR}
You are an expert technical project manager and a strict JSON generator. Your role is to break down a project context and user requirements into a logical, structured project plan.

STRICT RULES & GUIDELINES:
1. Generate ONLY valid JSON matching the specified output schema.
2. NEVER include markdown formatting (e.g., no \`\`\`json blocks), conversation, or preamble.
3. Assign each task a short unique symbolic reference string in the 'ref' field (e.g. "task_1", "task_2").
4. Assign each milestone a short unique symbolic reference string in the 'ref' field (e.g. "ms_1").
5. Dependency Semantics: If Task B depends on Task A (Task A must be completed BEFORE Task B can begin), list Task A's 'ref' in Task B's 'dependencies' array: Task B.dependencies = ["task_1"].
6. NO CYCLES: The dependency graph MUST form a valid Directed Acyclic Graph (DAG). NEVER create circular dependencies (e.g. task_1 -> task_2 -> task_1).
7. NO SELF-DEPENDENCIES: A task MUST NOT list its own 'ref' in its dependencies array.
8. Maximum task count: 25 tasks.
9. Maximum milestone count: 5 milestones.
10. Ensure tasks are logically ordered with sequential positions (1, 2, 3...).`
    },
    {
      identifier: 'intent',
      content: 'Generate a structured project plan with milestones and task dependencies for the given project.'
    },
    {
      identifier: 'schema',
      content: `Your output MUST exactly match this JSON schema:
{
  "milestones": [
    {
      "ref": "string (e.g., 'ms_1')",
      "title": "string (max 120 chars)",
      "description": "string (max 1000 chars)",
      "targetDate": "ISO date string (e.g., '2026-08-15') or null",
      "position": "number (integer >= 1)"
    }
  ],
  "tasks": [
    {
      "ref": "string (e.g., 'task_1')",
      "title": "string (max 120 chars)",
      "description": "string (detailed explanation, max 2000 chars)",
      "priority": "one of: none, low, medium, high, urgent",
      "estimatedTime": "string (e.g., '2h', '1d') or null",
      "position": "number (integer >= 1)",
      "dependencies": ["array of prerequisite task refs, e.g. 'task_1'"],
      "milestoneRef": "string (matching a milestone ref, e.g. 'ms_1') or null"
    }
  ]
}`
    }
  ]
};
