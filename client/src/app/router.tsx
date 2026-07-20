import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet as RouteOutlet,
  Route,
} from "react-router-dom";

import { AuthLayout, DashboardLayout } from "@/components/layout";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import SessionExpiredPage from "@/features/auth/pages/SessionExpiredPage";
import UnauthorizedPage from "@/features/auth/pages/UnauthorizedPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import NotFoundPage from "@/features/not-found/pages/NotFoundPage";
import ProjectsDashboardPage from "@/features/projects/pages/ProjectsDashboardPage";
import ProjectDetailPage from "@/features/projects/pages/ProjectDetailPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import { ProfileSettings } from "@/features/settings/components/ProfileSettings";
import { AccountSettings } from "@/features/settings/components/AccountSettings";
import { AppearanceSettings } from "@/features/settings/components/AppearanceSettings";
import { NotificationSettings } from "@/features/settings/components/NotificationSettings";
import { SecuritySettings } from "@/features/settings/components/SecuritySettings";
import { DangerZone } from "@/features/settings/components/DangerZone";
import { Navigate } from "react-router-dom";
import TasksPage from "@/features/tasks/pages/TasksPage";
import TaskDetailPage from "@/features/tasks/pages/TaskDetailPage";
import TaskNotesWorkspacePage from "@/features/tasks/pages/TaskNotesWorkspacePage";
import ActivityPage from "@/features/activity/pages/ActivityPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import PublicRoute from "@/routes/PublicRoute";

/**
 * Application Router
 *
 * Protected Routes
 * ├── /
 * │     └── DashboardPage
 * ├── /projects
 * │     └── ProjectsDashboardPage
 *
 * Public Routes
 * ├── /auth/login
 * └── /auth/register
 *
 * Utility Routes
 * ├── /session-expired
 * ├── /unauthorized
 * └── *
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
        {/* Protected application */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* AI Dashboard */}
          <Route
            index
            element={<DashboardPage />}
          />

          {/* Projects */}
          <Route
            path="projects"
          >
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
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="account" element={<AccountSettings />} />
            <Route path="appearance" element={<AppearanceSettings />} />
            <Route path="notifications" element={<NotificationSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="danger-zone" element={<DangerZone />} />
          </Route>
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
          <Route
            path="login"
            element={<LoginPage />}
          />

          <Route
            path="register"
            element={<RegisterPage />}
          />
        </Route>
      </Route>

      {/* Unguarded pages */}
      <Route
        path="session-expired"
        element={<SessionExpiredPage />}
      />

      <Route
        path="unauthorized"
        element={<UnauthorizedPage />}
      />

      {/* 404 */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </>,
  ),
);