import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import { queryClient } from "@/app/query-client";
import { router } from "@/app/router";
import { ThemeProvider } from "@/providers/ThemeProvider";

/**
 * Root application providers.
 *
 * Provider order (outer → inner):
 * 1. `QueryClientProvider` — React Query must wrap everything that uses queries.
 * 2. `ThemeProvider` — next-themes applies the theme class before paint.
 * 3. `RouterProvider` — renders the active route tree.
 * 4. `Toaster` — Sonner toast container, rendered outside the router so
 *    toasts persist across route navigations.
 * 5. `ReactQueryDevtools` — dev-only, no production bundle impact.
 */
export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </ThemeProvider>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}