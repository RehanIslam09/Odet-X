export const REALTIME_EVENTS = {
  WORKSPACE_SUBSCRIBE: "workspace:subscribe",
  WORKSPACE_UNSUBSCRIBE: "workspace:unsubscribe",
  WORKSPACE_EVICTED: "workspace:evicted",
  DOMAIN_EVENT: "domain:event",
  PRESENCE_SNAPSHOT: "presence:snapshot",
  PRESENCE_UPDATED: "presence:updated",
  PRESENCE_VIEWING: "presence:viewing",
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
