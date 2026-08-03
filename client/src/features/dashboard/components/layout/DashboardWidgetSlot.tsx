import * as React from "react";
import { cn } from "@/lib/utils.js";

interface DashboardWidgetSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * DashboardWidgetSlot
 * Layout slot for dashboard widgets, supporting clean composition and stream alignment.
 */
export function DashboardWidgetSlot({ children, className, ...props }: DashboardWidgetSlotProps) {
  return (
    <div
      className={cn("w-full min-w-0 flex flex-col", className)}
      {...props}
    >
      {children}
    </div>
  );
}
