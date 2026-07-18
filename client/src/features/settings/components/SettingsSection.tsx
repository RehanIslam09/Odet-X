import React from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  destructive?: boolean;
}

export function SettingsSection({
  id,
  title,
  description,
  children,
  destructive = false,
  className,
  ...props
}: SettingsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 py-8 first:pt-0",
        destructive
          ? "rounded-xl border border-destructive/20 bg-destructive/5 p-6 my-6"
          : "border-b border-border/40 last:border-b-0",
        className
      )}
      {...props}
    >
      <div className={cn("mb-6", destructive && "mb-4")}>
        <h2 className={cn("text-lg font-semibold tracking-tight", destructive && "text-destructive")}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}
