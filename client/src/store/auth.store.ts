import { create } from "zustand";

import type { User } from "@/features/auth/types/auth.types";

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

interface AuthState {
  /**
   * True until the application finishes restoring the session on startup.
   * `AuthBootstrap` is responsible for setting this to false.
   */
  isBootstrapping: boolean;

  /**
   * The currently authenticated user.
   * `null` means the user is not authenticated.
   */
  user: User | null;

  /**
   * Derived state: true if the user is authenticated.
   */
  isAuthenticated: boolean;
}

interface AuthActions {
  /**
   * Mark the bootstrap phase as complete.
   * Called by `AuthBootstrap` once session restoration finishes.
   */
  finishBootstrap: () => void;

  /**
   * Populate the store with the authenticated user.
   * Called after a successful login or session bootstrap.
   */
  setUser: (user: User) => void;

  /**
   * Remove the authenticated user from the store.
   * Called after logout or when a session refresh fails.
   */
  clearUser: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Zustand auth store.
 *
 * Owns lightweight authentication UI state only:
 * - `isBootstrapping` — whether the app is still initializing auth
 * - `user` — the currently authenticated user object
 * - `isAuthenticated` — explicit boolean for authentication status
 *
 * Deliberately minimal. React Query owns all server state (caching, loading,
 * refetching). This store exists so that components can synchronously read
 * auth state without triggering network requests or guessing loading states.
 *
 * Access tokens are NEVER stored here. They live in the Axios token manager.
 *
 * @example
 * // Reading state (route guards)
 * const { isBootstrapping, isAuthenticated } = useAuthStore();
 *
 * // Writing state (from mutations or AuthBootstrap)
 * useAuthStore.getState().finishBootstrap();
 */
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isBootstrapping: true,
  user: null,
  isAuthenticated: false,

  finishBootstrap: () => set({ isBootstrapping: false }),

  setUser: (user) => set({ user, isAuthenticated: true }),

  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
