# 06 — Design System & Component Standard Review

**Author**: Staff UX Designer & Lead Frontend Engineer  
**Date**: August 2, 2026  
**Scope**: `@ai-project-manager/client` Styling System (`index.css`), UI Components & Primitives  

---

## 1. Design System Tokens & Foundations

The application styling is powered by Vanilla CSS variable tokens integrated with Tailwind CSS in `client/src/index.css`.

### Token Architecture:
- **Color Palette**: Dark-mode tailored HSL variables (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`).
- **Typography**: Inter / System Sans font stack with clean line-heights, crisp weight hierarchies (`font-medium`, `font-semibold`), and tabular numbers (`font-mono`) for dates and counters.
- **Card & Border Radius**: Standardized `--radius: 0.5rem` (`rounded-lg`, `rounded-md`, `rounded-full`).
- **Elevation & Glassmorphic Effects**: Subtle dark shadows (`shadow-sm`, `shadow-md`), backdrop blur overlays (`backdrop-blur-md bg-background/80`).

---

## 2. Component Primitives Audit

All UI components in `client/src/components/ui/` follow Radix UI primitives and Tailwind styling:

1. **Buttons (`button.tsx`)**: Variant styles (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and sizes (`sm`, `md`, `lg`, `icon`).
2. **Inputs & Textareas (`input.tsx`, `textarea.tsx`)**: Standardized focus rings (`focus-visible:ring-1 focus-visible:ring-ring`), border colors, and placeholder styling.
3. **Select & Dropdown Menus (`select.tsx`, `dropdown-menu.tsx`)**: Glassmorphic popover content, subtle hover highlights, keyboard navigation support.
4. **Dialogs & Sheets (`dialog.tsx`, `sheet.tsx`)**: Modal overlays with backdrop blur, smooth slide-in animations for side sheets.
5. **Tables (`table.tsx`)**: Clean border separators, hover row highlights, compact padding for dense data display.
6. **Badges (`badge.tsx`)**: Status badges (`default`, `secondary`, `destructive`, `outline`) with high contrast text.

---

## 3. Consistency Enforcement

- **No Ad-Hoc Inline Styles**: All component colors, padding, and margins must consume design system tokens.
- **Micro-Animations**: All interactive elements (buttons, menu items, cards) must include smooth CSS transitions (`transition-all duration-200 ease-in-out`).
