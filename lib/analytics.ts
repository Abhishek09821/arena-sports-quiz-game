/* ═══════════════════════════════════════════════════════════════
   ARENA — Analytics Event Tracking
   Lightweight event system for game analytics.
   ═══════════════════════════════════════════════════════════════ */

export type ArenaEvent =
  | "game_started"
  | "question_answered"
  | "game_completed"
  | "challenge_created"
  | "challenge_completed"
  | "room_created"
  | "room_joined"
  | "multiplayer_completed"
  | "sprint_started"
  | "sprint_completed";

interface EventPayload {
  event: ArenaEvent;
  timestamp: number;
  data: Record<string, unknown>;
}

const eventQueue: EventPayload[] = [];

/**
 * Track an analytics event.
 * Currently stores in memory; can be extended to send to Supabase or analytics service.
 */
export function trackEvent(event: ArenaEvent, data: Record<string, unknown> = {}) {
  const payload: EventPayload = {
    event,
    timestamp: Date.now(),
    data,
  };
  eventQueue.push(payload);

  // Keep only last 100 events in memory
  if (eventQueue.length > 100) {
    eventQueue.splice(0, eventQueue.length - 100);
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug(`[Arena Analytics] ${event}`, data);
  }
}

/** Get all queued events (for batch sending) */
export function getEventQueue(): EventPayload[] {
  return [...eventQueue];
}

/** Clear event queue after successful send */
export function clearEventQueue() {
  eventQueue.length = 0;
}
