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
import TasksPage from "@/features/tasks/pages/TasksPage";
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
          <Route
            path="tasks"
            element={<TasksPage />}
          />

          {/* Settings */}
          <Route
            path="settings"
            element={<SettingsPage />}
          />
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