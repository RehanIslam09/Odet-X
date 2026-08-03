import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/realtime/RealtimeContext";

/**
 * Production-grade Connection Status Badge Indicator.
 *
 * Requirements:
 * - Initial connect: Invisible (returns null)
 * - Brief reconnect (<3s): Silent (no intrusive UI flicker)
 * - Long reconnect (>3s): Small amber badge ("Reconnecting...") with aria-live="assertive"
 * - Offline: Red/gray badge ("Offline") with aria-live="assertive"
 * - Recovered: Brief green badge ("Connected") fading out automatically after 2 seconds
 */
export function ConnectionStatusBadge() {
  const { status } = useRealtime();
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const prevStatusRef = useRef(status);

  // 1. Manage 3s delayed display for reconnecting state
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    if (status === "reconnecting") {
      reconnectTimer = setTimeout(() => {
        setShowReconnecting(true);
      }, 3000);
    } else {
      reconnectTimer = setTimeout(() => {
        setShowReconnecting(false);
      }, 0);
    }

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [status]);

  // 2. Manage 2s auto-fading green confirmation when recovering from disconnect
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    let connectedTimer: ReturnType<typeof setTimeout> | undefined;

    if (
      status === "connected" &&
      (prevStatus === "reconnecting" || prevStatus === "offline")
    ) {
      setShowConnected(true);
      connectedTimer = setTimeout(() => {
        setShowConnected(false);
      }, 2000);
    }

    prevStatusRef.current = status;

    return () => {
      if (connectedTimer) clearTimeout(connectedTimer);
    };
  }, [status]);

  if (status === "offline") {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-all duration-200"
        aria-live="assertive"
        role="status"
        aria-label="Realtime connection offline"
      >
        <span className="h-2 w-2 rounded-full bg-destructive" />
        <span>Offline</span>
      </div>
    );
  }

  if (status === "reconnecting" && showReconnecting) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 transition-all duration-200"
        aria-live="assertive"
        role="status"
        aria-label="Reconnecting to realtime updates"
      >
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  if (showConnected) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-all duration-200"
        aria-live="polite"
        role="status"
        aria-label="Realtime connection restored"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>Connected</span>
      </div>
    );
  }

  return null;
}
