# 09 — Unified AI Copilot & Intelligence Engine Architecture

**Author**: Principal AI Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Scope**: `@ai-project-manager/server/ai` and `@ai-project-manager/client/features/ai`  

---

## 1. Current AI Subsystem Fragmentation

Currently, AI functionality is split across multiple UI entry points:
- **`ProjectCopilotSheet.tsx`**: Single-project query drawer.
- **`ProjectTaskGenerator.tsx`**: AI task breakdown modal.
- **`ProjectSummaryCard.tsx`**: Project summary generator.
- **`TaskPropertiesPanel.tsx`**: AI auto-label generator.
- **`AIDailyBrief.tsx` & `QuickActions.tsx`**: Disabled AI buttons on the dashboard.

---

## 2. Target Architecture: ONE Unified Global Copilot

We are unifying all AI interactions into **ONE Global Copilot Architecture**. Every AI trigger button across the application (Dashboard Hero, Quick Actions, Navbar, Command Palette, Project Sheet) routes into a single interactive Copilot modal/drawer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED COPILOT PIPELINE                          │
│                                                                             │
│  [Dashboard AI]  [Quick Actions]  [Project Sheet]  [Command Palette]         │
│          │               │               │                │                 │
│          └───────────────┴───────┬───────┴────────────────┘                 │
│                                  ▼                                          │
│                    GLOBAL COPILOT INTERFACE (Modal/Sheet)                   │
│                                  │                                          │
│            ┌─────────────────────┴─────────────────────┐                    │
│            ▼                                           ▼                    │
│   READ-ONLY COPILOT QUERY                     ACTION EXECUTION ENGINE       │
│   (Gemini/Anthropic LLM)                     (Dry-Run & State Mutation)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Global Copilot Implementation Specification

1. **`GlobalCopilotModal.tsx`**:
   - Modal/Drawer component registered globally in `DashboardLayout.tsx`.
   - Keyboard shortcut trigger (`Cmd/Ctrl+K` in Copilot mode or `Cmd/Ctrl+J`).
   - Supports context parameters: `{ workspaceId, projectId?, taskId? }`.
2. **Unified Action Execution Pipeline**:
   - Supports natural language action proposals (e.g., *"Set priority of Task #102 to HIGH"* or *"Create project Auth System"*).
   - Calls `POST /copilot/actions/dry-run` to compute state diffs (Before vs After).
   - Renders state diff preview card with "Confirm & Execute" button (`POST /copilot/actions/confirm`).
3. **Dashboard AI Integration**:
   - Wire `AIDailyBrief.tsx` "Ask AI about your workspace" and `QuickActions.tsx` "Ask AI Copilot" buttons directly to toggle `GlobalCopilotModal.tsx`.
