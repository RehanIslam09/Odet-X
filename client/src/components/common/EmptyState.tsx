import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center", className)}>
        <Icon className="h-6 w-6 text-muted-foreground/50" />
        <p className="max-w-[250px] text-xs text-muted-foreground">
          {title}
          {description && <><br />{description}</>}
        </p>
        {action && <div>{action}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-24 text-center", className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
