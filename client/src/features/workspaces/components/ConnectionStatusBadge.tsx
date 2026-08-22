import { Wifi, WifiOff } from "lucide-react";
import { useRealtime } from "@/realtime/RealtimeContext.js";

export function ConnectionStatusBadge() {
  const { connected } = useRealtime();

  return (
    <div
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
      title={connected ? "Realtime connected" : "Connecting..."}
    >
      {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span className="hidden md:inline">{connected ? "Live" : "Connecting"}</span>
    </div>
  );
}
