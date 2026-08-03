# Phase 34.5 — Dashboard Layout V3: Final Architecture Refinement & Product Composition Specification

## Executive Summary & Architectural Paradigm Shift

This document defines the **Single Source of Truth** for the AI Project Manager dashboard architecture.

### The Core Paradigm Shift: From Rows to Independent Vertical Streams
Traditional web application layouts attempt to organize dashboards into horizontal rows (`Row 1`, `Row 2`, `Row 3`). In modern high-density SaaS products (such as Linear, Vercel, and GitHub), **row grid slices are an anti-pattern**.

The dashboard is hereby re-architected as a **Dual Independent Vertical Stream System**:
- **Primary Stream (65% Desktop Width)**: Owns operational execution, work items, timeline horizons, project navigation, and event audit trails.
- **Secondary Stream (35% Desktop Width)**: Owns quick actions, proactive AI intelligence, ambient team presence, productivity telemetry, and system diagnostics.

Each stream operates with **100% independent vertical rhythm**. Heights never synchronize across streams; cards never stretch to match adjacent containers.

---

## 1. Permanent Architectural Rules

- **RULE 01**: No widget may stretch because a widget in an adjacent stream is taller.
- **RULE 02**: No widget may use `h-full` simply because its neighbor does.
- **RULE 03**: The layout engine must NEVER enforce height equalization across streams.
- **RULE 04**: Only widgets whose internal content naturally expands (e.g. task rosters) may increase height up to explicit density caps.
- **RULE 05**: When list items exceed density caps, widgets must render internal custom scrollbars or `+X more` pagination triggers instead of growing indefinitely.

---

## 2. Psychological Information Hierarchy & Visual Trajectory

| Phase | Time Window | Cognitive Intent | Target Widgets | Visual Target |
| :--- | :--- | :--- | :--- | :--- |
| **0. Hero Glance** | 0 – 2s | Workspace Orientation | `DashboardHero` + `ExecutiveSummary` | Full-width Command Bar |
| **1. Urgent Execution** | 2 – 6s | Immediate Action Items | `FocusToday` | Top of Primary Stream |
| **2. Fast Triggers** | 6 – 8s | Quick Launchpad | `QuickActions` | Top of Secondary Stream |
| **3. Timeline Horizon** | 8 – 11s | Scheduled Deliverables | `UpcomingDeadlinesWidget` | Mid Primary Stream |
| **4. Proactive AI Signals** | 11 – 14s | Risk Assessment | `AIDailyBrief` / `Recommendations` | Mid Secondary Stream |
| **5. Context & Navigation**| 14 – 17s | Project Exploration | `RecentProjects` | Primary Stream |
| **6. Background Context** | > 17s (Scroll) | Telemetry & Audit | `ActivityTimeline` / `Presence` / `Health` | Bottom Streams |

---

## 3. Widget Re-Evaluation & Density Contracts

To prevent dashboard bloat over time (after 1 month, 6 months, 2 years), every widget must strictly enforce a **Density Contract**:

| Widget | Stream Assignment | Max Capacity | Overflow Contract | Sizing Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **`DashboardHero`** | Top Command Bar | Single Row | N/A | Natural Auto |
| **`ExecutiveSummary`** | Top Command Bar | 5 Stat Pills | N/A | Fixed Grid |
| **`FocusToday`** | Primary Stream | **Max 5 tasks** | `+X more` button → `/tasks` | Natural Auto (Max 420px) |
| **`UpcomingDeadlines`** | Primary Stream | **Max 5 items** | View All link → `/tasks` | Natural Auto (Max 460px) |
| **`RecentProjects`** | Primary Stream | **Max 4 projects**| View All link → `/projects`| Fixed (280px) |
| **`ActivityTimeline`** | Primary Stream | **Max 6 events** | Internal scroll container | Capped Scroll (400px) |
| **`QuickActions`** | Secondary Stream | **5 buttons** | N/A | Fixed (192px) |
| **`AIDailyBrief`** | Secondary Stream | **4 insights** | N/A | Fixed (436px) |
| **`WorkspaceRecommendations`**| Secondary Stream| **Max 3 cards** | View All Sheet trigger | Fixed (344px) |
| **`TeamPresence`** | Secondary Stream | **Max 4 users** | Internal scroll container | Natural Auto (Max 200px) |
| **`ProductivityOverview`** | Secondary Stream | 4 Metrics | N/A | Fixed (272px) |
| **`WorkspaceHealth`** | Secondary Stream | 2 Diagnostics | Quiet indicator mode | Fixed (244px) |

---

## 4. Dual-Stream Architecture Composition

