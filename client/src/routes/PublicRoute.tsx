import { Navigate, useLocation } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { useAuthStore } from "@/store/auth.store";

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for public routes (e.g. login, register).
 *
 * Behavior:
 * - Reads `isAuthenticated` and `isBootstrapping` from Zustand.
 * - Does NOT trigger any network requests (AuthBootstrap handles that).
 * - If still bootstrapping (failsafe), renders AppLoader.
 * - If authenticated, redirects to the dashboard (or intended destination).
 * - Otherwise, renders the public content.
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const location = useLocation();
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isBootstrapping) {
    return <AppLoader />;
  }

  if (isAuthenticated) {
    // If there's a `from` destination in state, return there, else go to `/`
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  return children;
}
