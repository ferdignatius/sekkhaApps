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

  /** Fired when a user's profile, role, password, or claim status changes. */
  USER_UPDATED: "user.updated",

  /** Fired when a user account is deleted or anonymized by retention cleanup. */
  USER_DELETED: "user.deleted",

  /** Fired by Events module after attendance is recorded. */
  ATTENDANCE_RECORDED: "attendance.recorded",

  /** Fired by Gamification logic after a badge is earned. */
  BADGE_EARNED: "badge.earned",

  /** Fired by Events module after an event is closed and points are finalized. */
  EVENT_CLOSED: "event.closed",

  /** Fired when a season is created, updated, activated, or deleted. */
  SEASON_UPDATED: "season.updated",

  /** Fired when configure master data (event types, badge activities, point rules) changes. */
  CONFIG_UPDATED: "config.updated",

  /** Fired when school master data or school requests are created, updated, approved, rejected, or deleted. */
  SCHOOL_UPDATED: "school.updated",
} as const

// ─── Payload Types ───────────────────────────────────────────────────────────

export interface UserRegisteredPayload {
  userId: string
  email: string
  name: string
}

export interface UserUpdatedPayload {
  userId: string
  fields?: string[]
}

export interface UserDeletedPayload {
  userId: string
  reason?: string
}

export interface AttendanceRecordedPayload {
  userId: string
  eventId: string
  method: string
  eventTitle?: string
  isLate?: boolean
  pointsEarned?: number
  scannedAt?: string
}

export interface BadgeEarnedPayload {
  userId: string
  badgeId: string
  badgeName: string
}

export interface EventClosedPayload {
  eventId: string
  pointReward: number
  totalAttendees: number
  pointsDistributed: boolean
}

export interface SeasonUpdatedPayload {
  seasonId?: string
  action?: string
}

export interface ConfigUpdatedPayload {
  entity?: string
  entityId?: string
  action?: string
}

export interface SchoolUpdatedPayload {
  schoolId?: string
  action?: string
}
