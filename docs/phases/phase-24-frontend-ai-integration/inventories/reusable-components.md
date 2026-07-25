# Inventory — Reusable Application Components

## Existing Shared Components (`client/src/components/common/`)

| Component Name | File Location | Primary Purpose | Architectural Quality | Recommended Phase 24 Action |
| :--- | :--- | :--- | :--- | :--- |
| `AppLoader` | `components/common/AppLoader.tsx` | Full-screen initial session bootstrap loader | Clean, animated loader using Geist font & glowing logo | Keep as canonical bootstrap loader |
| `EmptyState` | `components/common/EmptyState.tsx` | Standard placeholder when resources/lists are empty | Reusable icon, title, description, action button | Keep as canonical empty state |
| `ErrorState` | `components/common/ErrorState.tsx` | Standard error alert for query/fetch failures | Reusable error message & retry action | Keep as canonical error state |
| `PageContainer` | `components/common/PageContainer.tsx` | Max-width layout wrapper (`max-w-7xl px-4 sm:px-6 lg:px-8 py-8`) | Enforces standard horizontal padding & container width | Keep as canonical page container |
| `PageHeader` | `components/common/PageHeader.tsx` | Standard title, description, and primary action bar for pages | Reusable flex header layout | Keep as canonical page header |

---

## Layout Components (`client/src/components/layout/`)

| Component Name | File Location | Responsibility | Quality / Notes |
| :--- | :--- | :--- | :--- |
| `DashboardLayout` | `components/layout/DashboardLayout.tsx` | App shell wrapping navbar, sidebar, mobile navigation, and outlet | Clean responsive shell |
| `DashboardNavbar` | `components/layout/DashboardNavbar.tsx` | Header bar with logo, search shortcut, notifications bell, user menu | Responsive, compact |
| `DashboardSidebar` | `components/layout/DashboardSidebar.tsx` | Left navigation panel with active route highlighting | Desktop layout wrapper |
| `MobileSidebar` | `components/layout/MobileSidebar.tsx` | Sheet drawer for mobile viewport navigation | Responsive navigation |
| `SidebarItem` | `components/layout/SidebarItem.tsx` | Individual link item for sidebar navigation | Reusable link item |
| `AuthLayout` | `components/layout/AuthLayout.tsx` | Split-screen branding & form container for Login/Register | High aesthetic quality |
| `ThemeToggle` | `components/layout/ThemeToggle.tsx` | Light / Dark mode toggle button | Next-themes integration |
| `UserMenu` | `components/layout/UserMenu.tsx` | User profile avatar dropdown menu with logout action | Reusable header component |

---

## Proposed Reusable AI Components for Phase 24

| New Component Name | Target Location | Purpose | Justification |
| :--- | :--- | :--- | :--- |
| `ProjectAISummaryCard` | `features/projects/components/ProjectAISummaryCard.tsx` | Render AI summary paragraph, key highlights, and identified risks | Needed on Project Detail workspace |
| `GenerateTasksDialog` | `features/projects/components/GenerateTasksDialog.tsx` | Prompt input modal to trigger AI task breakdown for project | Needed on Project Detail workspace |

**Conclusion**: Application abstractions are already remarkably clean. Only 2 target AI feature components need to be created during Phase 24 WP-03.
