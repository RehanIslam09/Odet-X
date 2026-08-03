import { createContext, useContext } from "react";

export type RealtimeStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "disconnected";

export interface RealtimeContextValue {
  status: RealtimeStatus;
  connected: boolean;
  reconnecting: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

/**
 * Public hook for consuming realtime transport state.
 * No component should access the client singleton directly.
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}
