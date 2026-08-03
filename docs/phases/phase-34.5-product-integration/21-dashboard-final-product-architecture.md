# Phase 34.5 — Dashboard V5: Adaptive Dashboard Lifecycle, User Journey & Final Product Architecture Specification

## Executive Summary & Product Vision

This document defines the **Definitive Single Source of Truth** for the AI Project Manager workspace dashboard.

The fundamental flaw of typical SaaS dashboards is that they are built as static pages — rendering identical grid cards whether a workspace was created 3 minutes ago or 3 years ago. High-maturity SaaS platforms like **Linear**, **Vercel**, and **Notion** succeed because their interfaces are **Adaptive Systems**: they dynamically evolve across the workspace lifecycle, employing progressive disclosure to preserve visual calm, maximize focus, and eliminate cognitive noise.

This architecture establishes a **Dual Independent Stream System** governed by **Progressive Disclosure** and a **5-Stage Workspace Maturity Model**.

---

## 1. The 5-Stage Workspace Maturity Model

The dashboard dynamically transforms its structure, visible components, and layout density based on workspace age, data volume, and team size:

```
[STAGE 1: EMPTY WORKSPACE]      --> Onboarding Hero + Single Quick Start Card (Zero Dead Cards)
            ↓
[STAGE 2: FIRST ACTIVE PROJECT] --> Primary Stream Activates (Focus Today + 1 Project Card)
            ↓
[STAGE 3: GROWING WORKSPACE]    --> Full Dual Stream Activates (Tasks + Projects + AI Insights)
            ↓
[STAGE 4: TEAM WORKSPACE]       --> Ambient Presence & Realtime Telemetry Layer Activates
            ↓
[STAGE 5: MATURE WORKSPACE]     --> Strict Density Caps, Capped Scroll Feeds, Signal Compression
```

### Detailed Maturity Stage Contracts

#### Stage 1 — Empty Workspace (Brand New Account: 0 Projects, 0 Tasks, 0 Teammates)
- **Visual Goal**: Zero clutter, zero empty grey cards ("No data available"), high-touch onboarding momentum.
- **Visible Elements**:
  1. **`DashboardHero`**: Personalized greeting + *"Welcome to your workspace"*.
  2. **`OnboardingQuickStart`**: Single clean card with 3 sequential onboarding steps:
     - [ ] Create your first project
     - [ ] Create or import tasks
     - [ ] Invite team members
  3. **`AIWorkspaceSetupAssistant`**: Single prompt bar *"Ask AI to bootstrap your project setup"*.
- **Hidden Elements**: `ExecutiveSummaryWidget`, `FocusToday`, `RecentProjects`, `UpcomingDeadlinesWidget`, `AIDailyBrief`, `ActivityTimeline`, `TeamPresenceWidget`, `WorkspaceHealthWidget`.

#### Stage 2 — First Active Project (1 Project, 1–5 Tasks, 1 User)
- **Visual Goal**: Focus on task execution and project orientation.
- **Visible Elements**:
  1. `DashboardHero` (Standard greeting).
  2. `FocusToday` (Renders 1–5 tasks in Primary Stream).
  3. `RecentProjects` (Renders 1 active project card in Primary Stream).
  4. `QuickActionsBar` (Compact keyboard action bar).
- **Hidden Elements**: Telemetry stats (`ExecutiveSummaryWidget`), AI recommendations (not enough data yet), `ActivityTimeline`, `TeamPresenceWidget`.

#### Stage 3 — Growing Workspace (2–5 Projects, 10–30 Tasks, 1–5 Teammates)
- **Visual Goal**: Full operational workflow balancing execution, deadlines, and project navigation.
- **Visible Elements**:
  - Full **Dual Stream Layout** activates.
  - **Primary Stream**: `FocusToday` → `UpcomingDeadlinesWidget` → `RecentProjects`.
  - **Secondary Stream**: `QuickActions` → `AI Workspace Assistant`.

#### Stage 4 — Team Workspace (5–15 Projects, 50–200 Tasks, 5–20 Teammates)
- **Visual Goal**: Collaboration awareness, team presence, and velocity tracking.
- **Visible Elements**:
  - Ambient **Team Presence Avatar Stack** activates inside `DashboardHero`.
  - `ExecutiveSummaryWidget` displays active project & completion velocity pills.
  - `ActivityTimeline` audit stream activates at the bottom of the Primary Stream.

