import * as React from "react";
import { cn } from "@/lib/utils.js";

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * DashboardShell
 * Main container enforcing consistent max-width, centering, and vertical spacing token.
 */
export function DashboardShell({ children, className, ...props }: DashboardShellProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl flex flex-col gap-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
