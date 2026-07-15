import { Activity } from "lucide-react";

/**
 * Activity timeline.
 *
 * No activity feed exists on the backend yet. This communicates the
 * capability — a running log of what changed and who changed it — without
 * inventing history that never happened.
 */
export function ActivityTimeline() {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Activity
        </h2>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 opacity-40">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            <div className="h-2 flex-1 rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Project and task activity will appear here as it happens.
      </p>
    </div>
  );
}