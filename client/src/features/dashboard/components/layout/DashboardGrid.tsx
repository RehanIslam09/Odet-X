import * as React from "react";
import { cn } from "@/lib/utils.js";

interface DashboardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * DashboardGrid
 * 12-column CSS Grid layout using `items-start` to eliminate cross-column height coupling.
 */
export function DashboardGrid({ children, className, ...props }: DashboardGridProps) {
  return (
    <div
      className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full", className)}
      {...props}
    >
      {children}
    </div>
  );
}
