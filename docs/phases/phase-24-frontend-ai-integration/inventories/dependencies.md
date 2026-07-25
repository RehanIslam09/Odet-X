# Inventory — Client Dependencies Audit

## Production Dependencies (`client/package.json`)

| Package Name | Version | Responsibility | Usage Status | Phase 24 Status |
| :--- | :--- | :--- | :--- | :--- |
| `react` | `^19.2.7` | UI Framework | Active | Required |
| `react-dom` | `^19.2.7` | DOM Renderer | Active | Required |
| `react-router-dom` | `^7.18.1` | Application Routing | Active | Required |
| `@tanstack/react-query` | `^5.101.2` | Server State Management | Active | Required |
| `@tanstack/react-query-devtools` | `^5.101.2` | DevTools | Active (Dev) | Required |
| `axios` | `^1.18.1` | HTTP Client | Active | Required |
| `zustand` | `^5.0.14` | Global UI State | Active (`auth.store.ts`) | Required |
| `react-hook-form` | `^7.81.0` | Form Management | Active | Required |
| `zod` | `^4.4.3` | Schema Validation | Active | Required |
| `@hookform/resolvers` | `^5.4.0` | Hook Form Zod Resolver | Active | Required |
| `framer-motion` | `^12.42.2` | Page & Card Animations | Active | Required |
| `lucide-react` | `^1.24.0` | Icon Set | Active | Required |
| `sonner` | `^2.0.7` | Toast Notifications | Active | Required |
| `tailwindcss` | `^4.3.2` | Styling Engine | Active | Required |
| `@tailwindcss/vite` | `^4.3.2` | Vite CSS Plugin | Active | Required |
| `next-themes` | `^0.4.6` | Theme Provider (Dark mode) | Active | Required |
| `date-fns` | `^4.4.0` | Date Utilities | Active | Required |
| `@dnd-kit/core` | `^6.3.1` | Drag & Drop Primitives | Installed | Defer |
| `@dnd-kit/sortable` | `^10.0.0` | Drag & Drop Sortable | Installed | Defer |
| `@dnd-kit/utilities` | `^3.2.2` | Drag & Drop Utilities | Installed | Defer |
| `recharts` | `^3.9.2` | Charting | Active (Dashboard analytics) | Required |
| `react-markdown` | `^10.1.0` | Markdown Renderer | Active (Task notes) | Required |
| `remark-gfm` | `^4.0.1` | Markdown GFM Plugin | Active (Task notes) | Required |

---

## DevDependencies Audit

| Package Name | Version | Responsibility | Usage Status |
| :--- | :--- | :--- | :--- |
| `vitest` | `^4.1.10` | Unit Test Runner | Active |
| `@testing-library/react` | `^16.3.2` | React Component Testing | Active |
| `axios-mock-adapter` | `^2.1.0` | Axios Mocking | Active |
| `typescript` | `~6.0.2` | Type Checking | Active |
| `vite` | `^8.1.1` | Build Tool & Dev Server | Active |

---

## Package Change Verdict for Phase 24

**ZERO packages to install. ZERO packages to uninstall.**
All required libraries for API integration, state management, toast notification, form handling, and testing are already installed and correctly configured.
