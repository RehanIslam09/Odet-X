# AI Project Manager — Design & Schema Decisions

> Internal architecture document. Written before domain-level implementation begins.
> This document defines *what we are building and why*, not *how it is coded*. It assumes the current foundation (auth, app shell, backend skeleton) described in `architecture.md`, `authentication.md`, `api-design.md`, and `roadmap.md`, and defines everything above that foundation.

---

## 1. Product Vision

### The actual problem

Every project management tool sells "organize your work." That's not the problem teams actually have. Teams already know what they need to do — the pain is the **coordination tax**: the constant manual bookkeeping required to keep a shared picture of reality up to date. Writing tickets. Breaking epics into tasks. Updating statuses. Chasing people for updates. Estimating. Re-estimating. Writing the standup. Writing the sprint summary. Noticing — usually too late — that something is blocked or slipping.

None of that work produces the product. It's overhead paid to keep humans synchronized. Jira, Linear, ClickUp, Notion, Asana — they all make that overhead *faster to perform*. None of them make it *disappear*. That is the opening.

**AI Project Manager's actual job**: absorb the coordination tax. Not "AI helps you use a PM tool faster" — the AI *is* the project manager function. The software's job is to maintain an accurate, current, honest picture of the project with as little manual human bookkeeping as possible, and to surface only the decisions that actually require a human.

### Ideal user

- Small-to-mid engineering/product teams (roughly 3–30 people) building software, without a dedicated full-time PM.
- Technical founders and tech leads who currently do project management as an unpaid second job.
- Teams that are disciplined enough to *write down* what they're doing (commits, PRs, docs, Slack) but are tired of *re-writing* the same information into a tracker by hand.
- Teams that have tried Linear or Jira and correctly identified that the tool is fast, but the *work of using the tool* is still 100% manual.

### Explicitly not the ideal user

- Large enterprises that need governance, custom workflow approval chains, and compliance audit trails as a primary requirement — that is Jira's actual moat, and competing head-on there is a losing, multi-year battle.
- Non-technical teams whose primary need is a flexible wiki/document workspace (Notion's core use case) — our data model is intentionally opinionated and task-centric, not freeform.
- Solo users looking for a personal to-do app — the value of this product is proportional to team coordination overhead, which barely exists at n=1.

### Why someone switches

- **From Jira** — because Jira demands upfront configuration (workflows, issue types, custom fields, boards) before it's useful, and that configuration itself becomes a second maintenance burden. We ship zero-configuration and let AI do what a Jira admin would otherwise hand-configure.
- **From Linear** — because Linear is excellent UX around a task list, but every task, estimate, and status transition is still typed by a human. Linear optimized the *interface*; we optimize the *labor*.
- **From Notion** — because Notion has no opinion about what a task, a project, or a status even is. Teams build their own ad hoc project management system inside it and it rots within two quarters. We ship the opinion, so teams don't have to invent one.

### Why someone stays

Not lock-in through data export friction — that's a bad reason and we will not engineer for it. The real reason to stay is that the AI Agent accumulates project-specific context over time (decisions made, why an approach was rejected, who owns what, historical velocity, recurring blockers). That context is genuinely expensive to rebuild elsewhere. Retention is earned through accumulated understanding, not switching cost.

---

## 2. Core Philosophy

- **AI-first, not AI-bolted-on.** The AI is not a feature added to a CRUD tracker. The tracker exists to give the AI a structured place to act.
- **Narrate work, don't file paperwork.** The primary human interaction is describing what happened in plain language; structured records are a byproduct, not the input method.
- **Opinionated over configurable.** Every configuration option is a decision the user has to make instead of doing their job. Defaults should be right for 90% of teams; escape hatches exist but are never required to get value on day one.
- **Signal over noise.** Every surface (dashboard, notification, digest) is a curation problem before it's a display problem. Showing everything is the same as showing nothing.
- **Single source of truth.** One task graph. Every view (board, list, calendar, AI digest) is a projection of the same underlying data — never a parallel copy that can drift.
- **Automation by default, override by exception.** The system should do the mechanical work automatically and ask forgiveness/confirmation for anything irreversible — not require the human to trigger every step.
- **Context compounds.** The product should get more useful the longer a team uses it, because the AI's understanding of the project deepens. This is the actual moat, not the UI.
- **Trust through transparency.** AI never acts as an unaccountable authority. Every suggestion shows its reasoning and source data. Every AI-originated change is visibly distinct from a human-originated change in history.

---

## 3. Design Principles

These are binding. A proposed feature that fails any of these should not ship in its current form.

1. **Effort test** — the feature must reduce total human effort across the team, not just move effort into a new surface.
2. **Zero-setup test** — a feature must deliver value with its default configuration. If it requires setup before first use, the setup must be optional, not gating.
3. **Reversibility test** — any AI-initiated change must be visibly undoable. Nothing AI does should be silently permanent.
4. **Single-truth test** — no feature may introduce a second place where the same fact is stored or displayed independently of the canonical record.
5. **"What do I do next" test** — every primary screen must make the next required human decision more obvious than the version before it, not just prettier.
6. **Fallback, not primary, test** — manual data entry must always be *possible*, but never the intended default path for the majority of updates.
7. **Actionable notification test** — a notification that doesn't require or invite a decision should be a digest line, not a push notification.
8. **One-sentence test** — if the value of a feature cannot be explained in one sentence to a non-technical user, it is not ready to ship, no matter how technically interesting.
9. **Progressive disclosure test** — advanced capability is allowed to exist, but must be hidden until the user has a reason to need it. Complexity is layered, never flattened onto the default view.
10. **Show-your-work test** — every AI suggestion must be traceable to the input it used (which tasks, which messages, which history). No unexplained authority.

---

## 4. User Journey

### Registration
Standard email/password (already built) with room for OAuth later. No forced onboarding survey — the first real onboarding step *is* the first project.

### Onboarding
No empty state, no blank board. On workspace creation, the user is asked one thing: *describe what you're building, in your own words.* Optionally, they can point at a GitHub repo or paste existing notes. There is no "create your first workflow" step — there is no workflow to create.

### First project
From the plain-language description, the AI Agent proposes: a project name, an initial task breakdown (with dependencies and rough estimates), and a suggested first milestone. The user reviews this like a draft — accepting, editing, deleting, or regenerating individual items — rather than building it field-by-field from scratch.

### First AI interaction
The acceptance/edit step above **is** the first AI interaction — not a separate "try the AI chat" tour. This matters: the first thing the AI does is visibly useful work, not a demo.

### Daily workflow
Each user's day starts with a short, personally-scoped digest: what's blocking them, what's due, what the AI flagged overnight (stalled tasks, silent dependencies, at-risk estimates). This replaces the habit of opening a board and scanning it manually.

### Weekly workflow
At the cadence the team chooses (default weekly), the AI proposes a sprint/cycle plan based on backlog priority, historical velocity, and current capacity. The human approves or adjusts scope. At the end of the cycle, the AI drafts a summary of what shipped, what slipped, and why — a first draft of the retro, not a replacement for having one.

### Long-term workflow
Over months, the Knowledge store accumulates decisions, rejected approaches, and recurring patterns (e.g., "auth work always takes 1.5x estimate"). The AI's predictions and suggestions become calibrated to the specific team, and the roadmap view becomes a genuinely reliable forecasting tool rather than a static plan.

---

## 5. Domain Model

Conceptual entities, their purpose, and why each exists as its own concept rather than being folded into another.

### Workspace
The organizational container — billing, membership, and workspace-wide settings live here. A user can belong to multiple workspaces (e.g., contractors, multiple teams). Exists separately from Project because permissions, billing, and cross-project goals must exist above any single project.

### Project
A scoped body of work with its own task graph, timeline, and board. The unit teams actually organize around day to day. Owns its tasks, milestones, and optional sprints.

### Sprint / Cycle
An **optional** time-boxed grouping of tasks within a project. Not mandatory — teams doing continuous flow shouldn't be forced into sprints. Exists as a lightweight grouping over tasks, not a container that owns them (a task's real home is always the project).

### Task
The atomic unit of work — the heart of the system (see Section 7). Everything else in the product exists to make tasks accurate with less effort.

### Milestone
A date-bound marker representing a meaningful checkpoint ("Public beta," "v1 launch"). Distinct from a Goal because a milestone is a *point in time*, not an ongoing outcome. Tasks link to milestones to answer "are we going to hit this date."

### Goal / Objective
A higher-level outcome that can span multiple projects and doesn't have a hard date (e.g., "Reduce onboarding drop-off"). Exists separately from Milestone because outcomes and dates are different axes — conflating them (as many tools do) makes roadmap views lie. Tasks and milestones can roll up into a goal.

### AI Agent
A persistent, contextual assistant scoped to a workspace, with awareness injected per-project. This is **not** a chat session entity — it has no separate "conversation" identity a user manages. It's the mechanism, not a feature the user navigates to. It reads Tasks, Activity, and Knowledge, and writes back Tasks, Comments, and Knowledge entries (always as clearly-attributed AI actions).

### Knowledge
A store of durable context: decisions made, approaches rejected and why, conventions, recurring risks. This is what makes the AI Agent get smarter over time instead of resetting its understanding every session. Distinct from Comments (which are conversational and task-scoped) and from a general wiki (we are explicitly not building a Notion competitor — see Section 13). Knowledge entries are short, structured, and exist specifically to be retrieved by the AI Agent as grounding context.

