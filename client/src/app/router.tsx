import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet as RouteOutlet,
  Route,
} from "react-router-dom";

import { AuthLayout, DashboardLayout } from "@/components/layout/index.js";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap.js";
import LoginPage from "@/features/auth/pages/LoginPage.js";
import RegisterPage from "@/features/auth/pages/RegisterPage.js";
import AcceptInvitationPage from "@/features/auth/pages/AcceptInvitationPage.js";
import SessionExpiredPage from "@/features/auth/pages/SessionExpiredPage.js";
import UnauthorizedPage from "@/features/auth/pages/UnauthorizedPage.js";
import DashboardPage from "@/features/dashboard/pages/DashboardPage.js";
import NotFoundPage from "@/features/not-found/pages/NotFoundPage.js";
import ProjectsDashboardPage from "@/features/projects/pages/ProjectsDashboardPage.js";
import ProjectDetailPage from "@/features/projects/pages/ProjectDetailPage.js";
import SettingsPage from "@/features/settings/pages/SettingsPage.js";
import { GeneralSettingsTab } from "@/features/settings/components/GeneralSettingsTab.js";
import { WorkspaceMembersTab } from "@/features/settings/components/WorkspaceMembersTab.js";
import { RealtimeSettingsTab } from "@/features/settings/components/RealtimeSettingsTab.js";
import { AISettingsTab } from "@/features/settings/components/AISettingsTab.js";
import { DangerZoneTab } from "@/features/settings/components/DangerZoneTab.js";
import { AdaptiveRouteGuard } from "@/features/settings/components/AdaptiveRouteGuard.js";
import TasksPage from "@/features/tasks/pages/TasksPage.js";
import TaskDetailPage from "@/features/tasks/pages/TaskDetailPage.js";
import TaskNotesWorkspacePage from "@/features/tasks/pages/TaskNotesWorkspacePage.js";
import ActivityPage from "@/features/activity/pages/ActivityPage.js";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage.js";
import ProtectedRoute from "@/routes/ProtectedRoute.js";
import PublicRoute from "@/routes/PublicRoute.js";
import { WorkspaceProvider } from "@/features/workspaces/context/WorkspaceContext.js";
import { DefaultWorkspaceRedirect } from "@/features/workspaces/components/DefaultWorkspaceRedirect.js";

/**
 * Application Router
 *
 * Workspace-Prefixed Routes (/w/:workspaceSlug)
 * ├── /w/:workspaceSlug/dashboard
 * ├── /w/:workspaceSlug/projects
 * ├── /w/:workspaceSlug/tasks
 * ├── /w/:workspaceSlug/activities
 * ├── /w/:workspaceSlug/notifications
 * └── /w/:workspaceSlug/settings
 *     ├── general (General workspace settings)
 *     ├── members (Adaptive: Team only)
 *     ├── realtime (Adaptive: Team only)
 *     ├── ai (AI & Intelligence policy)
 *     └── danger-zone (Adaptive deletion)
 *
 * Legacy Route Redirection
 * └── / -> /w/:defaultWorkspaceSlug/dashboard
 */

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Bootstrap authentication once for the entire app */}
      <Route
        element={
          <AuthBootstrap>
            <RouteOutlet />
          </AuthBootstrap>
        }
      >
        {/* Workspace Invitation Acceptance Route */}
        <Route path="invitations/:token" element={<AcceptInvitationPage />} />

        {/* Authenticated Workspace Application Shell */}
        <Route
          element={
            <ProtectedRoute>
              <WorkspaceProvider>
                <RouteOutlet />
              </WorkspaceProvider>
            </ProtectedRoute>
          }
        >
          {/* Protected Workspace Application Routes */}
          <Route path="w/:workspaceSlug" element={<DashboardLayout />}>
            {/* Index redirect to dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* AI Dashboard */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Projects */}
            <Route path="projects">
              <Route index element={<ProjectsDashboardPage />} />
              <Route path=":projectId" element={<ProjectDetailPage />} />
            </Route>

            {/* Tasks */}
            <Route path="tasks">
              <Route index element={<TasksPage />} />
              <Route path=":taskId" element={<TaskDetailPage />} />
              <Route path=":taskId/notes" element={<TaskNotesWorkspacePage />} />
            </Route>

            {/* Activities */}
            <Route path="activities">
              <Route index element={<ActivityPage />} />
            </Route>

            {/* Notifications */}
            <Route path="notifications">
              <Route index element={<NotificationsPage />} />
            </Route>

            {/* Settings */}
            <Route path="settings" element={<SettingsPage />}>
              <Route index element={<Navigate to="general" replace />} />
              <Route path="general" element={<GeneralSettingsTab />} />
              <Route
                path="members"
                element={
                  <AdaptiveRouteGuard allowedTypes={["TEAM"]}>
                    <WorkspaceMembersTab />
                  </AdaptiveRouteGuard>
                }
              />
              <Route
                path="realtime"
                element={
                  <AdaptiveRouteGuard allowedTypes={["TEAM"]}>
                    <RealtimeSettingsTab />
                  </AdaptiveRouteGuard>
                }
              />
              <Route path="ai" element={<AISettingsTab />} />
              <Route path="danger-zone" element={<DangerZoneTab />} />
            </Route>
          </Route>

          {/* Legacy Un-prefixed Route Compatibility Redirections */}
          <Route path="/" element={<DefaultWorkspaceRedirect />} />
          <Route path="dashboard" element={<DefaultWorkspaceRedirect />} />
          <Route path="projects/*" element={<DefaultWorkspaceRedirect />} />
          <Route path="tasks/*" element={<DefaultWorkspaceRedirect />} />
          <Route path="activities/*" element={<DefaultWorkspaceRedirect />} />
          <Route path="notifications/*" element={<DefaultWorkspaceRedirect />} />
          <Route path="settings/*" element={<DefaultWorkspaceRedirect />} />
        </Route>

        {/* Public authentication */}
        <Route
          path="auth"
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Unguarded pages */}
      <Route path="session-expired" element={<SessionExpiredPage />} />
      <Route path="unauthorized" element={<UnauthorizedPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
);
