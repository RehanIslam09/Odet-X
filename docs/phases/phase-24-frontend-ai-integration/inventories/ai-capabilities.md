# Inventory — AI Capabilities & UI Placeholder Audit

## AI Capability Matrix

| Capability | Backend Endpoint | Backend Implemented? | Real Gemini Verified? | Frontend Component Exists? | Frontend Wired? | Current UI UX | Phase 24 Action | Codebase Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Generate Tasks for Project** | `POST /api/v1/projects/:id/generate-tasks` | **Yes** | **Yes** | No | No | N/A | **Integrate in WP-02/03** | `server/src/controllers/project.controller.ts:generateTasks`, `server/src/services/project-ai.service.ts` |
| **Generate Summary for Project** | `POST /api/v1/projects/:id/generate-summary` | **Yes** | **Yes** | No | No | N/A | **Integrate in WP-02/03** | `server/src/controllers/project.controller.ts:generateSummary`, `server/src/services/project-summary-ai.service.ts` |
| **Generate Labels for Task** | `POST /api/v1/tasks/:id/generate-labels` | **Yes** | **Yes** | No | No | N/A | **Integrate in WP-02/03** | `server/src/controllers/task.controller.ts:generateLabels`, `server/src/services/task-ai.service.ts` |
| **Ask AI (Generic Assistant)** | None | **No** | No | Yes (`QuickActions.tsx:59`) | No | Button disabled, tooltip says "The AI assistant is coming soon." | **Keep as disabled placeholder** | `QuickActions.tsx:63` |
| **Ask AI about Workspace** | None | **No** | No | Yes (`AIDailyBrief.tsx:112`) | No | Button disabled, tooltip says "The AI assistant is coming soon." | **Keep as disabled placeholder** | `AIDailyBrief.tsx:117` |
| **AI Daily Briefing Card** | None | **No** | No | Yes (`AIDailyBrief.tsx:56`) | No | Card marked "Preview", displays static layout | **Keep as preview placeholder** | `AIDailyBrief.tsx:52` |
| **Weekly AI Summary Email** | None | **No** | No | Yes (`NotificationSettings.tsx:100`) | No | Toggle switch in settings | **Keep as placeholder** | `NotificationSettings.tsx:100` |

---

## Key Answers to Core Blockade 1 Questions

1. **What does `"The AI assistant is coming soon."` currently represent?**
   - It represents a generic, conversational AI chat assistant feature (e.g. asking arbitrary workspace questions).
   - **No backend route, controller, or AI prompt definition exists for a generic conversational assistant.**
   - Therefore, `"Ask AI"` controls MUST remain disabled placeholders during Phase 24. We MUST NOT attempt to fake or invent a generic AI assistant endpoint.

2. **Which backend AI capabilities genuinely exist and can now be integrated into the product UX?**
   - **Project Task Generation**: Accepts a project prompt description, uses Gemini/Anthropic to break down requirements into structured tasks, persists task documents in MongoDB, and logs activities.
   - **Project Summary Generation**: Evaluates project context and active tasks, uses Gemini/Anthropic to generate a structured summary (`summary`, `highlights`, `risks`), persists `aiSummary` in the Project document, and logs activities.
   - **Task Label Generation**: Evaluates task title, description, notes, and project context, uses Gemini/Anthropic to generate up to 5 relevant tags/labels, appends them to task document `labels`, and logs activities.

3. **How will Phase 24 expose these capabilities in the UI?**
   - Project Task Generation $\rightarrow$ "Generate Tasks with AI" button & dialog on Project Detail page.
   - Project Summary Generation $\rightarrow$ "Generate AI Summary" button & AI summary card on Project Detail page.
   - Task Label Generation $\rightarrow$ "Auto-generate Labels" button on Task Detail page / Properties panel.
