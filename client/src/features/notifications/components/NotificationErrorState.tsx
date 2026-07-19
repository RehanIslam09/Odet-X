import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationErrorStateProps {
  onRetry: () => void;
}

export function NotificationErrorState({
  onRetry,
}: NotificationErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-destructive">
      <AlertCircle className="h-8 w-8 mb-4" />
      <p className="text-sm font-medium mb-4">
        Failed to load notifications.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
