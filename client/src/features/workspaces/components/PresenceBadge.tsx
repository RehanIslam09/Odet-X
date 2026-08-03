export interface PresenceBadgeProps {
  status: "online" | "offline" | "away" | string;
  showLabel?: boolean;
  className?: string;
}

/**
 * Reusable member presence status dot / badge indicator.
 */
export function PresenceBadge({
  status,
  showLabel = false,
  className = "",
}: PresenceBadgeProps) {
  const isOnline = status === "online";
  const isAway = status === "away";

  const colorClass = isOnline
    ? "bg-emerald-500"
    : isAway
    ? "bg-amber-500"
    : "bg-muted-foreground/40";

  const label = isOnline ? "Online" : isAway ? "Away" : "Offline";

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      data-testid="presence-badge"
      aria-label={`User is ${label}`}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${colorClass} motion-reduce:animate-none`} />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