#### Stage 5 — Mature Workspace (20+ Projects, 200+ Tasks, Large Audit History)
- **Visual Goal**: Preventing information overwhelm; compressing high-density data into signal.
- **Density Controls**:
  - `FocusToday`: Hard cap of **5 visible tasks** + `+X more` trigger button → `/tasks`.
  - `RecentProjects`: Hard cap of **4 active projects** + View All link.
  - `ActivityTimeline`: Hard cap of **6 visible events** inside a **400px capped scroll container**.
  - `UpcomingDeadlines`: Hard cap of **5 items** categorized by urgency.

---

## 2. Progressive Disclosure & Adaptive Visibility Rules

Every widget adheres to a strict visibility contract governing when it renders, collapses, or hides:

| Widget Component | Visible When | Hidden When | Collapsed / Merged State |
| :--- | :--- | :--- | :--- |
| **`FocusToday`** | `attentionTasks.length > 0` | Stage 1 (0 tasks) | Shows top 5 tasks + `+X more` trigger |
| **`RecentProjects`** | `activeProjects.length > 0` | Stage 1 (0 projects) | Shows top 4 projects sorted by last updated |
| **`UpcomingDeadlines`** | `upcomingTasks.length > 0` | Stage 1 & Stage 2 | Grouped by Overdue / Today / This Week |
| **`AI Workspace Assistant`**| Workspace has ≥ 1 project | Stage 1 (0 projects) | Merges AI Daily Brief + Recommendations into 1 card |
| **`ActivityTimeline`** | Workspace stage ≥ Stage 4 | Stages 1, 2, 3 | Capped at 400px height with internal custom scrollbar |
| **`TeamPresence`** | Workspace stage ≥ Stage 4 | Single-user workspaces | Ambient avatar stack in `DashboardHero` (24px icons) |
| **`WorkspaceHealth`** | Health score < 80% (Warning) | Health score ≥ 80% (Quiet) | Quiet status pill in `DashboardHero` header |

---

## 3. Permanent Product Design Principles (The Linear / Vercel Ethos)

1. **Execution First**: Operational tasks (`FocusToday`) take structural precedence over analytics, telemetry, and AI.
2. **Navigation Before Analytics**: Project wayfinding (`RecentProjects`) sits above reporting charts.
3. **AI is an Assistant, Not a Hero**: AI widgets provide quiet context; they never block or replace user execution.
4. **Historical Information Belongs Below Operational Information**: Chronological logs (`ActivityTimeline`) live at the bottom of the Primary Stream.
5. **Health is Reassuringly Ambient**: Health diagnostics remain quiet pills unless attention is explicitly required.
6. **No Infinite Growth**: Widgets use strict density caps (`slice(0, 5)`) and internal scroll containers. Cards NEVER expand infinitely.
7. **Zero Height Coupling Across Streams**: The layout engine uses `items-start`. Column streams grow 100% independently.
8. **Unified Card Shells**: `DashboardWidgetSlot` guarantees identical `rounded-xl`, `bg-card`, `border-border/60`, and `p-5` padding.
9. **Single Spacing Scale Everywhere**: Section gap `gap-6` (24px), stream gap `gap-6` (24px), card padding `p-5` (20px), header margin `mb-4` (16px).
10. **Calm, High-Signal Interface**: Zero decorative UI. Every element justifies its pixels through direct user utility.

---

## 4. Psychological Information Hierarchy & Visual Eye Trajectory

```
========================================================================================
0–2s | ORIENTATION LAYER (Header Command Bar)
     • Hero Greeting: "Good morning, Rehan"
     • Ambient Presence: 4 Online Team Avatars
     • Quick Shortcuts: ⌘K Palette | ⌘J Copilot
========================================================================================
                                    ↓
========================================================================================
2–5s | OPERATIONAL EXECUTION LAYER (Primary Stream Top - 65% Width)
     • "What urgent tasks need my attention today?" → [FocusToday] (Max 5 items)
========================================================================================
                                    ↓
========================================================================================
5–8s | PROJECT WAYFINDING LAYER (Primary Stream Mid)
     • "Jump directly into my active project workspaces" → [RecentProjects] (Top 4)
========================================================================================
                                    ↓
========================================================================================
8–12s | FORWARD HORIZON & AI ASSISTANCE (Secondary Stream - 35% Width & Primary)
     • "What risks does AI spot? What is due this week?"
     → [AI Workspace Assistant] & [UpcomingDeadlinesWidget]
========================================================================================
                                    ↓
========================================================================================
> 12s | AUDIT TRAIL LAYER (Below the Fold)
     • Chronological audit feed → [ActivityTimeline] (Capped 400px Scroll)
========================================================================================
```