### Activity
An immutable, append-only event log referencing any entity. Exists as its own concept (not folded into each entity's history) because it must support cross-entity queries ("what changed in this project today") and because its volume and access pattern (write-heavy, append-only, time-ordered) is fundamentally different from the entities it describes.

### Comment
Conversational, threaded, attached to a Task (or Project). Distinct from Activity: a comment is a human (or AI) statement; Activity is a factual record that something changed.

### Attachment
A file or link associated with a Task or Comment. Kept as its own lightweight entity so it can be referenced from multiple places without duplicating storage.

### Notification
A derived, actionable per-user record that requires user attention (e.g., due dates, mentions), distinct from the immutable Activity log. It tracks delivery and read state (`readAt`) and uses its own snapshots for resilience against entity deletion. Phase 16.1 introduced the infrastructure. Phase 16.3 introduced the first active producers (background schedulers for `due_soon` and `overdue` reminders), with collaborative producers deferred to later AI phases.

### Member / Role
The membership and permission relationship between a User and a Workspace (and optionally a Project-level override). Kept distinct from User because a person's role is a property of their membership, not of their identity.

### Integration
A connection to an external system (GitHub, Slack, calendar) that feeds events into Activity and can be a source for AI-drafted Tasks. Modeled as a pluggable source, not a core dependency — the domain model must be complete and useful with zero integrations connected.

### Relationships, ownership, and scalability

- Workspace → Project → Task is a strict containment hierarchy for *ownership and permissions*.
- Goal ↔ Task is many-to-many, because outcomes cut across projects — this is deliberately looser than the containment hierarchy above.
- Sprint groups Tasks within a single Project; it does not own them.
- AI Agent is not owned by any single Project — it's a workspace-level capability that gets project-scoped context injected per interaction. This is what lets a future "cross-project risk" feature exist without a redesign.
- Knowledge is attachable at Workspace or Project level, giving it the same two-tier scoping as everything else, without inventing a third hierarchy.

---

## 6. Project Structure

### What a project contains
Tasks, milestones, optional sprints, project-scoped Knowledge entries, and project-level AI Agent configuration (context, defaults). This is the complete, closed set — a project is a self-contained unit of delivery.

### What never belongs inside a project
- **Cross-project goals** — these live at the workspace/Goal level specifically so a goal can span projects without being awkwardly "hosted" by one of them.
- **Freeform wiki/document content unrelated to delivery** — general company knowledge (onboarding docs, culture docs) is out of scope; Knowledge entries are decision-and-context records for the AI, not a document authoring surface.
- **Personal to-dos unrelated to team delivery** — a project is a shared source of truth; personal task management is a different product with different privacy assumptions.
- **Billing, membership, integrations configuration** — these are workspace-level concerns and must not be duplicated per project.

### Scaling projects
As a workspace accumulates dozens of projects, two things must hold:
1. Projects support archiving without deletion, so history and Knowledge remain queryable by the AI Agent even after a project is no longer active.
2. Large bodies of work are broken down using **parent tasks acting as epics**, not a separate Epic entity — this avoids a fourth level of hierarchy (Workspace → Project → Epic → Task → Subtask) that adds navigation cost without adding real capability. A parent task with subtasks already expresses "epic" semantics.

---

## 7. Task System

The task is the center of gravity of the entire product. Every other feature either creates, modifies, or summarizes tasks.

### Core fields
- **Title, description** — description supports rich text/markdown; can be AI-drafted from a short prompt.
- **Status** — a small, fixed default lifecycle (Backlog → Todo → In Progress → In Review → Done). Status *labels* can be renamed for taste, but we deliberately do not offer an arbitrary workflow/state-machine builder (see Section 13) — that configurability is a Jira trap.
- **Priority** — a simple ordinal scale, AI-suggested by default, human-overridable.
- **Assignee(s)** — supports a primary owner; multiple watchers/collaborators are a separate lightweight relation, not additional assignee slots.
- **Estimate** — optional; can be a point value or time. AI proposes an initial estimate based on historical velocity for similar tasks; humans can accept or override. Never a required field to create a task.
- **Due date** — optional at the task level; usually inherited/implied by the milestone it rolls up to rather than set individually for every task.
- **Dependencies** — modeled as a directed relationship (`blocks` / `blocked by`) between tasks, enabling critical-path computation. This is what makes delay prediction (Section 8) possible.
- **Parent / subtask** — a single level of self-reference, used both for literal subtasks and for "epic-as-parent-task" (Section 6). Deliberately not unlimited nesting.
- **Labels/tags** — free-form, lightweight categorization, orthogonal to status.
- **AI fields** — AI-generated summary, AI confidence score on the estimate, AI-detected risk flag with reason, AI-suggested next action. These are always visually distinguished from human-entered fields.
- **History** — a full changelog of every field transition, sourced from Activity, scoped to the task.
- **Linked goal / milestone** — optional roll-up references.
- **Comments, attachments** — as defined in Section 5.
- **Source** — records whether the task originated from a human, an AI planning pass, or an integration import. This single field underlies a large amount of trust-building UI (Section 2's "show your work" principle) at essentially no modeling cost.

### Dependencies as a graph, not a list
Because dependencies are directed edges between tasks, the system can compute: the critical path to a milestone, which tasks are silently blocking the most downstream work, and where a single assignee sits on more critical-path tasks than is safe. This graph is the substrate the AI's blocker-detection and delay-prediction features run on — it is not optional infrastructure, it's the reason those features are possible at all.

### Automation philosophy
We deliberately avoid a general-purpose "if this then that" rules engine as the primary automation mechanism (that is the ClickUp trap: endless rule configuration that becomes its own maintenance burden). Instead, automation is AI-driven and suggestion-based by default: e.g. "this task's subtasks aren't done — did you mean to mark it Done?" rather than a hard rule the user had to author. A small number of genuinely deterministic, low-risk automations (e.g., auto-move to "In Review" when a linked PR is opened) are hardcoded behaviors, not user-authorable rules — keeping the system opinionated rather than configurable.

---

## 8. AI — The Core Differentiator

The single most important constraint: **the AI is not a chatbot bolted onto a tracker.** A sidebar chat window is the failure mode we are explicitly avoiding — it puts the burden of initiating every useful interaction back on the human, which is exactly the coordination tax we're trying to eliminate.

Instead, the AI Agent is a set of ongoing, contextual capabilities that act on the task graph directly:

- **Planning** — turns a plain-language project or feature description into a structured task breakdown, complete with dependencies and initial estimates, presented as an editable draft.
- **Scheduling** — continuously proposes backlog ordering based on priority, dependency graph position, and current team capacity — not a one-time sort, an ongoing recommendation.
- **Breaking down work** — given a single large task, proposes a decomposition into subtasks sized appropriately based on the team's historical task-completion patterns.
- **Blocker detection** — scans the dependency graph and Activity for tasks that are stalled (no status change or comment past a learned threshold) or silently blocking multiple downstream tasks, and surfaces them proactively rather than waiting to be asked.
- **Delay prediction** — combines historical velocity, current burn rate against the critical path, and dependency risk to forecast whether a milestone will land on time, *before* it's obviously late.
- **Task writing** — converts rough input (a Slack message, a commit, a voice note, a one-line idea) into a properly structured task with title, description, and suggested fields.
- **Summaries** — daily personal digest, weekly project summary, and meeting-notes-to-action-items conversion.
- **Risk analysis** — surfaces cross-task risk patterns: dependency chains with no slack, single points of failure (one person owning too much of the critical path), and tasks with degrading estimate confidence.
- **Sprint planning copilot** — proposes cycle scope from the backlog given known velocity and priority, which the human approves or adjusts rather than building from a blank board.
- **Context awareness** — every AI action is grounded in the Knowledge store, so suggestions reflect decisions the team has already made, not generic advice. This is what separates the AI Agent from a stateless LLM call.
- **Documentation generation** — auto-drafts changelogs and release notes from completed tasks in a cycle, as a starting draft, not a final artifact.
- **Daily planning** — a genuinely personalized "what should I do today" view generated per user, not a filtered version of the shared task list.

### Non-negotiable constraints on AI behavior
1. Every AI action is a **suggestion** with an explicit accept/edit/reject affordance — never a silent write, except for the small set of low-risk, clearly-scoped automations named in Section 7.
2. Every AI-originated change is tagged distinctly in Activity and Task `source`, so a team can always tell what the AI did versus what a human did.
3. Every suggestion is explainable on demand — the reasoning and the specific data points used (which tasks, which history, which Knowledge entries) are inspectable, not asserted.
4. AI actions that touch multiple tasks at once (e.g., a full re-plan) are always presented as a reviewable diff, never applied in bulk without a preview.

---

## 9. Dashboard

### What it shows
A short, curated set of items that require a human decision *today* — not a comprehensive view of everything. Concretely: tasks blocked on this person, items due soon, AI-flagged risks awaiting a response, and a single-line delay/health indicator per active milestone. Target length: something a person can fully read in under a minute.

### What is useful
- Decisions waiting on you, ranked.
- What changed since you last looked that actually matters (not every field edit — only status changes, new blockers, new AI flags).
- One clear signal per milestone: on track / at risk / slipping, with the reason.

### What is noise, and therefore excluded from the default dashboard
- Burndown charts that nobody actually changes behavior in response to.
- A raw activity firehose.
- Vanity metrics (total tasks created, total comments) that don't map to a decision.
- A full board view — the board still exists, but it's a separate destination, not the landing screen. The dashboard's job is triage, not browsing.

---

## 10. Collaboration

- **Comments** — threaded per task, support @mentions, support both human and AI authorship (clearly labeled).
- **Mentions** — trigger a notification directly, bypassing digest batching, since a mention is inherently a direct request for a specific person's attention.
- **Activity** — the canonical event log (Section 5); the UI surfaces filtered slices of it (per task, per project) rather than one global feed.
- **Presence** — shown subtly (an avatar on a task someone is currently viewing/editing) to prevent duplicate work, never as a broadcast "who's online" feature — presence is a collision-avoidance signal, not a social one.
- **Permissions** — role-based at the workspace level (owner/admin/member/guest), with an optional project-level override for cases like external collaborators who should only see one project.
- **Sharing** — read-only links for stakeholders without accounts (e.g., a client viewing a milestone's status) — this is deliberately one-directional and scoped, not a full guest-account system, to avoid permission-model complexity early on.
- **Notifications** — batched and AI-prioritized by default (a digest, not a firehose); direct mentions and hard blockers on your own work are the only things that interrupt in real time. This follows directly from Design Principle 7 (actionable notification test).

---

## 11. Future Expansion

The domain model is deliberately shaped so the following can be added without restructuring the core:

- **Multi-workspace orgs / enterprise hierarchy** — Workspace already exists as the top-level container; an Organization entity can wrap multiple Workspaces later without touching Project or Task.
- **Deeper integrations (GitHub, Slack, Calendar)** — modeled as event sources feeding Activity and as an AI planning input, already anticipated in Section 5's Integration entity.
- **Formal OKR/Goal tracking** — Goal already exists as a distinct, cross-project entity; a dedicated OKR view is additive UI over existing data, not a new domain concept.
- **Resource/capacity planning** — becomes possible once Task estimates and assignment are consistently populated, which the AI's scheduling feature already needs and produces as a side effect.
- **Client-facing portals** — an extension of the read-only sharing links already defined in Section 10, scoped with more granular field visibility.
- **Mobile app** — the API-first backend and thin-controller architecture already in place (Section 12/14) means mobile is a new client against the same API, not a backend change.
- **Enterprise SSO / audit trail** — Activity is already an immutable, append-only log; formal audit/export is a reporting layer on top of existing data, not a new logging mechanism.

The unifying reason this works: every anticipated future feature is a *new view or a new consumer* of the existing five core entities (Task, Goal, Knowledge, Activity, AI Agent context), not a request for a sixth core entity. That is the test we'll keep applying to future proposals.

---

## 12. Database Decisions (Architectural Rationale)

*Not schemas — the reasoning behind how entities relate at the storage layer.*

- **Task as a top-level, independently-referenced collection (not embedded in Project).** Tasks are queried, filtered, and searched independently at high volume (by assignee, by status, across projects for a personal digest). Embedding tasks inside a Project document would force loading an entire project's task list for any single-task operation and would hit MongoDB's document size ceiling on large projects. Independent indexing on `projectId`, `assigneeId`, `status`, and `dueDate` is required for the dashboard and AI queries to be fast.

- **Dependencies and subtasks as references, not embedded arrays of full task data.** Dependencies form a graph that must support traversal (critical path, blocker detection) — storing only the referenced IDs keeps documents small and lets graph queries stay index-driven rather than requiring full document scans.

- **Activity as its own append-only collection, referenced polymorphically by `entityType` + `entityId`.** Activity volume grows far faster than any other entity (every field change, every status transition, every AI action). Isolating it prevents write-heavy activity logging from bloating or contending with the read patterns of Task and Project documents, and lets it be pruned/archived independently over time.

- **Comments referenced to Task, not embedded.** Comment threads are unbounded in principle and paginate independently of the task they belong to; embedding risks the same document-growth problem as embedding tasks in projects, and prevents efficient "latest comments across my tasks" queries.

- **Knowledge as a separate collection, structured for retrieval.** Knowledge entries exist specifically to be fetched as AI grounding context, which means they need to support future semantic/vector retrieval independent of how Tasks or Projects are queried. Coupling it to another entity's schema would constrain that evolution.

- **Workspace → Project as reference-based, not embedded.** A workspace can contain many projects, and projects must be independently loadable, archivable, and permission-scoped without pulling the entire workspace document.

- **AI suggestion metadata (confidence, source, flag reason) embedded directly on the Task document.** Unlike Comments or Activity, this data is small, bounded (a handful of fields), and is *always* read together with the task itself — every task view needs to know whether a field is AI-suggested. Embedding here avoids an unnecessary join/lookup for data that has no independent existence apart from its parent task.

The general rule applied throughout: **embed only what is small, bounded, and always read together with its parent; reference everything that is unbounded in growth, independently queried, or needs its own indexing strategy.**

---

## 13. Things We Will Explicitly NOT Build

Each of these is attractive on its own, and each violates a principle in Section 3.

- **A custom workflow/state-machine builder.** This is Jira's core complexity trap — endless admin-configured statuses and transitions that become their own maintenance burden. Violates the zero-setup and opinionated-over-configurable principles.
- **Time tracking and billing.** A different product with a different buyer and a different core loop. Building it invites scope creep away from "reduce coordination overhead" toward "become an invoicing tool."
- **A full WYSIWYG wiki/document system.** That is Notion's product. Knowledge exists specifically as short, structured, AI-retrievable context — not a document authoring surface. Competing with Notion head-on on documents is a distraction from the actual differentiator.
- **Gamification (points, streaks, badges).** Actively undermines "signal over noise" — it adds a layer of noise designed to be engaging rather than useful, and it incentivizes task-count over task-value.
- **Fully autonomous AI actions with no human confirmation on anything irreversible or high-stakes.** Violates the reversibility and show-your-work principles directly. Autonomy without an approval step is how trust gets destroyed in one bad suggestion.
- **Deeply nested hierarchies (Epic > Story > Subtask > Sub-subtask).** A single level of parent/subtask, with parent tasks doubling as epics, is sufficient and avoids the navigation overhead of a four-level tree.
- **A generic chatbot sidebar as the primary AI interface.** This is the exact failure mode described in Section 8 — it re-introduces the burden of remembering to ask, which is the coordination tax we exist to remove.
- **A custom field builder with unlimited field types.** Every arbitrary custom field is a configuration decision the team has to make and maintain, and it fragments the schema the AI is reasoning over.
- **Public roadmap pages, form builders, or a general no-code app-builder layer.** These are adjacent products (Productboard, Typeform, Airtable) that would dilute focus rather than deepen the core loop.

---

## 14. Engineering Decisions

These extend the architecture already established in `architecture.md`, specifically for the domain and AI layers.

### Backend
- Continue the existing service-layer pattern (thin controllers, all logic in services) for Project, Task, Goal, and Knowledge — no exception for AI-related endpoints.
- Introduce a dedicated `ai/` module, separate from `services/`, containing prompt templates, agent orchestration, and provider client calls. Business services call into `ai/` the same way they'd call any other internal service — the rest of the codebase should not know or care which model or provider is behind a suggestion.
- AI-heavy operations (full project planning, delay prediction across a whole project, digest generation) run as **background jobs**, not blocking HTTP request/response cycles. A lightweight job queue (e.g., BullMQ backed by Redis, already stubbed in `lib/redis.ts`) fits the existing lazy-initialized `lib/` pattern.
- Predictive/analytical workloads (delay prediction, velocity calculation) live in their own worker process separate from the web server, so they can scale independently as project/task volume grows.

### API philosophy
- Core resources (`/projects`, `/tasks`, `/goals`, `/milestones`) remain conventional REST, consistent with the existing `api-design.md` conventions and response envelope.
- AI actions are modeled as their **own resource verbs**, not folded into CRUD endpoints — e.g. `POST /ai/plan`, `POST /ai/summarize`, `POST /ai/tasks/:id/breakdown`. This keeps AI suggestions inspectable and reviewable as first-class API responses (a proposed diff), rather than a side effect hidden inside a normal task update.
- Every AI endpoint response includes the suggestion, its confidence, and its source references — matching the show-your-work principle at the API level, not just the UI level.

### Frontend
- New domain features (`projects`, `tasks`, `ai`) follow the existing feature-first structure already used for `auth` — `types/`, `validators/`, `services/`, `hooks/`, `components/`, `pages/` per feature.
- AI suggestion UI (accept/edit/reject) is built as a **shared, reusable pattern** across features rather than bespoke per surface (task creation, sprint planning, digest) — since the same interaction shape ("here's a suggestion, confirm or adjust it") recurs everywhere AI touches the product.
- Real-time updates (task status changes, presence) use a narrowly-scoped WebSocket channel per project — not a general-purpose real-time layer for every entity, to keep the surface area and failure modes small.

### Performance & caching
- Dashboard aggregations (today's digest, milestone health) are precomputed by background jobs and cached (Redis), not computed live on every page load — this keeps the highest-traffic screen fast regardless of project size.
- Task list/board queries rely on the indexing strategy defined in Section 12 (`projectId`, `assigneeId`, `status`, `dueDate`) rather than application-level filtering of large result sets.

### Scalability posture
Nothing above requires a rewrite as usage grows: the job queue and worker separation handle AI/analytics load independently of the web tier, the reference-based data model (Section 12) avoids document-size ceilings, and the domain model (Section 11) already anticipates the entities that future features will need without introducing new top-level concepts.

---

## 15. Final Roadmap

The existing roadmap (Phases 1–8, complete through frontend authentication) is preserved as-is. From Phase 9 onward, it is regrouped around the product priorities established in this document, rather than a generic CRUD-then-features order.

### Phase 9 — Core Domain: Projects & Tasks
- Project and Task models (per Section 5/7's conceptual design, translated to schema)
- Project CRUD, membership, project-scoped permissions
- Task CRUD, status, priority, assignee, dependencies (graph relation), subtasks
- Board and list views
- Task detail view with history

### Phase 10 — AI Planning Layer v1
- `ai/` backend module and provider integration
- AI project/task-breakdown generation from plain-language input (the first-run experience in Section 4)
- AI task writing from rough input
- Suggestion accept/edit/reject UI pattern (shared component)
- Task `source` and AI confidence fields wired end-to-end

### Phase 11 — Collaboration
- Comments (threaded, @mentions)
- Notifications (digest-first, AI-prioritized, direct-mention real-time exception)
- Presence indicators
- Real-time task/status updates (scoped WebSocket channel)

### Phase 12 — AI Intelligence Layer v2
- Dependency graph → critical path computation
- Blocker detection (stalled tasks, silent dependencies)
- Delay prediction against milestones
- Risk analysis (single points of failure, low-slack chains)
- Background job/worker infrastructure (queue, Redis-backed)

### Phase 13 — Dashboard & Digest
- Personalized daily digest per user
- Weekly project summary generation
- Milestone health indicator (on track / at risk / slipping)
- Precomputed, cached dashboard aggregations

### Phase 14 — Knowledge & Context Memory
- Knowledge entity and storage
- AI Agent context injection from Knowledge at planning/suggestion time
- Sprint/cycle retro draft generation (summarizes what shipped/slipped and why)

### Phase 15 — Goals & Milestones
- Goal entity, many-to-many linkage to Task
- Milestone entity and roll-up views
- Cross-project goal tracking view

### Phase 16 — Sharing & External Access
- Read-only external sharing links
- Guest/stakeholder-scoped permission tier

### Phase 17 — Integrations
- GitHub integration (PR/commit → Activity, → AI task-writing input)
- Slack integration (digest delivery, mention notifications)
- Calendar integration (milestone/due-date sync)

### Phase 18 — Deployment & Hardening
(Unchanged from existing roadmap Phase 14 — Docker, CI/CD, production deployment, Redis for rate limiting/caching, monitoring, structured logging.)

Each phase builds only on entities and infrastructure already introduced in a prior phase — no phase requires revisiting the core Task/Project/Goal/Knowledge model defined in Section 5.

> Internal architecture document. Written before domain-level implementation begins.
> This document defines *what we are building and why*, not *how it is coded*. It assumes the current foundation (auth, app shell, backend skeleton) described in `architecture.md`, `authentication.md`, `api-design.md`, and `roadmap.md`, and defines everything above that foundation.

---

## 1. Product Vision

### The actual problem

Every project management tool sells "organize your work." That's not the problem teams actually have. Teams already know what they need to do — the pain is the **coordination tax**: the constant manual bookkeeping required to keep a shared picture of reality up to date. Writing tickets. Breaking epics into tasks. Updating statuses. Chasing people for updates. Estimating. Re-estimating. Writing the standup. Writing the sprint summary. Noticing — usually too late — that something is blocked or slipping.

None of that work produces the product. It's overhead paid to keep humans synchronized. Jira, Linear, ClickUp, Notion, Asana — they all make that overhead *faster to perform*. None of them make it *disappear*. That is the opening.

**AI Project Manager's actual job**: absorb the coordination tax. Not "AI helps you use a PM tool faster" — the AI *is* the project manager function. The software's job is to maintain an accurate, current, honest picture of the project with as little manual human bookkeeping as possible, and to surface only the decisions that actually require a human.

### Ideal user

- Small-to-mid engineering/product teams (roughly 3–30 people) building software, without a dedicated full-time PM.
- Technical founders and tech leads who currently do project management as an unpaid second job.
- Teams that are disciplined enough to *write down* what they're doing (commits, PRs, docs, Slack) but are tired of *re-writing* the same information into a tracker by hand.
- Teams that have tried Linear or Jira and correctly identified that the tool is fast, but the *work of using the tool* is still 100% manual.

### Explicitly not the ideal user

- Large enterprises that need governance, custom workflow approval chains, and compliance audit trails as a primary requirement — that is Jira's actual moat, and competing head-on there is a losing, multi-year battle.
- Non-technical teams whose primary need is a flexible wiki/document workspace (Notion's core use case) — our data model is intentionally opinionated and task-centric, not freeform.
- Solo users looking for a personal to-do app — the value of this product is proportional to team coordination overhead, which barely exists at n=1.

### Why someone switches

- **From Jira** — because Jira demands upfront configuration (workflows, issue types, custom fields, boards) before it's useful, and that configuration itself becomes a second maintenance burden. We ship zero-configuration and let AI do what a Jira admin would otherwise hand-configure.
- **From Linear** — because Linear is excellent UX around a task list, but every task, estimate, and status transition is still typed by a human. Linear optimized the *interface*; we optimize the *labor*.
- **From Notion** — because Notion has no opinion about what a task, a project, or a status even is. Teams build their own ad hoc project management system inside it and it rots within two quarters. We ship the opinion, so teams don't have to invent one.

### Why someone stays

Not lock-in through data export friction — that's a bad reason and we will not engineer for it. The real reason to stay is that the AI Agent accumulates project-specific context over time (decisions made, why an approach was rejected, who owns what, historical velocity, recurring blockers). That context is genuinely expensive to rebuild elsewhere. Retention is earned through accumulated understanding, not switching cost.

### The five-year shape

If this works, the product doesn't grow by adding more surface area — it grows by knowing more. The honest test of five-year success isn't "how many features shipped" but "how much of the coordination tax has actually disappeared." Concretely, that means:

- **Planning becomes forecasting.** Today the AI proposes a task breakdown from a description. In five years, given enough accumulated Knowledge and Activity history, the same AI's estimate for "how long will this feature take this specific team" should be trustworthy enough that the roadmap view is not aspirational — it's a forecast a business can actually plan around.
- **The dashboard becomes the job.** Not a tool a project manager checks — for teams without a dedicated PM, the AI Agent effectively performs enough of that function that "who's our PM" stops being a hiring question a 15-person engineering team has to answer.
- **The product's value curve inverts relative to competitors.** Jira, Linear, and Notion get marginally better with scale (more users, more integrations, more workflow flexibility). This product should get *categorically* better with time on a single team, because the moat is accumulated understanding, not configuration. A team on month eighteen should get materially different value than a team on day one, using the identical feature set.
- **What we still won't be.** Even at scale, this doesn't become a general-purpose work platform (Notion's trajectory) or a governance/compliance suite (Jira's enterprise trajectory). The boundary in Section 13 doesn't loosen with success — it's the thing that keeps the AI's context sharp enough to be useful. A product that tries to be everything can't accumulate the specific understanding that makes this one worth staying on.

The philosophy doesn't change shape as the product grows. It just gets to be true at a level of depth that isn't achievable on day one — the same coordination tax, absorbed more completely, for a team the AI has now genuinely worked alongside for years instead of weeks.

---

## 2. Core Philosophy

- **AI-first, not AI-bolted-on.** The AI is not a feature added to a CRUD tracker. The tracker exists to give the AI a structured place to act.
- **Narrate work, don't file paperwork.** The primary human interaction is describing what happened in plain language; structured records are a byproduct, not the input method.
- **Opinionated over configurable.** Every configuration option is a decision the user has to make instead of doing their job. Defaults should be right for 90% of teams; escape hatches exist but are never required to get value on day one.
- **Signal over noise.** Every surface (dashboard, notification, digest) is a curation problem before it's a display problem. Showing everything is the same as showing nothing.
- **Single source of truth.** One task graph. Every view (board, list, calendar, AI digest) is a projection of the same underlying data — never a parallel copy that can drift.
- **Automation by default, override by exception.** The system should do the mechanical work automatically and ask forgiveness/confirmation for anything irreversible — not require the human to trigger every step.
- **Context compounds.** The product should get more useful the longer a team uses it, because the AI's understanding of the project deepens. This is the actual moat, not the UI.
- **Trust through transparency.** AI never acts as an unaccountable authority. Every suggestion shows its reasoning and source data. Every AI-originated change is visibly distinct from a human-originated change in history.

### The compounding loop

The philosophy above implies a specific loop, worth making explicit because it's the actual long-term competitive advantage, not a byproduct of it:

```
Human does the work (writes code, ships PRs, makes decisions, comments)
        ↓
AI observes it (via Activity, Integrations, Comments, task history)
        ↓
Knowledge grows (decisions, patterns, velocity, recurring blockers)
        ↓
Predictions improve (estimates, risk flags, delay forecasts get more accurate)
        ↓
Planning improves (breakdowns, scheduling, sprint proposals need less correction)
        ↓
Manual work decreases (fewer edits to AI suggestions, fewer status updates needed)
        ↓
Knowledge grows again, from a higher base
```

Two things make this a moat rather than a nice diagram. First, it compounds *per team*, not globally — a competitor can copy the UI or the feature list overnight, but they cannot copy eighteen months of a specific team's decisions, rejected approaches, and velocity patterns. Second, every stage of the loop is already a named capability elsewhere in this document (Activity, Knowledge, AI predictions, Section 8's suggestion pattern) — this isn't a new subsystem to build, it's the existing architecture, running. The product doesn't need a separate "flywheel feature." It needs the existing pieces to keep feeding each other, which is precisely what Sections 5, 8, and 12 are already built to do.

This is also why Design Principle 3 (reversibility) and Section 8's show-your-work constraint matter more than they might first appear to: a loop like this only compounds correctly if humans keep correcting it when it's wrong. An AI that acts silently, or that can't be traced back to its reasoning, breaks the loop at the one point where it needs human signal the most — the correction itself is training data.

---

## 3. Design Principles

These are binding. A proposed feature that fails any of these should not ship in its current form.

1. **Effort test** — the feature must reduce total human effort across the team, not just move effort into a new surface.
2. **Zero-setup test** — a feature must deliver value with its default configuration. If it requires setup before first use, the setup must be optional, not gating.
3. **Reversibility test** — any AI-initiated change must be visibly undoable. Nothing AI does should be silently permanent.
4. **Single-truth test** — no feature may introduce a second place where the same fact is stored or displayed independently of the canonical record.
5. **"What do I do next" test** — every primary screen must make the next required human decision more obvious than the version before it, not just prettier.
6. **Fallback, not primary, test** — manual data entry must always be *possible*, but never the intended default path for the majority of updates.
7. **Actionable notification test** — a notification that doesn't require or invite a decision should be a digest line, not a push notification.
8. **One-sentence test** — if the value of a feature cannot be explained in one sentence to a non-technical user, it is not ready to ship, no matter how technically interesting.
9. **Progressive disclosure test** — advanced capability is allowed to exist, but must be hidden until the user has a reason to need it. Complexity is layered, never flattened onto the default view.
10. **Show-your-work test** — every AI suggestion must be traceable to the input it used (which tasks, which messages, which history). No unexplained authority.

---

## 4. User Journey

### Registration
Standard email/password (already built) with room for OAuth later. No forced onboarding survey — the first real onboarding step *is* the first project.

### Onboarding
No empty state, no blank board. On workspace creation, the user is asked one thing: *describe what you're building, in your own words.* Optionally, they can point at a GitHub repo or paste existing notes. There is no "create your first workflow" step — there is no workflow to create.

### The interview

The one-line description in Onboarding is the trigger, not the input. Before the AI proposes anything, it runs a short, adaptive interview — not a form with required fields, a conversation shaped like the ones a competent engineering lead would actually have before scoping work.

Given "Build an Uber clone," the AI doesn't guess. It asks the two or three questions whose answers would change the shape of the plan the most — platform (web, mobile, both), whether payments and real-time location are in scope for v1 or a later milestone, whether this is a solo build or a team with existing infrastructure to reuse. It does *not* ask about things that don't change the plan (naming conventions, far-future scale targets, anything answerable later without cost).

- **What it asks** — only questions with a real branching consequence: they change which tasks exist, not just their description. A useful heuristic used internally: if the same task breakdown would result regardless of the answer, the question doesn't get asked.
- **When it stops** — as soon as it has enough to produce a breakdown that is *reviewable*, not perfect. The bar is not "no more open questions exist" — it's "the human can now correct a draft faster than they could have answered more questions." Every additional question has a cost (the human's time before they see anything), so the interview optimizes for stopping early and letting the review/edit step (Design Principle 3, Section 8's suggestion pattern) absorb the remaining uncertainty.
- **How it decides "enough"** — by checking the draft it would generate against its own confidence fields (Section 7's AI confidence score): if a plan would ship with several low-confidence estimates or missing dependencies attributable to a specific unanswered question, that question gets asked; if the uncertainty wouldn't measurably change the top-level breakdown, it doesn't.
- **Why this improves planning quality** — a breakdown generated from three well-chosen answers is not just longer, it's *structurally different*: the right dependencies exist between the right tasks because the AI understood the constraint before it started decomposing, instead of producing a plausible-looking breakdown that has to be substantially restructured on first review. This is also what keeps the interview from becoming a Section 13 violation (a configuration wizard in disguise) — it's bounded, disappears once answered, and its entire purpose is to make the very next screen more correct.

### First project
From the plain-language description, the AI Agent proposes: a project name, an initial task breakdown (with dependencies and rough estimates), and a suggested first milestone. The user reviews this like a draft — accepting, editing, deleting, or regenerating individual items — rather than building it field-by-field from scratch.

### First AI interaction
The acceptance/edit step above **is** the first AI interaction — not a separate "try the AI chat" tour. This matters: the first thing the AI does is visibly useful work, not a demo.

### The unforgettable part

Section 1 asks what makes someone switch. The first five minutes are what make them stay. The specific sequence — one-line description, a short interview that clearly *understood* the answers, a task breakdown with real dependencies and estimates sitting in front of them within minutes — has to land as categorically different from "we imported some template tickets for you."

The mechanism that makes this land, not gimmicky, is specificity: the generated breakdown should visibly reflect the interview answers (a task like "Set up Stripe Connect for driver payouts" rather than a generic "Implement payments"), and at least one dependency or estimate should be something the user wouldn't have thought to flag themselves — for example, flagging that real-time driver location tracking blocks the dispatch-matching task, before either has been created as a ticket by hand. That's the moment Section 1's framing predicts: the user isn't impressed that AI wrote tickets — plenty of tools do that badly. They're struck that the breakdown understands *their* project, not projects in general. Everything after that — the daily digest, the sprint proposal, the Knowledge store — is the same trust compounding, not a new kind of surprise. The first five minutes just have to earn the right to be trusted at all.

### Daily workflow
Each user's day starts with a short, personally-scoped digest: what's blocking them, what's due, what the AI flagged overnight (stalled tasks, silent dependencies, at-risk estimates). This replaces the habit of opening a board and scanning it manually.

### Weekly workflow
At the cadence the team chooses (default weekly), the AI proposes a sprint/cycle plan based on backlog priority, historical velocity, and current capacity. The human approves or adjusts scope. At the end of the cycle, the AI drafts a summary of what shipped, what slipped, and why — a first draft of the retro, not a replacement for having one.

### Long-term workflow
Over months, the Knowledge store accumulates decisions, rejected approaches, and recurring patterns (e.g., "auth work always takes 1.5x estimate"). The AI's predictions and suggestions become calibrated to the specific team, and the roadmap view becomes a genuinely reliable forecasting tool rather than a static plan.

---

## 5. Domain Model

Conceptual entities, their purpose, and why each exists as its own concept rather than being folded into another.

### Workspace
The organizational container — billing, membership, and workspace-wide settings live here. A user can belong to multiple workspaces (e.g., contractors, multiple teams). Exists separately from Project because permissions, billing, and cross-project goals must exist above any single project.

### Project
A scoped body of work with its own task graph, timeline, and board. The unit teams actually organize around day to day. Owns its tasks, milestones, and optional sprints.

### Sprint / Cycle
An **optional** time-boxed grouping of tasks within a project. Not mandatory — teams doing continuous flow shouldn't be forced into sprints. Exists as a lightweight grouping over tasks, not a container that owns them (a task's real home is always the project).

### Task
The atomic unit of work — the heart of the system (see Section 7). Everything else in the product exists to make tasks accurate with less effort.

### Milestone
A date-bound marker representing a meaningful checkpoint ("Public beta," "v1 launch"). Distinct from a Goal because a milestone is a *point in time*, not an ongoing outcome. Tasks link to milestones to answer "are we going to hit this date."

### Goal / Objective
A higher-level outcome that can span multiple projects and doesn't have a hard date (e.g., "Reduce onboarding drop-off"). Exists separately from Milestone because outcomes and dates are different axes — conflating them (as many tools do) makes roadmap views lie. Tasks and milestones can roll up into a goal.

### AI Agent
A persistent, contextual assistant scoped to a workspace, with awareness injected per-project. This is **not** a chat session entity — it has no separate "conversation" identity a user manages. It's the mechanism, not a feature the user navigates to. It reads Tasks, Activity, and Knowledge, and writes back Tasks, Comments, and Knowledge entries (always as clearly-attributed AI actions).

### Knowledge
A store of durable context: decisions made, approaches rejected and why, conventions, recurring risks. This is what makes the AI Agent get smarter over time instead of resetting its understanding every session. Distinct from Comments (which are conversational and task-scoped) and from a general wiki (we are explicitly not building a Notion competitor — see Section 13). Knowledge entries are short, structured, and exist specifically to be retrieved by the AI Agent as grounding context.

### Activity
An immutable, append-only event log referencing any entity. Exists as its own concept (not folded into each entity's history) because it must support cross-entity queries ("what changed in this project today") and because its volume and access pattern (write-heavy, append-only, time-ordered) is fundamentally different from the entities it describes.

### Comment
Conversational, threaded, attached to a Task (or Project). Distinct from Activity: a comment is a human (or AI) statement; Activity is a factual record that something changed.

### Attachment
A file or link associated with a Task or Comment. Kept as its own lightweight entity so it can be referenced from multiple places without duplicating storage.

### Notification
A derived, per-user record pointing at an Activity or Comment that is relevant to that user, with a delivery/read state. Exists separately from Activity because Activity is workspace-truth and Notification is user-specific relevance + state.

### Member / Role
The membership and permission relationship between a User and a Workspace (and optionally a Project-level override). Kept distinct from User because a person's role is a property of their membership, not of their identity.

### Integration
A connection to an external system (GitHub, Slack, calendar) that feeds events into Activity and can be a source for AI-drafted Tasks. Modeled as a pluggable source, not a core dependency — the domain model must be complete and useful with zero integrations connected.

### Knowledge as organizational memory

The Knowledge entity above is described at the level of "what it is." What it becomes with months of use is worth designing deliberately, because it's the concrete mechanism behind Section 2's "context compounds" principle — not just a store the AI reads, but the thing that makes the AI a measurably different (better) project manager in month six than it was in week one.

**What accumulates.** Beyond the decisions-and-rejected-approaches framing already given, the store is designed to accumulate several distinct kinds of pattern, each useful for a different AI capability:

- *Estimation habits* — which task categories a given team systematically under- or over-estimates, and by how much (feeding directly into Section 7's AI-proposed estimates).
- *Recurring blockers* — the same kind of dependency or external wait (e.g., "design review always adds three days") showing up across projects, so blocker detection (Section 8) can flag it as a pattern instead of a one-off.
- *Engineering velocity* — not a single number, but velocity conditioned on task type, team composition, and time of year — the kind of nuance a human PM builds up from memory and a stateless tool can never have.
- *Review patterns* — typical review turnaround, common reasons work bounces back from review, which feeds delay prediction the same way recurring blockers do.
- *Communication patterns* — which kinds of tasks tend to need more clarification/comment threads before completion, useful as an early signal that a similar new task may need the same.
- *Architecture decisions and technical debt* — durable, retrievable context for "why does this system work this way," so future AI-generated plans don't propose work that contradicts a decision the team already made and has reasons for.

**Why this makes the AI a better PM over time, not just a bigger database.** Each of these feeds a specific, already-defined capability (Section 8) rather than existing as undifferentiated stored text: estimation habits calibrate the AI-proposed estimate field, recurring blockers calibrate blocker detection's threshold, velocity patterns calibrate delay prediction, and architecture/tech-debt entries ground planning so it doesn't relitigate settled decisions. The store isn't "smarter" in the abstract — it's more accurate at the five or six things the product actually needs to be accurate at.

### Automatic knowledge

None of the above works if it requires a team to maintain a second documentation system — that would directly violate the effort test (Design Principle 1) and reintroduce exactly the manual bookkeeping this product exists to remove. Knowledge entries are therefore designed to be created as a byproduct of work that was already happening, not as a new authoring task:

- From **meeting/discussion summarization** — the same AI summarization capability already described in Section 8 extracts durable decisions from meeting notes or transcripts, distinct from the ephemeral parts of the conversation.
- From **rejected ideas and comment threads** — when a proposed approach is explicitly rejected in a Comment thread, that rejection and its stated reason is a natural Knowledge candidate, not something a human has to separately write down.
- From **completed projects and retrospectives** — the AI-drafted retro summary (Section 4's weekly workflow) is itself a source: durable takeaways get promoted into Knowledge, transient ones don't.
- From **code review discussion** (via the GitHub integration, Sections 11 and 17) — recurring review feedback is a pattern the same way recurring blockers are.
- From **AI interactions themselves** — an accepted or rejected AI suggestion (Section 8's accept/edit/reject pattern) is itself a signal worth retaining: what did the human change, and does that correction generalize.

Every one of these is AI-*proposed*, never AI-*silent* — consistent with the non-negotiable constraints in Section 8, a proposed Knowledge entry is surfaced for a lightweight confirm/dismiss, not written invisibly. The effort asked of the human is a single tap, not a documentation habit.

### Relationships, ownership, and scalability

- Workspace → Project → Task is a strict containment hierarchy for *ownership and permissions*.
- Goal ↔ Task is many-to-many, because outcomes cut across projects — this is deliberately looser than the containment hierarchy above.
- Sprint groups Tasks within a single Project; it does not own them.
- AI Agent is not owned by any single Project — it's a workspace-level capability that gets project-scoped context injected per interaction. This is what lets a future "cross-project risk" feature exist without a redesign.
- Knowledge is attachable at Workspace or Project level, giving it the same two-tier scoping as everything else, without inventing a third hierarchy.

---

## 6. Project Structure

### What a project contains
Tasks, milestones, optional sprints, project-scoped Knowledge entries, and project-level AI Agent configuration (context, defaults). This is the complete, closed set — a project is a self-contained unit of delivery.

### What never belongs inside a project
- **Cross-project goals** — these live at the workspace/Goal level specifically so a goal can span projects without being awkwardly "hosted" by one of them.
- **Freeform wiki/document content unrelated to delivery** — general company knowledge (onboarding docs, culture docs) is out of scope; Knowledge entries are decision-and-context records for the AI, not a document authoring surface.
- **Personal to-dos unrelated to team delivery** — a project is a shared source of truth; personal task management is a different product with different privacy assumptions.
- **Billing, membership, integrations configuration** — these are workspace-level concerns and must not be duplicated per project.

### Scaling projects
As a workspace accumulates dozens of projects, two things must hold:
1. Projects support archiving without deletion, so history and Knowledge remain queryable by the AI Agent even after a project is no longer active.
2. Large bodies of work are broken down using **parent tasks acting as epics**, not a separate Epic entity — this avoids a fourth level of hierarchy (Workspace → Project → Epic → Task → Subtask) that adds navigation cost without adding real capability. A parent task with subtasks already expresses "epic" semantics.

---

## 7. Task System

The task is the center of gravity of the entire product. Every other feature either creates, modifies, or summarizes tasks.

### Core fields
- **Title, description** — description supports rich text/markdown; can be AI-drafted from a short prompt.
- **Status** — a small, fixed default lifecycle (Backlog → Todo → In Progress → In Review → Done). Status *labels* can be renamed for taste, but we deliberately do not offer an arbitrary workflow/state-machine builder (see Section 13) — that configurability is a Jira trap.
- **Priority** — a simple ordinal scale, AI-suggested by default, human-overridable.
- **Assignee(s)** — supports a primary owner; multiple watchers/collaborators are a separate lightweight relation, not additional assignee slots.
- **Estimate** — optional; can be a point value or time. AI proposes an initial estimate based on historical velocity for similar tasks; humans can accept or override. Never a required field to create a task.
- **Due date** — optional at the task level; usually inherited/implied by the milestone it rolls up to rather than set individually for every task.
- **Dependencies** — modeled as a directed relationship (`blocks` / `blocked by`) between tasks, enabling critical-path computation. This is what makes delay prediction (Section 8) possible.
- **Parent / subtask** — a single level of self-reference, used both for literal subtasks and for "epic-as-parent-task" (Section 6). Deliberately not unlimited nesting.
- **Labels/tags** — free-form, lightweight categorization, orthogonal to status.
- **AI fields** — AI-generated summary, AI confidence score on the estimate, AI-detected risk flag with reason, AI-suggested next action. These are always visually distinguished from human-entered fields.
- **History** — a full changelog of every field transition, sourced from Activity, scoped to the task.
- **Linked goal / milestone** — optional roll-up references.
- **Comments, attachments** — as defined in Section 5.
- **Source** — records whether the task originated from a human, an AI planning pass, or an integration import. This single field underlies a large amount of trust-building UI (Section 2's "show your work" principle) at essentially no modeling cost.

### Dependencies as a graph, not a list
Because dependencies are directed edges between tasks, the system can compute: the critical path to a milestone, which tasks are silently blocking the most downstream work, and where a single assignee sits on more critical-path tasks than is safe. This graph is the substrate the AI's blocker-detection and delay-prediction features run on — it is not optional infrastructure, it's the reason those features are possible at all.

### Automation philosophy
We deliberately avoid a general-purpose "if this then that" rules engine as the primary automation mechanism (that is the ClickUp trap: endless rule configuration that becomes its own maintenance burden). Instead, automation is AI-driven and suggestion-based by default: e.g. "this task's subtasks aren't done — did you mean to mark it Done?" rather than a hard rule the user had to author. A small number of genuinely deterministic, low-risk automations (e.g., auto-move to "In Review" when a linked PR is opened) are hardcoded behaviors, not user-authorable rules — keeping the system opinionated rather than configurable.

---

## 8. AI — The Core Differentiator

The single most important constraint: **the AI is not a chatbot bolted onto a tracker.** A sidebar chat window is the failure mode we are explicitly avoiding — it puts the burden of initiating every useful interaction back on the human, which is exactly the coordination tax we're trying to eliminate.

Instead, the AI Agent is a set of ongoing, contextual capabilities that act on the task graph directly:

- **Planning** — turns a plain-language project or feature description into a structured task breakdown, complete with dependencies and initial estimates, presented as an editable draft.
- **Scheduling** — continuously proposes backlog ordering based on priority, dependency graph position, and current team capacity — not a one-time sort, an ongoing recommendation.
- **Breaking down work** — given a single large task, proposes a decomposition into subtasks sized appropriately based on the team's historical task-completion patterns.
- **Blocker detection** — scans the dependency graph and Activity for tasks that are stalled (no status change or comment past a learned threshold) or silently blocking multiple downstream tasks, and surfaces them proactively rather than waiting to be asked.
- **Delay prediction** — combines historical velocity, current burn rate against the critical path, and dependency risk to forecast whether a milestone will land on time, *before* it's obviously late.
- **Task writing** — converts rough input (a Slack message, a commit, a voice note, a one-line idea) into a properly structured task with title, description, and suggested fields.
- **Summaries** — daily personal digest, weekly project summary, and meeting-notes-to-action-items conversion.
- **Risk analysis** — surfaces cross-task risk patterns: dependency chains with no slack, single points of failure (one person owning too much of the critical path), and tasks with degrading estimate confidence.
- **Sprint planning copilot** — proposes cycle scope from the backlog given known velocity and priority, which the human approves or adjusts rather than building from a blank board.
- **Context awareness** — every AI action is grounded in the Knowledge store, so suggestions reflect decisions the team has already made, not generic advice. This is what separates the AI Agent from a stateless LLM call.
- **Documentation generation** — auto-drafts changelogs and release notes from completed tasks in a cycle, as a starting draft, not a final artifact.
- **Daily planning** — a genuinely personalized "what should I do today" view generated per user, not a filtered version of the shared task list.

### Non-negotiable constraints on AI behavior
1. Every AI action is a **suggestion** with an explicit accept/edit/reject affordance — never a silent write, except for the small set of low-risk, clearly-scoped automations named in Section 7.
2. Every AI-originated change is tagged distinctly in Activity and Task `source`, so a team can always tell what the AI did versus what a human did.
3. Every suggestion is explainable on demand — the reasoning and the specific data points used (which tasks, which history, which Knowledge entries) are inspectable, not asserted.
4. AI actions that touch multiple tasks at once (e.g., a full re-plan) are always presented as a reviewable diff, never applied in bulk without a preview.

### Self-improving: closing the loop

Every AI-generated field in Section 7 (an estimate, a priority, a risk flag) is a prediction, and every prediction eventually resolves against reality — a task marked "4 days" eventually actually takes some number of days. The AI Agent is designed to close that loop rather than let each prediction be forgotten the moment it's made.

- **Confidence evolution.** The AI confidence score attached to an estimate (Section 7) isn't fixed at creation time — it's recalculated as the task moves through its lifecycle (does actual time-in-status track the estimate so far, are there new blockers that weren't accounted for), and the *reason* the confidence changed is retained as part of the task's AI fields, consistent with the show-your-work principle.
- **Prediction feedback loops.** When a task closes, the gap between predicted and actual (estimate vs. time-to-done, predicted risk vs. whether it actually slipped) is written back — not into the Task itself, which is a record of the work, but into Knowledge as an estimation-habit entry (see Section 5), scoped to the task category and, where relevant, the assignee. This is what keeps the AI's calibration current instead of static.
- **Learning from accepted/rejected suggestions.** The accept/edit/reject pattern above already captures a signal on every suggestion; that signal is the training data for the loop, not just a UI affordance. An edited estimate is more informative than an accepted one — it tells the AI not just *that* it was wrong but *by how much and in which direction*, which is what estimation-habit entries in Knowledge actually store.
- **Learning from project outcomes.** At the project or milestone level, the same comparison happens one level up: did the AI's delay prediction land, was the flagged risk the thing that actually caused the slip. These outcomes feed the same Knowledge store, at the pattern level (Section 5) rather than as one-off facts, so the AI's delay-prediction capability itself gets more accurate with each completed milestone.

This closes the loop described in Section 2's compounding-loop: prediction → outcome → Knowledge → better prediction. Nothing here requires a new entity — it's the existing Task, Activity, and Knowledge relationship (Sections 5 and 12), read and written by an AI capability that already exists above, just with an explicit obligation to check its own past predictions against what actually happened. The AI doesn't improve because it was retrained on more general data; it improves because it was held accountable, per team, to its own track record.

---

## 9. Dashboard

### What it shows
A short, curated set of items that require a human decision *today* — not a comprehensive view of everything. Concretely: tasks blocked on this person, items due soon, AI-flagged risks awaiting a response, and a single-line delay/health indicator per active milestone. Target length: something a person can fully read in under a minute.

### What is useful
- Decisions waiting on you, ranked.
- What changed since you last looked that actually matters (not every field edit — only status changes, new blockers, new AI flags).
- One clear signal per milestone: on track / at risk / slipping, with the reason.

### What is noise, and therefore excluded from the default dashboard
- Burndown charts that nobody actually changes behavior in response to.
- A raw activity firehose.
- Vanity metrics (total tasks created, total comments) that don't map to a decision.
- A full board view — the board still exists, but it's a separate destination, not the landing screen. The dashboard's job is triage, not browsing.

### The daily operating system

The dashboard as scoped above (a short, curated, decision-focused view) is the right shape for a single screen. Zoomed out, it's meant to be more than a screen a user visits — it's meant to be the first thing opened each morning, the way an inbox or a calendar is, rather than a destination visited when something reminds you to check on a project.

That reframing doesn't add new surface area beyond what's already scoped above — it changes what the existing components are asked to add up to:

- **Morning Brief** — the personalized daily digest (Section 8, Section 4's daily workflow) is the entry point, not a separate notification: today's priorities, what's blocking you, what the AI flagged overnight, framed as "here's your day," not "here's a list of tickets."
- **Today's priorities / personal focus** — the daily-planning AI capability (Section 8) surfaces a small, ranked set of what this specific person should work on today, distinct from the shared board — a personal projection of the shared task graph, consistent with Section 2's single-source-of-truth principle (it's a view, not a copy).
- **Blockers, risks, decision queue** — already covered by "decisions waiting on you, ranked" above; framed here as a queue specifically because the operating-system framing implies the user works through it, not just reads it.
- **Project health** — a per-project signal, expanded below, sitting alongside the personal items rather than requiring a separate destination to check.

The test for whether this framing is earned, not aspirational: on a day with no meetings and no Slack open, could a person do a full, correctly-prioritized day of work having only opened this screen. If the answer is no, something that belongs in the Morning Brief is missing; if the answer requires ten screens to get there, the curation described above has failed. This is the same triage-not-browsing mandate as before, held to a higher bar.

### Project Health, modeled

The one-line milestone indicator already specified ("on track / at risk / slipping, with the reason") implies a model behind it, worth making explicit so the score is never a black box.

Health is not a single opaque number rolled up from arbitrary weights — it's a small set of explainable sub-signals, each independently inspectable, matching Design Principle 10 (show-your-work):

- **Delivery confidence** — from the delay-prediction capability (Section 8), itself grounded in velocity Knowledge and current burn against the critical path.
- **Dependency health** — derived directly from the dependency graph (Section 7): how much slack exists on the critical path, how many tasks are silently blocking multiple others.
- **Blocker severity** — count and age of currently-flagged blockers (Section 8's blocker detection), weighted by how many downstream tasks they affect.
- **Estimation confidence** — the aggregate of task-level AI confidence scores (Section 7, and the self-improving mechanism in Section 8) across the project's open tasks.
- **Workload balance** — whether critical-path work is concentrated on too few people (the single-point-of-failure signal already named under Risk analysis in Section 8).
- **Review backlog** — how much completed work is waiting in review relative to the team's typical review turnaround (from the review-pattern Knowledge described in Section 5).
- **AI confidence in the score itself** — because the health score is itself a prediction, it inherits the same confidence-evolution treatment as any other AI field; a health score computed from thin history (a brand-new project) is visibly less certain than one computed from months of Knowledge.

The one-line indicator surfaced on the dashboard is a *summary* of these sub-signals, not a replacement for them — clicking into it always shows which of the seven pushed the score down and why, in plain language ("slipping — two tasks on the critical path have been in In Progress twice as long as their estimate, and both are owned by the same person"). A health score that can't answer "why" on demand isn't a health score, it's a vanity metric wearing a different color — exactly what this section already excludes.

---

## 10. Collaboration

- **Comments** — threaded per task, support @mentions, support both human and AI authorship (clearly labeled).
- **Mentions** — trigger a notification directly, bypassing digest batching, since a mention is inherently a direct request for a specific person's attention.
- **Activity** — the canonical event log (Section 5); the UI surfaces filtered slices of it (per task, per project) rather than one global feed.
- **Presence** — shown subtly (an avatar on a task someone is currently viewing/editing) to prevent duplicate work, never as a broadcast "who's online" feature — presence is a collision-avoidance signal, not a social one.
- **Permissions** — role-based at the workspace level (owner/admin/member/guest), with an optional project-level override for cases like external collaborators who should only see one project.
- **Sharing** — read-only links for stakeholders without accounts (e.g., a client viewing a milestone's status) — this is deliberately one-directional and scoped, not a full guest-account system, to avoid permission-model complexity early on.
- **Notifications** — batched and AI-prioritized by default (a digest, not a firehose); direct mentions and hard blockers on your own work are the only things that interrupt in real time. This follows directly from Design Principle 7 (actionable notification test).

---

## 11. Future Expansion

The domain model is deliberately shaped so the following can be added without restructuring the core:

- **Multi-workspace orgs / enterprise hierarchy** — Workspace already exists as the top-level container; an Organization entity can wrap multiple Workspaces later without touching Project or Task.
- **Deeper integrations (GitHub, Slack, Calendar)** — modeled as event sources feeding Activity and as an AI planning input, already anticipated in Section 5's Integration entity.
- **Formal OKR/Goal tracking** — Goal already exists as a distinct, cross-project entity; a dedicated OKR view is additive UI over existing data, not a new domain concept.
- **Resource/capacity planning** — becomes possible once Task estimates and assignment are consistently populated, which the AI's scheduling feature already needs and produces as a side effect.
- **Client-facing portals** — an extension of the read-only sharing links already defined in Section 10, scoped with more granular field visibility.
- **Mobile app** — the API-first backend and thin-controller architecture already in place (Section 12/14) means mobile is a new client against the same API, not a backend change.
- **Enterprise SSO / audit trail** — Activity is already an immutable, append-only log; formal audit/export is a reporting layer on top of existing data, not a new logging mechanism.

The unifying reason this works: every anticipated future feature is a *new view or a new consumer* of the existing five core entities (Task, Goal, Knowledge, Activity, AI Agent context), not a request for a sixth core entity. That is the test we'll keep applying to future proposals.

---

## 12. Database Decisions (Architectural Rationale)

*Not schemas — the reasoning behind how entities relate at the storage layer.*

- **Task as a top-level, independently-referenced collection (not embedded in Project).** Tasks are queried, filtered, and searched independently at high volume (by assignee, by status, across projects for a personal digest). Embedding tasks inside a Project document would force loading an entire project's task list for any single-task operation and would hit MongoDB's document size ceiling on large projects. Independent indexing on `projectId`, `assigneeId`, `status`, and `dueDate` is required for the dashboard and AI queries to be fast.

- **Dependencies and subtasks as references, not embedded arrays of full task data.** Dependencies form a graph that must support traversal (critical path, blocker detection) — storing only the referenced IDs keeps documents small and lets graph queries stay index-driven rather than requiring full document scans.

- **Activity as its own append-only collection, referenced polymorphically by `entityType` + `entityId`.** Activity volume grows far faster than any other entity (every field change, every status transition, every AI action). Isolating it prevents write-heavy activity logging from bloating or contending with the read patterns of Task and Project documents, and lets it be pruned/archived independently over time.

- **Comments referenced to Task, not embedded.** Comment threads are unbounded in principle and paginate independently of the task they belong to; embedding risks the same document-growth problem as embedding tasks in projects, and prevents efficient "latest comments across my tasks" queries.

- **Knowledge as a separate collection, structured for retrieval.** Knowledge entries exist specifically to be fetched as AI grounding context, which means they need to support future semantic/vector retrieval independent of how Tasks or Projects are queried. Coupling it to another entity's schema would constrain that evolution.

- **Workspace → Project as reference-based, not embedded.** A workspace can contain many projects, and projects must be independently loadable, archivable, and permission-scoped without pulling the entire workspace document.

- **AI suggestion metadata (confidence, source, flag reason) embedded directly on the Task document.** Unlike Comments or Activity, this data is small, bounded (a handful of fields), and is *always* read together with the task itself — every task view needs to know whether a field is AI-suggested. Embedding here avoids an unnecessary join/lookup for data that has no independent existence apart from its parent task.

The general rule applied throughout: **embed only what is small, bounded, and always read together with its parent; reference everything that is unbounded in growth, independently queried, or needs its own indexing strategy.**

---

## 13. Things We Will Explicitly NOT Build

Each of these is attractive on its own, and each violates a principle in Section 3.

- **A custom workflow/state-machine builder.** This is Jira's core complexity trap — endless admin-configured statuses and transitions that become their own maintenance burden. Violates the zero-setup and opinionated-over-configurable principles.
- **Time tracking and billing.** A different product with a different buyer and a different core loop. Building it invites scope creep away from "reduce coordination overhead" toward "become an invoicing tool."
- **A full WYSIWYG wiki/document system.** That is Notion's product. Knowledge exists specifically as short, structured, AI-retrievable context — not a document authoring surface. Competing with Notion head-on on documents is a distraction from the actual differentiator.
- **Gamification (points, streaks, badges).** Actively undermines "signal over noise" — it adds a layer of noise designed to be engaging rather than useful, and it incentivizes task-count over task-value.
- **Fully autonomous AI actions with no human confirmation on anything irreversible or high-stakes.** Violates the reversibility and show-your-work principles directly. Autonomy without an approval step is how trust gets destroyed in one bad suggestion.
- **Deeply nested hierarchies (Epic > Story > Subtask > Sub-subtask).** A single level of parent/subtask, with parent tasks doubling as epics, is sufficient and avoids the navigation overhead of a four-level tree.
- **A generic chatbot sidebar as the primary AI interface.** This is the exact failure mode described in Section 8 — it re-introduces the burden of remembering to ask, which is the coordination tax we exist to remove.
- **A custom field builder with unlimited field types.** Every arbitrary custom field is a configuration decision the team has to make and maintain, and it fragments the schema the AI is reasoning over.
- **Public roadmap pages, form builders, or a general no-code app-builder layer.** These are adjacent products (Productboard, Typeform, Airtable) that would dilute focus rather than deepen the core loop.

---

## 14. Engineering Decisions

These extend the architecture already established in `architecture.md`, specifically for the domain and AI layers.

### Backend
- Continue the existing service-layer pattern (thin controllers, all logic in services) for Project, Task, Goal, and Knowledge — no exception for AI-related endpoints.
- Introduce a dedicated `ai/` module, separate from `services/`, containing prompt templates, agent orchestration, and provider client calls. Business services call into `ai/` the same way they'd call any other internal service — the rest of the codebase should not know or care which model or provider is behind a suggestion.
- AI-heavy operations (full project planning, delay prediction across a whole project, digest generation) run as **background jobs**, not blocking HTTP request/response cycles. A lightweight job queue (e.g., BullMQ backed by Redis, already stubbed in `lib/redis.ts`) fits the existing lazy-initialized `lib/` pattern.
- Predictive/analytical workloads (delay prediction, velocity calculation) live in their own worker process separate from the web server, so they can scale independently as project/task volume grows.

### API philosophy
- Core resources (`/projects`, `/tasks`, `/goals`, `/milestones`) remain conventional REST, consistent with the existing `api-design.md` conventions and response envelope.
- AI actions are modeled as their **own resource verbs**, not folded into CRUD endpoints — e.g. `POST /ai/plan`, `POST /ai/summarize`, `POST /ai/tasks/:id/breakdown`. This keeps AI suggestions inspectable and reviewable as first-class API responses (a proposed diff), rather than a side effect hidden inside a normal task update.
- Every AI endpoint response includes the suggestion, its confidence, and its source references — matching the show-your-work principle at the API level, not just the UI level.

### Frontend
- New domain features (`projects`, `tasks`, `ai`) follow the existing feature-first structure already used for `auth` — `types/`, `validators/`, `services/`, `hooks/`, `components/`, `pages/` per feature.
- AI suggestion UI (accept/edit/reject) is built as a **shared, reusable pattern** across features rather than bespoke per surface (task creation, sprint planning, digest) — since the same interaction shape ("here's a suggestion, confirm or adjust it") recurs everywhere AI touches the product.
- Real-time updates (task status changes, presence) use a narrowly-scoped WebSocket channel per project — not a general-purpose real-time layer for every entity, to keep the surface area and failure modes small.

### Performance & caching
- Dashboard aggregations (today's digest, milestone health) are precomputed by background jobs and cached (Redis), not computed live on every page load — this keeps the highest-traffic screen fast regardless of project size.
- Task list/board queries rely on the indexing strategy defined in Section 12 (`projectId`, `assigneeId`, `status`, `dueDate`) rather than application-level filtering of large result sets.

### Scalability posture
Nothing above requires a rewrite as usage grows: the job queue and worker separation handle AI/analytics load independently of the web tier, the reference-based data model (Section 12) avoids document-size ceilings, and the domain model (Section 11) already anticipates the entities that future features will need without introducing new top-level concepts.

---

## 15. Final Roadmap

The existing roadmap (Phases 1–8, complete through frontend authentication) is preserved as-is. From Phase 9 onward, it is regrouped around the product priorities established in this document, rather than a generic CRUD-then-features order.

### Phase 9 — Core Domain: Projects & Tasks
- Project and Task models (per Section 5/7's conceptual design, translated to schema)
- Project CRUD, membership, project-scoped permissions
- Task CRUD, status, priority, assignee, dependencies (graph relation), subtasks
- Board and list views
- Task detail view with history

### Phase 10 — AI Planning Layer v1
- `ai/` backend module and provider integration
- AI project/task-breakdown generation from plain-language input (the first-run experience in Section 4)
- AI task writing from rough input
- Suggestion accept/edit/reject UI pattern (shared component)
- Task `source` and AI confidence fields wired end-to-end

### Phase 11 — Collaboration
- Comments (threaded, @mentions)
- Notifications (digest-first, AI-prioritized, direct-mention real-time exception)
- Presence indicators
- Real-time task/status updates (scoped WebSocket channel)

### Phase 12 — AI Intelligence Layer v2
- Dependency graph → critical path computation
- Blocker detection (stalled tasks, silent dependencies)
- Delay prediction against milestones
- Risk analysis (single points of failure, low-slack chains)
- Background job/worker infrastructure (queue, Redis-backed)

### Phase 13 — Dashboard & Digest
- Personalized daily digest per user
- Weekly project summary generation
- Milestone health indicator (on track / at risk / slipping)
- Precomputed, cached dashboard aggregations

### Phase 14 — Knowledge & Context Memory
- Knowledge entity and storage
- AI Agent context injection from Knowledge at planning/suggestion time
- Sprint/cycle retro draft generation (summarizes what shipped/slipped and why)

### Phase 15 — Goals & Milestones
- Goal entity, many-to-many linkage to Task
- Milestone entity and roll-up views
- Cross-project goal tracking view

### Phase 16 — Sharing & External Access
- Read-only external sharing links
- Guest/stakeholder-scoped permission tier

### Phase 17 — Integrations
- GitHub integration (PR/commit → Activity, → AI task-writing input)
- Slack integration (digest delivery, mention notifications)
- Calendar integration (milestone/due-date sync)

### Phase 18 — Deployment & Hardening
(Unchanged from existing roadmap Phase 14 — Docker, CI/CD, production deployment, Redis for rate limiting/caching, monitoring, structured logging.)

Each phase builds only on entities and infrastructure already introduced in a prior phase — no phase requires revisiting the core Task/Project/Goal/Knowledge model defined in Section 5.