```
========================================================================================
TOP COMMAND BAR (Full Width | Persistent 100% Width Container)
========================================================================================
[ DashboardHero: Workspace Greeting & AI Copilot Trigger Button                       ]
[ ExecutiveSummaryWidget: 5 Metric Badges (Active Projects, Tasks, Team, AI, Health)   ]

========================================================================================
DUAL INDEPENDENT STREAM LAYOUT (lg:grid-cols-12 gap-6 items-start)
========================================================================================
PRIMARY STREAM (lg:col-span-7 / 65% Width)   SECONDARY STREAM (lg:col-span-5 / 35% Width)
Vertical flex col gap-6                      Vertical flex col gap-6
-------------------------------------------  -------------------------------------------
1. [FocusToday]                              1. [QuickActions]
   • Urgent overdue & today tasks               • Quick Launchpad buttons (⌘J, ⌘K, etc.)
   • Density: Max 5 items + shortcut            • Density: Fixed 5-button grid

2. [UpcomingDeadlinesWidget]                 2. [AIDailyBrief]
   • Timeline deliverable horizon               • Proactive risk & blocker analysis
   • Density: Max 5 items                       • Density: Fixed 4 insight items

3. [RecentProjects]                          3. [WorkspaceRecommendationsCard]
   • Active project navigation                  • AI advisory cards
   • Density: Max 4 active projects             • Density: Max 3 compact cards

4. [ActivityTimeline]                        4. [TeamPresenceWidget]
   • Chronological audit feed                   • Realtime online members & page viewing
   • Density: Capped 400px scroll container     • Density: Max 4 users visible

                                             5. [ProductivityOverview]
                                                • Task resolution velocity & completion %
                                                • Density: Fixed 2x2 stat grid

                                             6. [WorkspaceHealthWidget]
                                                • Quiet diagnostic telemetry scores
                                                • Density: Fixed quiet indicator
========================================================================================
```

---

## 5. Single-Responsibility Component Architecture

To guarantee clean code separation, the dashboard layout follows a 6-layer architecture:

```
DashboardPage            --> Data orchestration, TanStack Query, loading/error state
 └── DashboardShell      --> Main max-width container (max-w-7xl px-4 sm:px-6)
      ├── TopCommandBar  --> Full-width Hero + Executive Summary
      └── DashboardStreamGrid --> 12-column grid layout (lg:grid-cols-12 items-start)
           ├── DashboardStream (Primary)   --> 7-col vertical flex column (gap-6)
           │    └── DashboardWidgetSlot    --> Card shell (rounded-xl, bg-card, border, p-5)
           │         └── Widget            --> Domain UI component (e.g., FocusToday)
           └── DashboardStream (Secondary) --> 5-col vertical flex column (gap-6)
                └── DashboardWidgetSlot    --> Card shell (rounded-xl, bg-card, border, p-5)
                     └── Widget            --> Domain UI component (e.g., QuickActions)
```

### Layer Responsibilities:
1. **`DashboardPage`**: Orchestrates data fetching, error boundaries, refetching, and passes domain state to widgets.
2. **`DashboardShell`**: Manages global layout max-width (`max-w-7xl`), horizontal gutters, and vertical flow.
3. **`DashboardStreamGrid`**: CSS Grid container (`lg:grid-cols-12 gap-6 items-start`). **Crucial**: `items-start` prevents height stretching between streams!
4. **`DashboardStream`**: Vertical Flex container (`flex flex-col gap-6`) for a specific column stream.
5. **`DashboardWidgetSlot`**: Standardized card container enforcing `rounded-xl`, `bg-card`, `border-border/60`, uniform `p-5` padding, standard card headers, and loading skeleton shapes.
6. **`Widget`**: Pure presentational domain component rendering business UI.

---

## 6. Non-Negotiable Product Design Principles

1. **Execution before Analytics**: Personal work items (`FocusToday`) always take visual precedence over telemetry and analytics.
2. **Projects before AI**: Core project data structures take structural precedence over advisory AI panels.
3. **AI Assists Work, Never Replaces Work**: AI components (`AIDailyBrief`, `Recommendations`) provide context, not clutter.
4. **Historical Information Belongs Below Operational Information**: Chronological audit trails (`ActivityTimeline`) live at the bottom of the Primary Stream.
5. **Health Indicators Remain Quiet Unless Unhealthy**: `WorkspaceHealthWidget` uses subtle indicator badges rather than loud alert colors.
6. **Lists Scroll or Cap Instead of Stretching**: Infinite card height growth is banned. Density limits enforce `+X more` or internal scrolling.
7. **Widget Shells Remain 100% Identical**: `DashboardWidgetSlot` guarantees unified borders, glassmorphism, shadows, and padding.
8. **Single Spacing Scale Everywhere**: Grid gap `gap-6` (24px), stream gap `gap-6` (24px), card padding `p-5` (20px), header margin `mb-4` (16px).
9. **Maximum Information with Minimum Visual Noise**: Color palette is restricted to primary brand accents + muted text tokens.
10. **Zero Decorative UI**: Every element serves an operational intent.

---

## 7. Implementation Roadmap (For Implementation Phase)

1. **Phase 1: Layout Engine Components**
   Create `client/src/features/dashboard/components/layout/`:
   - `DashboardShell.tsx`
   - `DashboardStreamGrid.tsx`
   - `DashboardStream.tsx`
   - `DashboardWidgetSlot.tsx`

2. **Phase 2: Dashboard Page Composition**
   Refactor `client/src/features/dashboard/pages/DashboardPage.tsx` to compose widgets into the Primary and Secondary Streams using `DashboardStreamGrid`.

3. **Phase 3: Density Contract Enforcement**
   Add density caps (`slice(0, 5)`, custom scroll wrappers) to `FocusToday`, `UpcomingDeadlinesWidget`, `RecentProjects`, and `ActivityTimeline`.

4. **Phase 4: Loading Skeleton Alignment**
   Update skeleton fallbacks in `DashboardWidgetSlot` to match the exact dimensions of rendered cards, eliminating Cumulative Layout Shift (CLS).

5. **Phase 5: Verification & Quality Assurance**
   Run `npm test DashboardPage.test.tsx` and verify responsive layouts across Desktop (1440p+), Laptop (1080p), Tablet (768p), and Mobile.