---

## 5. Final Dual-Stream Architecture Composition (Production Blueprint)

```
========================================================================================
HEADER COMMAND BAR (Full Width Container)
========================================================================================
[ DashboardHero: Greeting | Ambient Team Avatars | Health Pill | ⌘K / ⌘J Triggers       ]
[ ExecutiveSummaryWidget: Active Projects (4) | Active Tasks (12) | Velocity (84%)      ]

========================================================================================
DUAL INDEPENDENT STREAM LAYOUT (lg:grid-cols-12 gap-6 items-start)
========================================================================================
PRIMARY STREAM (lg:col-span-7 / 65% Width)   SECONDARY STREAM (lg:col-span-5 / 35% Width)
Vertical flex col gap-6                      Vertical flex col gap-6
-------------------------------------------  -------------------------------------------
1. [FocusToday]                              1. [AI Workspace Assistant]
   • Intent: Immediate task execution           • Intent: Proactive AI risk detection
   • Capacity: Max 5 tasks + shortcut           • Capacity: 4 insights & active signals

2. [RecentProjects]                          2. [UpcomingDeadlinesWidget]
   • Intent: Fast project wayfinding            • Intent: Forward deliverable schedule
   • Capacity: Top 4 active projects            • Capacity: Max 5 upcoming items

3. [ActivityTimeline]
   • Intent: Historical audit trail
   • Capacity: Capped 400px scroll container
========================================================================================
```

---

## 6. Single-Responsibility Component Architecture

```
DashboardPage            --> Data fetching, TanStack Query, error handling & state orchestration
 └── DashboardShell      --> Container width (max-w-7xl), margins, responsive padding
      ├── DashboardHeader --> Hero greeting, ambient team presence, quick action bar
      └── DashboardGrid   --> Dual Stream CSS Grid (lg:grid-cols-12 gap-6 items-start)
           ├── PrimaryStream (65% / 7 cols)   --> FocusToday → RecentProjects → Activity
           └── SecondaryStream (35% / 5 cols) --> AI Workspace Assistant → UpcomingDeadlines
```

### Layer Responsibilities:
- **`DashboardShell`**: Owns max-width (`max-w-7xl`), gutters (`px-4 sm:px-6`), and vertical layout gap (`gap-6`).
- **`DashboardGrid`**: Owns stream allocation (`lg:grid-cols-12`) and enforces `items-start` (zero height coupling across streams).
- **`DashboardWidgetSlot`**: Owns card shell UI (`rounded-xl`, `bg-card`, `border-border/60`), uniform padding (`p-5`), header typography, and loading skeletons.
- **Widgets**: Own internal domain business UI ONLY.

---

## 7. Implementation Roadmap

1. **Step 1**: Create layout engine components in `client/src/features/dashboard/components/layout/`:
   - `DashboardShell.tsx`
   - `DashboardGrid.tsx`
   - `DashboardStream.tsx`
   - `DashboardWidgetSlot.tsx`
2. **Step 2**: Create `AIWorkspaceAssistant.tsx` by merging `AIDailyBrief.tsx` and `WorkspaceRecommendationsCard.tsx`.
3. **Step 3**: Create `DashboardHeader.tsx` integrating `DashboardHero`, ambient `TeamPresence` avatar stack, and quiet health indicators.
4. **Step 4**: Refactor `DashboardPage.tsx` to mount the 5 core operational modules into Primary and Secondary Streams using the Stage-based progressive disclosure rules.
5. **Step 5**: Run automated tests (`npm test DashboardPage.test.tsx`) and verify visual responsiveness across Desktop (1440p+), Laptop (1080p), Tablet (768p), and Mobile.
