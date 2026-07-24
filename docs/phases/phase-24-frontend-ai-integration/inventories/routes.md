# Inventory — Application Routes

## Route Tree Inventory (`client/src/app/router.tsx`)

Total Routes: **18**

| Path | Component / Element | Guard Status | Layout | Dynamic Params | Implemented? | Notable Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `DashboardPage` | Protected | `DashboardLayout` | None | Yes | Main AI workspace dashboard |
| `/projects` | `ProjectsDashboardPage` | Protected | `DashboardLayout` | None | Yes | Paginated project grid & filters |
| `/projects/:projectId` | `ProjectDetailPage` | Protected | `DashboardLayout` | `projectId` | Yes | Project header, metrics summary, task list |
| `/tasks` | `TasksPage` | Protected | `DashboardLayout` | None | Yes | Global task workspace |
| `/tasks/:taskId` | `TaskDetailPage` | Protected | `DashboardLayout` | `taskId` | Yes | Task detail view & properties panel |
| `/tasks/:taskId/notes` | `TaskNotesWorkspacePage` | Protected | `DashboardLayout` | `taskId` | Yes | Fullscreen task notes editor |
| `/activities` | `ActivityPage` | Protected | `DashboardLayout` | None | Yes | Audit activity timeline |
| `/notifications` | `NotificationsPage` | Protected | `DashboardLayout` | None | Yes | User notifications list |
| `/settings` | Redirects to `/settings/profile` | Protected | `DashboardLayout` | None | Yes | Settings sub-navigation |
| `/settings/profile` | `ProfileSettings` | Protected | `DashboardLayout` | None | Yes | User profile edit form |
| `/settings/account` | `AccountSettings` | Protected | `DashboardLayout` | None | Yes | Account settings |
| `/settings/appearance` | `AppearanceSettings` | Protected | `DashboardLayout` | None | Yes | Theme options |
| `/settings/notifications` | `NotificationSettings` | Protected | `DashboardLayout` | None | Yes | Notification preferences |
| `/settings/security` | `SecuritySettings` | Protected | `DashboardLayout` | None | Yes | Password change form |
| `/settings/danger-zone` | `DangerZone` | Protected | `DashboardLayout` | None | Yes | Account deletion |
| `/auth/login` | `LoginPage` | Public | `AuthLayout` | None | Yes | Email/password login form |
| `/auth/register` | `RegisterPage` | Public | `AuthLayout` | None | Yes | Account registration form |
| `/session-expired` | `SessionExpiredPage` | Unguarded | None | None | Yes | Rendered on auth invalidation |
| `/unauthorized` | `UnauthorizedPage` | Unguarded | None | None | Yes | Rendered on 403 response |
| `*` | `NotFoundPage` | Catch-all | None | None | Yes | Rendered for invalid paths |

---

## Route Quality & Convention Assessment
- All routes follow clean RESTful naming conventions.
- Protected routes share the persistent application shell (`DashboardLayout`).
- Public auth routes share the authentication wrapper (`AuthLayout`).
- Route authorization is enforced declaratively at the router root via `AuthBootstrap` + `ProtectedRoute`.
- Zero route restructuring is needed for Phase 24.
