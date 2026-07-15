import { useEffect } from "react";

import { useCurrentUser } from "@/features/auth/hooks";
import { useAuthStore } from "@/store/auth.store";
import { AppLoader } from "@/components/common/AppLoader";

interface AuthBootstrapProps {
  children: React.ReactNode;
}

/**
 * Authentication Bootstrap Manager.
 *
 * This component is the SINGLE entry point for authentication initialization.
 * It sits at the root of the application (inside the router) and restores
 * the user session exactly once on page load.
 *
 * Responsibilities:
 * - Calls `useCurrentUser` (React Query) to fetch the session.
 * - Coordinates with the Zustand store to signal when bootstrapping is done.
 * - Renders the `<AppLoader />` while bootstrapping is in progress.
 * - Renders children (the rest of the app) only after bootstrap finishes.
 *
 * Route guards (ProtectedRoute, PublicRoute) do NOT trigger network requests.
 * They only read the Zustand state populated by this component.
 */
export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const { isLoading } = useCurrentUser();
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const finishBootstrap = useAuthStore((s) => s.finishBootstrap);

  useEffect(() => {
    // When React Query finishes loading (success or failure),
    // mark the bootstrap phase as complete in Zustand.
    if (!isLoading) {
      finishBootstrap();
    }
  }, [isLoading, finishBootstrap]);

  if (isBootstrapping) {
    return <AppLoader />;
  }

  return <>{children}</>;
}
