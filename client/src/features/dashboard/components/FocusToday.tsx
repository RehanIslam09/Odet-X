import { Link } from "react-router-dom";
import { CalendarClock, CircleDashed, SquareCheckBig } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Today's Focus + Upcoming Deadlines.
 *
 * Tasks aren't wired up on the backend yet, so this is an honest empty
 * state describing what will populate here, rather than fabricated rows.
 */
export function FocusToday() {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <SquareCheckBig className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Today&apos;s focus
        </h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
        <CircleDashed className="h-6 w-6 text-muted-foreground/50" />
        <p className="max-w-[220px] text-xs text-muted-foreground">
          Tasks assigned to you and due today will show up here.
        </p>
        <Button id="focus-today-go-to-tasks" variant="outline" size="sm" asChild>
          <Link to="/tasks">Go to tasks</Link>
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold tracking-tight text-foreground">
          Upcoming deadlines
        </h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Deadlines from every project will be gathered here as they&apos;re set.
      </p>
    </div>
  );
}