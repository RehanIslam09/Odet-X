import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityErrorStateProps {
  onRetry?: () => void;
  message?: string;
}

export function ActivityErrorState({ onRetry, message }: ActivityErrorStateProps) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Failed to load activity</p>
        <p className="text-xs text-muted-foreground">
          {message || "There was a problem loading the recent activity feed."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 h-8">
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
