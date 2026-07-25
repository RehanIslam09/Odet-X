# Inventory — Installed Shadcn Components

## Installed Primitives (`client/src/components/ui/`)

Total Installed Components: **23**

| Component | File Path | Current Usage | Needed in Phase 24? | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **avatar** | `avatar.tsx` | UserMenu, ProfileSettings | Yes (User UI) | INSTALLED / REQUIRED |
| **badge** | `badge.tsx` | AIDailyBrief, TaskStatusBadge, TaskPriorityBadge | Yes (Task labels, AI summary badges) | INSTALLED / REQUIRED |
| **button** | `button.tsx` | Used across all components | Yes (AI action buttons) | INSTALLED / REQUIRED |
| **calendar** | `calendar.tsx` | Task detail due date picker | Yes (Task dates) | INSTALLED / REQUIRED |
| **card** | `card.tsx` | ProjectCard, TaskCard, QuickActions, AIDailyBrief | Yes (AI Summary Card) | INSTALLED / REQUIRED |
| **checkbox** | `checkbox.tsx` | Task list batch selection | Yes | INSTALLED / REQUIRED |
| **command** | `command.tsx` | Project/Task search combo boxes | Yes | INSTALLED / REQUIRED |
| **dialog** | `dialog.tsx` | CreateProjectDialog, EditProjectDialog, CreateTaskDialog | Yes (GenerateTasksDialog) | INSTALLED / REQUIRED |
| **dropdown-menu** | `dropdown-menu.tsx` | UserMenu, TaskDetailHeader | Yes | INSTALLED / REQUIRED |
| **input-group** | `input-group.tsx` | Search inputs | Yes | INSTALLED / REQUIRED |
| **input** | `input.tsx` | All form inputs | Yes | INSTALLED / REQUIRED |
| **label** | `label.tsx` | Form labels | Yes (GenerateTasks prompt label) | INSTALLED / REQUIRED |
| **popover** | `popover.tsx` | Date pickers, NotificationPopover | Yes | INSTALLED / REQUIRED |
| **progress** | `progress.tsx` | Project summary completion progress bar | Yes | INSTALLED / REQUIRED |
| **select** | `select.tsx` | Task priority/status dropdowns | Yes | INSTALLED / REQUIRED |
| **separator** | `separator.tsx` | Sidebar, Card dividers | Yes (AI Summary Card dividers) | INSTALLED / REQUIRED |
| **sheet** | `sheet.tsx` | MobileSidebar | Yes | INSTALLED / REQUIRED |
| **skeleton** | `skeleton.tsx` | ProjectCardSkeleton, TaskSkeleton, TaskDetailSkeleton | Yes (AI Generation Skeleton) | INSTALLED / REQUIRED |
| **switch** | `switch.tsx` | NotificationSettings, AppearanceSettings | Yes | INSTALLED / REQUIRED |
| **table** | `table.tsx` | Task table view | Yes | INSTALLED / REQUIRED |
| **tabs** | `tabs.tsx` | SettingsPage tabs | Yes | INSTALLED / REQUIRED |
| **textarea** | `textarea.tsx` | Task notes, Project description | Yes (GenerateTasks prompt input) | INSTALLED / REQUIRED |
| **tooltip** | `tooltip.tsx` | QuickActions, AIDailyBrief, Header action hints | Yes (AI button tooltips) | INSTALLED / REQUIRED |

---

## Evaluation of Potential Additions

| Component Candidate | Proposed Use Case | Needed in Phase 24? | Verdict |
| :--- | :--- | :--- | :--- |
| **alert** | Inline warning banners | No (ErrorState & Sonner toasts cover this) | **NOT NEEDED** |
| **alert-dialog** | Destructive confirm modals | No (Existing `Dialog` handles delete confirms) | **NOT NEEDED** |
| **sonner** | Toast notifications | **Already installed & configured** (`Toaster` in `providers.tsx`) | **INSTALLED** |
| **collapsible** | Expandable sections | No | **NOT NEEDED** |
| **accordion** | Collapsible lists | No | **NOT NEEDED** |

**Conclusion**: ZERO new shadcn primitives need to be installed for Phase 24.
