import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { AuthLayout, DashboardLayout } from "@/components/layout";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import ProtectedRoute from "@/routes/ProtectedRoute";
import PublicRoute from "@/routes/PublicRoute";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import SessionExpiredPage from "@/features/auth/pages/SessionExpiredPage";
import UnauthorizedPage from "@/features/auth/pages/UnauthorizedPage";
import NotFoundPage from "@/features/not-found/pages/NotFoundPage";

/**
 * Application router.
 *
 * Route structure:
 *
 * ```
 * /               → AuthBootstrap
 *                     ↳ ProtectedRoute → DashboardLayout → DashboardPage
 *
 * /auth           → AuthBootstrap
 *                     ↳ PublicRoute → AuthLayout
 *                         ↳ LoginPage
 *                         ↳ RegisterPage
 *
 * /session-expired → SessionExpiredPage   (no guard — must be reachable when unauthed)
 * /unauthorized    → UnauthorizedPage     (no guard — reachable when authed or not)
 *
 * *               → NotFoundPage
 * ```
 *
 * Route Guards:
 * - `ProtectedRoute` redirects to /auth/login if unauthed.
 * - `PublicRoute` redirects to / if already authed.
 * - Neither guard triggers network requests; they only read Zustand state.
 *
 * AuthBootstrap:
 * - Wraps all main routes.
 * - Fetches session once on startup.
 * - Renders AppLoader until the network request completes.
 */
export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Root layout for authenticated and public routes that need session state */}
      <Route element={<AuthBootstrap><RouteOutlet /></AuthBootstrap>}>
        {/* Protected — requires authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>

        {/* Public — redirects to / if already authenticated */}
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

      {/* Utility pages — no route guard, bypasses AuthBootstrap */}
      <Route path="session-expired" element={<SessionExpiredPage />} />
      <Route path="unauthorized" element={<UnauthorizedPage />} />

      {/* 404 fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
);

// We need an Outlet for the AuthBootstrap route wrapper
import { Outlet as RouteOutlet } from "react-router-dom";