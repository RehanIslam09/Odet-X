import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import { queryClient } from "@/app/query-client";
import { router } from "@/app/router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";

/**
 * Root application providers.
 *
 * Provider order (outer → inner):
 * 1. QueryClientProvider
 * 2. ThemeProvider
 * 3. TooltipProvider
 * 4. RouterProvider
 * 5. Toaster
 * 6. ReactQueryDevtools
 */
export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={150}>
          <RouterProvider router={router} />
          <Toaster
            richColors
            position="top-right"
          />
        </TooltipProvider>
      </ThemeProvider>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}