// ─── Domain Events ───────────────────────────────────────────────────────────
// Central registry of all domain events in the system.
// Each module publishes events here; other modules subscribe.
//
// Adding a new event:
// 1. Add the event name constant below
// 2. Add the payload type interface
// 3. Publisher module calls: eventbus.publish(DomainEvents.XXX, payload)
// 4. Subscriber module calls: eventbus.subscribe(DomainEvents.XXX, handler)

export const DomainEvents = {
  /** Fired by Auth module after a new user registers successfully. */
  USER_REGISTERED: "user.registered",

  /** Fired by Events module after attendance is recorded. */
  ATTENDANCE_RECORDED: "attendance.recorded",

  /** Fired by Gamification logic after a badge is earned. */
  BADGE_EARNED: "badge.earned",
} as const

// ─── Payload Types ───────────────────────────────────────────────────────────

export interface UserRegisteredPayload {
  userId: string
  email: string
  name: string
}

export interface AttendanceRecordedPayload {
  userId: string
  eventId: string
  method: string
}

export interface BadgeEarnedPayload {
  userId: string
  badgeId: string
  badgeName: string
}
