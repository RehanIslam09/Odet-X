import * as React from "react";
import { cn } from "@/lib/utils.js";

interface DashboardStreamProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  span?: 5 | 6 | 7 | 8 | 12;
}

/**
 * DashboardStream
 * Vertical flex stream owning its own vertical rhythm without stretching to match adjacent streams.
 */
export function DashboardStream({ children, span = 7, className, ...props }: DashboardStreamProps) {
  const spanClass = {
    5: "lg:col-span-5",
    6: "lg:col-span-6",
    7: "lg:col-span-7",
    8: "lg:col-span-8",
    12: "lg:col-span-12",
  }[span];

  return (
    <div
      className={cn("flex flex-col gap-6 w-full min-w-0", spanClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}
