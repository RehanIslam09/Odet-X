# 11 — Main Dashboard Redesign & Command Center Blueprint

**Author**: Staff UX Designer & Principal Frontend Engineer  
**Date**: August 2, 2026  
**Scope**: `DashboardPage.tsx` Layout, Feed Aggregation & Interactive Cards  
**Benchmarks**: Vercel Dashboard, Linear Homepage, Notion Command Center  

---

## 1. Dashboard Redesign Philosophy

The Dashboard is the home of the application. It must NOT feel like static cards. It must act as a **Live Command Center** that immediately answers 6 key questions for the user:
1. *What needs my immediate attention?* (Overdue/high-priority tasks, unread notifications)
2. *What changed recently?* (Realtime activity audit log feed)
3. *What should I work on today?* (Assigned focus tasks)
4. *What is AI recommending?* (Proactive health & risk recommendations)
5. *Who is active right now?* (Workspace presence roster)
6. *Where are my active projects?* (Recent project cards with progress bars)

---

## 2. Target Layout Wireframe Blueprint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HERO SECTION: Workspace Intelligence Brief & Proactive Status               │
│ "Good morning, Rehan! 3 tasks require your focus today."                    │
│ [Ask AI About Workspace Button] -> Opens Global Copilot                    │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ LEFT COLUMN (60% Width)              │ RIGHT COLUMN (40% Width)             │
│                                      │                                      │
│ 🎯 FOCUS TODAY (Tasks Table)         │ 🤖 AI PROACTIVE RECOMMENDATIONS      │
│ - Overdue / High Priority Tasks      │ - Risk: Project Auth System Behind   │
│ - Quick status toggle select         │ - [Dismiss] [View Recommendation]    │
│                                      │                                      │
│ 📁 ACTIVE PROJECTS GRID              │ ⚡ LIVE ACTIVITY FEED                │
│ - Project cards with progress bars   │ - Task updated by Sarah (2m ago)     │
│ - Recent update timestamps           │ - Project created by Rehan (1h ago)  │
│                                      │                                      │
│                                      │ 🟢 ACTIVE TEAM PRESENCE              │
│                                      │ - Rehan (You) - Online               │
│                                      │ - Sarah - Online                     │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. Widget Integration Matrix

1. **Hero Brief (`AIDailyBrief.tsx`)**: Displays workspace greeting, pending task count, and active AI button wired to Global Copilot.
2. **Focus Today (`FocusToday.tsx`)**: Interactive task list filtered for current user and high priority/in-progress tasks, with inline status toggle dropdowns (`PATCH /tasks/:id`).
3. **Recent Projects (`RecentProjects.tsx`)**: Grid of active project cards with progress bars, status badges, and direct navigation links.
4. **AI Recommendations Widget**: Card displaying active proactive recommendations (`GET /recommendations`) with dismiss buttons (`PATCH /recommendations/:id/dismiss`).
5. **Activity Stream (`ActivityTimeline.tsx`)**: Live workspace audit log feed updated in realtime via `activity.created` socket events.
