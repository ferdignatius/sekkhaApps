import { eventModels } from "./models"
import { prisma } from "../../lib/prisma"
import { cached, invalidatePattern, invalidate, CacheKeys } from "../../lib/cache"
import { auditLogger } from "../../lib/auditLogger"
import { Prisma } from "@prisma/client"
import { AppError } from "../../lib/AppError"
import type { Prisma as PrismaTypes } from "@prisma/client"
import { canViewEvent } from "./policy"
import { eventbus, DomainEvents } from "../../core/eventbus"
import {
  calculateWeeklyStreak,
  toWeekKey,
  toMonthKey,
  evaluatePerfectMonthBonus,
} from "../../lib/streak"

const VALID_EVENT_STATUSES = ["scheduled", "active", "closed", "cancel"] as const
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const DAILY_POINT_CAP = 150

async function invalidateEventMutationCaches(): Promise<void> {
  await Promise.all([
    invalidatePattern("events:*"),
    invalidate(CacheKeys.events()),
    invalidatePattern("user:*:home:*"),
  ])
}

async function invalidateAttendanceMutationCaches(): Promise<void> {
  await Promise.all([
    invalidatePattern("events:*"),
    invalidatePattern("user:*:home:*"),
    invalidatePattern("user:*:streak"),
    invalidatePattern("pengurus:insight:*"),
  ])
}

async function closeExpiredEventSafely(eventId: string): Promise<void> {
  try {
    await eventServices.updateEventStatus("system", "admin", eventId, "closed")
  } catch (err: any) {
    if (err?.code === "INVALID_STATUS_TRANSITION") {
      const latest = await eventModels.findEventBasic(eventId)
      if (latest?.status === "closed") return
    }
    throw err
  }
}

function toWibDateKey(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

function getStartOfCurrentWibDayUtc(now = new Date()): Date {
  const wibNow = new Date(now.getTime() + WIB_OFFSET_MS)
  return new Date(
    Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate(), 0, 0, 0, 0) -
      WIB_OFFSET_MS
  )
}

function isActiveEventExpired(
  status: string,
  eventDate: Date | string,
  now = new Date()
): boolean {
  if (status !== "active") return false
  const parsed = typeof eventDate === "string" ? new Date(eventDate) : eventDate
  if (isNaN(parsed.getTime())) return false
  return toWibDateKey(now) > toWibDateKey(parsed)
}

type CreateEventInput = {
  title: string
  description?: string
  location?: string
  event_date: string
  event_type?: string
  event_type_id?: string
  season_id?: string
  tag?: string
  visibility?: "all" | "member" | "activist" | "organizer"
  point_reward?: number
  max_late_minutes?: number
  late_penalty_points?: number
}
type UpdateEventInput = Partial<CreateEventInput>

export const eventServices = {
  async autoCloseExpiredActiveEvents() {
    const now = new Date()
    const startOfTodayWib = getStartOfCurrentWibDayUtc(now)
    const expiredEvents = await eventModels.findExpiredActiveEvents(startOfTodayWib)
    const closedEventIds: string[] = []

    for (const ev of expiredEvents) {
      if (isActiveEventExpired("active", ev.eventDate, now)) {
        await closeExpiredEventSafely(ev.id)
        closedEventIds.push(ev.id)
      }
    }

    return {
      closedCount: closedEventIds.length,
      closedEventIds,
    }
  },

  async listEvents(
    userRole: string,
    isPrivileged: boolean,
    page = 1,
    limit = 50,
    filters?: {
      status?: string
      event_type_id?: string
      month?: string
      search?: string
    }
  ) {
    await this.autoCloseExpiredActiveEvents().catch(() => {})

    const validPage = Math.max(1, page)
    const validLimit = Math.min(100, Math.max(1, limit))
    const skip = (validPage - 1) * validLimit

    const andConditions: PrismaTypes.EventWhereInput[] = []

    // 1. Role-based Visibility & Lifecycle Filters
    if (userRole === "member") {
      andConditions.push({
        status: { in: ["scheduled", "active", "closed"] },
        visibility: { in: ["all", "member"] },
      })
    } else if (userRole === "activist") {
      andConditions.push({
        status: { in: ["scheduled", "active", "closed"] },
        visibility: { in: ["all", "activist"] },
      })
    }

    // 2. Query Filters
    if (filters?.status && VALID_EVENT_STATUSES.includes(filters.status as any)) {
      andConditions.push({
        status: filters.status as (typeof VALID_EVENT_STATUSES)[number],
      })
    }

    if (filters?.event_type_id) {
      andConditions.push({ eventTypeId: filters.event_type_id })
    }

    if (filters?.month && /^\d{4}-\d{2}$/.test(filters.month)) {
      const [y, m] = filters.month.split("-").map((v) => parseInt(v, 10))
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
      andConditions.push({
        eventDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      })
    }

    if (filters?.search && typeof filters.search === "string" && filters.search.trim()) {
      const q = filters.search.trim()
      andConditions.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      })
    }

    const whereClause: PrismaTypes.EventWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {}

    const query = {
      isPrivileged,
      page: validPage,
      limit: validLimit,
      status: filters?.status || null,
      event_type_id: filters?.event_type_id || null,
      month: filters?.month || null,
      search: filters?.search?.trim() || null,
    }

    const list = await cached(
      CacheKeys.events(userRole || "anon", JSON.stringify(query)),
      15,
      async () => {
        const events = await eventModels.findEvents(whereClause, skip, validLimit)
        for (const ev of events) {
          if (isActiveEventExpired(ev.status, ev.eventDate)) {
            await closeExpiredEventSafely(ev.id)
            ;(ev as any).status = "closed"
          }
        }

        return events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          location: e.location,
          event_date:
            typeof e.eventDate === "string"
              ? e.eventDate
              : new Date(e.eventDate).toISOString(),
          status: e.status,
          visibility: e.visibility,
          point_reward: e.pointReward,
          max_late_minutes: e.maxLateMinutes ?? 30,
          late_penalty_points: e.latePenaltyPoints ?? 15,
          total_attendees: e._count?.attendances ?? 0,
          event_type: e.type
            ? {
                id: e.type.id,
                code: e.type.code,
                label: e.type.label,
                color: e.type.color,
                default_point_reward: e.type.defaultPointReward,
                apply_late_penalty: e.type.applyLatePenalty ?? true,
                default_max_late_minutes: e.type.defaultMaxLateMinutes ?? 30,
                default_late_penalty_points: e.type.defaultLatePenaltyPoints ?? 15,
              }
            : null,
        }))
      }
    )

    for (const ev of list) {
      if (isActiveEventExpired(ev.status, ev.event_date)) {
        await closeExpiredEventSafely(ev.id)
        ;(ev as any).status = "closed"
      }
    }

    return list
  },

  async getEventDetail(id: string, userRole: string, isPrivileged: boolean) {
    const detail = await cached(
      CacheKeys.eventDetail(id, userRole || "anon"),
      30,
      async () => {
        const event = await eventModels.findEventById(id)
        if (!event) {
          throw new AppError("Event not found", 404, "EVENT_NOT_FOUND")
        }

        if (isActiveEventExpired(event.status, event.eventDate)) {
          await closeExpiredEventSafely(event.id)
          ;(event as any).status = "closed"
        }

        if (!canViewEvent(userRole, event.status, event.visibility)) {
          // Return 404 Not Found to prevent information disclosure per PRD Section 5
          throw new AppError("Event not found", 404, "EVENT_NOT_FOUND")
        }

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          event_date:
            typeof event.eventDate === "string"
              ? event.eventDate
              : new Date(event.eventDate).toISOString(),
          status: event.status,
          visibility: event.visibility,
          point_reward: event.pointReward,
          max_late_minutes: event.maxLateMinutes ?? 30,
          late_penalty_points: event.latePenaltyPoints ?? 15,
          total_attendees: event._count?.attendances ?? 0,
          event_type: event.type
            ? {
                id: event.type.id,
                code: event.type.code,
                label: event.type.label,
                color: event.type.color,
                default_point_reward: event.type.defaultPointReward,
                apply_late_penalty: event.type.applyLatePenalty ?? true,
                default_max_late_minutes: event.type.defaultMaxLateMinutes ?? 30,
                default_late_penalty_points: event.type.defaultLatePenaltyPoints ?? 15,
              }
            : null,
          season_id: event.seasonId,
          created_at: event.createdAt.toISOString(),
          updated_at: event.updatedAt.toISOString(),
        }
      }
    )

    if (detail && isActiveEventExpired(detail.status, detail.event_date)) {
      await closeExpiredEventSafely(detail.id)
      return { ...detail, status: "closed" as typeof detail.status }
    }

    return detail
  },

  async createEvent(actorId: string, actorRole: string, body: CreateEventInput) {
    const eventDate = new Date(body.event_date)
    if (isNaN(eventDate.getTime())) {
      throw new AppError("Invalid event date format", 400, "INVALID_DATE")
    }

    // PRD Section 6.3 & 8.3 & AC-EVT-12: Event date cannot be in the past
    // Allow small 60s tolerance for clock drift
    if (eventDate.getTime() < Date.now() - 60000) {
      throw new AppError("Event date cannot be in the past", 400, "EVENT_DATE_PAST")
    }

    let eventTypeId = body.event_type_id || (body as any).eventTypeId
    let eventType = null
    if (eventTypeId) {
      eventType = await eventModels.findEventTypeById(eventTypeId)
    } else if (body.event_type) {
      eventType = await prisma.eventType.findUnique({ where: { code: body.event_type } })
      if (eventType) eventTypeId = eventType.id
    } else if (body.tag) {
      eventType = await prisma.eventType.findFirst({
        where: {
          OR: [{ code: body.tag.toLowerCase() }, { label: { equals: body.tag, mode: "insensitive" } }],
        },
      })
      if (eventType) eventTypeId = eventType.id
    }

    if (!eventTypeId || !eventType) {
      throw new AppError("Event type (event_type_id) is required", 400, "EVENT_TYPE_REQUIRED")
    }

    let seasonId = body.season_id
    if (!seasonId) {
      const activeSeason = await prisma.season.findFirst({
        where: { isActive: true, endDate: { gte: new Date() } },
      })
      seasonId = activeSeason?.id
    }

    const applyLatePenalty = eventType.applyLatePenalty ?? true
    const pointReward = body.point_reward ?? eventType.defaultPointReward ?? 50
    const maxLateMinutes = body.max_late_minutes ?? eventType.defaultMaxLateMinutes ?? 30
    const latePenaltyPoints =
      body.late_penalty_points ??
      (applyLatePenalty ? (eventType.defaultLatePenaltyPoints ?? 15) : 0)

    const event = await prisma.event.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        location: body.location?.trim() ?? "",
        eventDate,
        eventTypeId,
        seasonId: seasonId || null,
        status: "scheduled", // PRD: new event always starts as scheduled
        visibility: body.visibility ?? "all",
        pointReward,
        maxLateMinutes,
        latePenaltyPoints,
      },
      include: { type: true },
    })

    await invalidateEventMutationCaches()

    auditLogger.log({
      actorId,
      actorRole,
      action: "EVENT_CREATED",
      targetId: event.id,
      status: "SUCCESS",
      details: { title: event.title, visibility: event.visibility },
    })

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: event.eventDate.toISOString(),
      visibility: event.visibility,
      status: event.status,
      point_reward: event.pointReward,
      max_late_minutes: event.maxLateMinutes,
      late_penalty_points: event.latePenaltyPoints,
      event_type: event.type
        ? {
            id: event.type.id,
            code: event.type.code,
            label: event.type.label,
            color: event.type.color,
            apply_late_penalty: event.type.applyLatePenalty ?? true,
            default_max_late_minutes: event.type.defaultMaxLateMinutes ?? 30,
            default_late_penalty_points: event.type.defaultLatePenaltyPoints ?? 15,
          }
        : null,
    }
  },

  async updateEvent(actorId: string, actorRole: string, id: string, body: UpdateEventInput) {
    const current = await eventModels.findEventById(id)
    if (!current) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND")
    }

    if (current.status === "closed" || current.status === "cancel") {
      throw new AppError(
        current.status === "closed"
          ? "Closed events cannot be edited."
          : "Cancelled events cannot be edited. Reschedule it first.",
        400,
        current.status === "closed" ? "CANNOT_EDIT_CLOSED_EVENT" : "CANNOT_EDIT_CANCELLED_EVENT"
      )
    }

    let eventDate: Date | undefined
    if (body.event_date) {
      eventDate = new Date(body.event_date)
      if (isNaN(eventDate.getTime())) {
        throw new AppError("Invalid event date format", 400, "INVALID_DATE")
      }
      if (eventDate.getTime() < Date.now() - 60000) {
        throw new AppError("Event date cannot be in the past", 400, "EVENT_DATE_PAST")
      }
    }

    let eventTypeId = body.event_type_id || (body as any).eventTypeId
    if (!eventTypeId && body.event_type) {
      const typeByCode = await prisma.eventType.findUnique({
        where: { code: body.event_type },
      })
      if (typeByCode) eventTypeId = typeByCode.id
    }
    if (!eventTypeId && body.tag) {
      const typeByTag = await prisma.eventType.findFirst({
        where: {
          OR: [{ code: body.tag.toLowerCase() }, { label: { equals: body.tag, mode: "insensitive" } }],
        },
      })
      if (typeByTag) eventTypeId = typeByTag.id
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.location !== undefined && { location: body.location?.trim() }),
        ...(eventDate && { eventDate }),
        ...(body.visibility && { visibility: body.visibility }),
        ...(eventTypeId !== undefined && { eventTypeId }),
        ...(body.season_id !== undefined && { seasonId: body.season_id }),
        ...(body.point_reward !== undefined && { pointReward: body.point_reward }),
        ...(body.max_late_minutes !== undefined && { maxLateMinutes: body.max_late_minutes }),
        ...(body.late_penalty_points !== undefined && { latePenaltyPoints: body.late_penalty_points }),
      },
      include: { type: true },
    })

    await invalidateEventMutationCaches()

    auditLogger.log({
      actorId,
      actorRole,
      action: "EVENT_UPDATED",
      targetId: event.id,
      status: "SUCCESS",
      details: { title: event.title, visibility: event.visibility },
    })

    return {
      id: event.id,
      title: event.title,
      status: event.status,
      visibility: event.visibility,
    }
  },

  async updateEventStatus(
    actorId: string,
    actorRole: string,
    id: string,
    targetStatus: string,
    rescheduleDate?: string
  ) {
    const normalizedTarget = targetStatus
    let wasResetFromClosed = false

    const result = await prisma.$transaction(async (tx) => {
      const currentEvent = await tx.event.findUnique({
        where: { id },
        include: { type: true },
      })

      if (!currentEvent) {
        throw new AppError("Event not found", 404, "EVENT_NOT_FOUND")
      }

      const currentStatus = currentEvent.status

      if (currentStatus === normalizedTarget) {
        return { event: currentEvent, totalAttendees: 0, pointsDistributed: false }
      }

      let updatedEventDate: Date | undefined

      // 1. Validation for "active" transition
      if (normalizedTarget === "active") {
        if (currentStatus !== "scheduled") {
          throw new AppError("Only scheduled events can be started.", 400, "INVALID_STATUS_TRANSITION")
        }

        const nowTime = Date.now()

        if (rescheduleDate) {
          const parsedDate = new Date(rescheduleDate)
          if (isNaN(parsedDate.getTime())) {
            throw new AppError("Invalid reschedule date format.", 400, "INVALID_DATE_FORMAT")
          }
          updatedEventDate = parsedDate
        }

        const effectiveEventDate = updatedEventDate ?? new Date(currentEvent.eventDate)
        if (toWibDateKey(new Date(nowTime)) > toWibDateKey(effectiveEventDate)) {
          throw new AppError(
            "Event cannot be activated because its scheduled date has already passed",
            400,
            "EVENT_DATE_PASSED"
          )
        }

        // Anchor eventDate to the actual session start timestamp (now) on initial start,
        // but preserve the original start timestamp if the event already has recorded attendances
        // (e.g., after an Admin resets a closed event to draft and restarts it) so existing
        // late statuses / point calculations remain anchored to when the event first started.
        if (!updatedEventDate) {
          const existingAttendanceCount =
            typeof (tx.attendance as any)?.count === "function"
              ? await (tx.attendance as any).count({ where: { eventId: id } })
              : 0
          if (existingAttendanceCount === 0) {
            updatedEventDate = new Date(nowTime)
          }
        }
      }

      // 2. Validation for "scheduled" (Reschedule from cancel OR Admin reset from closed)
      if (normalizedTarget === "scheduled") {
        if (currentStatus === "closed") {
          if (actorRole !== "admin") {
            throw new AppError(
              "Only administrators can reset a closed event back to draft.",
              403,
              "FORBIDDEN"
            )
          }
          if (typeof (tx.event as any).updateMany === "function") {
            const claimed = await (tx.event as any).updateMany({
              where: { id, status: "closed" },
              data: { status: "scheduled" },
            })
            if (!claimed || claimed.count === 0) {
              throw new AppError(
                "Only closed events can be reset to draft.",
                400,
                "INVALID_STATUS_TRANSITION"
              )
            }
          }
          wasResetFromClosed = true
        } else if (currentStatus === "cancel") {
          if (!rescheduleDate) {
            throw new AppError("Reschedule date is required.", 400, "RESCHEDULE_DATE_REQUIRED")
          }
          const parsedDate = new Date(rescheduleDate)
          if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now() - 60000) {
            throw new AppError("Rescheduled event date cannot be in the past.", 400, "EVENT_DATE_PAST")
          }
          updatedEventDate = parsedDate
        } else {
          throw new AppError(
            "Only cancelled or closed events can be transitioned to scheduled.",
            400,
            "INVALID_STATUS_TRANSITION"
          )
        }
      }

      // 3. Validation for "cancel"
      if (normalizedTarget === "cancel" && currentStatus === "closed") {
        throw new AppError(
          "Closed events cannot be cancelled because points have already been distributed.",
          400,
          "EVENT_CLOSED_IMMUTABLE"
        )
      }

      // 4. Validation for "closed"
      if (normalizedTarget === "closed") {
        if (currentStatus !== "active") {
          throw new AppError("Only active events can be closed and finalized.", 400, "INVALID_STATUS_TRANSITION")
        }
        if (typeof (tx.event as any).updateMany === "function") {
          const claimed = await (tx.event as any).updateMany({
            where: { id, status: "active" },
            data: { status: "closed" },
          })
          if (!claimed || claimed.count === 0) {
            throw new AppError(
              "Only active events can be closed and finalized.",
              400,
              "INVALID_STATUS_TRANSITION"
            )
          }
        }
      }

      const updated = await tx.event.update({
        where: { id },
        data: {
          status: normalizedTarget as any,
          ...(updatedEventDate && { eventDate: updatedEventDate }),
        },
        include: { type: true },
      })

      let totalAttendees = 0
      let pointsDistributed = false

      // 4. Finalize Points when closing
      if (normalizedTarget === "closed") {
        const attendees = await tx.attendance.findMany({ where: { eventId: id } })
        totalAttendees = attendees.length

        if (attendees.length > 0) {
          // Mark all draft attendances as finalized
          await tx.attendance.updateMany({
            where: { eventId: id },
            data: { isFinalized: true },
          })

          const existingTxs = await tx.pointTransaction.findMany({
            where: { referenceId: { in: attendees.map((a) => a.id) } },
            select: { referenceId: true },
          })
          const processedAttIds = new Set(existingTxs.map((t) => t.referenceId))
          const pendingAttendees = attendees.filter((a) => !processedAttIds.has(a.id))

          if (pendingAttendees.length > 0) {
            const attendeeUserIds = Array.from(new Set(pendingAttendees.map((a) => a.userId)))

            // Fetch active PointRule definitions (first_attendance_bonus & streak_monthly_bonus)
            const activeRules = await tx.pointRule.findMany({ where: { isActive: true } })
            const ruleByCode = new Map(activeRules.map((r) => [r.code, r]))
            const firstAttendanceRule = ruleByCode.get("first_attendance_bonus")
            const streakMonthlyRule = ruleByCode.get("streak_monthly_bonus")

            // Enforce 150-point daily cap (pointRules.md)
            const nowDate = new Date()
            const startOfToday = getStartOfCurrentWibDayUtc(
              currentEvent.eventDate ? new Date(currentEvent.eventDate) : nowDate
            )
            const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)

            const todayPointSums = await tx.pointTransaction.groupBy({
              by: ["userId"],
              where: {
                userId: { in: attendeeUserIds },
                createdAt: { gte: startOfToday, lte: endOfToday },
                amount: { gt: 0 },
              },
              _sum: { amount: true },
            })
            const earnedTodayByUser = new Map<string, number>(
              todayPointSums.map((row) => [row.userId, row._sum.amount ?? 0])
            )

            // Fetch user claim & attendance stats BEFORE incrementing for first_attendance_bonus check
            const attendeeUsers = await tx.user.findMany({
              where: { id: { in: attendeeUserIds } },
              select: {
                id: true,
                isClaimed: true,
                stats: { select: { totalAttendances: true, currentStreak: true } },
              },
            })
            const userMetaById = new Map(attendeeUsers.map((u) => [u.id, u]))

            // Fetch all finalized attendances for streak calculation
            const finalizedAttendances = await tx.attendance.findMany({
              where: {
                userId: { in: attendeeUserIds },
                isFinalized: true,
              },
              select: {
                userId: true,
                scannedAt: true,
              },
            })
            const attendancesByUser = new Map<string, { scannedAt: Date }[]>()
            for (const fa of finalizedAttendances) {
              const list = attendancesByUser.get(fa.userId) ?? []
              list.push({ scannedAt: fa.scannedAt })
              attendancesByUser.set(fa.userId, list)
            }

            const eventDt = new Date(currentEvent.eventDate)
            const monthStart = new Date(
              Date.UTC(eventDt.getUTCFullYear(), eventDt.getUTCMonth(), 1, 0, 0, 0, 0)
            )
            const monthEnd = new Date(
              Date.UTC(eventDt.getUTCFullYear(), eventDt.getUTCMonth() + 1, 0, 23, 59, 59, 999)
            )
            const currentEventWeekKey = toWeekKey(eventDt)
            const currentMonthKey = toMonthKey(eventDt)

            const activeCommunityWeeks = new Set<string>([currentEventWeekKey])
            let monthEventDates: Date[] = [eventDt]
            let hasFutureUnclosedWeeksInMonth = false

            if (typeof (tx.event as any).findMany === "function") {
              const [closedEvents, monthEvents] = await Promise.all([
                tx.event.findMany({
                  where: { status: "closed", eventDate: { lte: eventDt } },
                  select: { eventDate: true },
                }),
                tx.event.findMany({
                  where: {
                    status: { in: ["closed", "active", "scheduled"] },
                    eventDate: { gte: monthStart, lte: monthEnd },
                  },
                  select: { id: true, eventDate: true, status: true },
                }),
              ])
              for (const ce of closedEvents) {
                activeCommunityWeeks.add(toWeekKey(new Date(ce.eventDate)))
              }
              monthEventDates = monthEvents.map((e) => new Date(e.eventDate))
              if (!monthEvents.some((e) => e.id === currentEvent.id)) {
                monthEventDates.push(eventDt)
              }
              hasFutureUnclosedWeeksInMonth = monthEvents.some(
                (e) =>
                  e.id !== currentEvent.id &&
                  e.status !== "closed" &&
                  toWeekKey(new Date(e.eventDate)) > currentEventWeekKey
              )
            } else {
              for (const fa of finalizedAttendances) {
                const faDt = new Date(fa.scannedAt)
                activeCommunityWeeks.add(toWeekKey(faDt))
                if (toMonthKey(faDt) === currentMonthKey) {
                  monthEventDates.push(faDt)
                }
              }
            }

            const pointTxData: PrismaTypes.PointTransactionCreateManyInput[] = []
            const statsByUser = new Map<
              string,
              { points: number; count: number; scannedAt: Date; currentStreak: number }
            >()

            for (const att of pendingAttendees) {
              const rawAmount = att.pointsEarned + (att.badgeBonusPoints ?? 0)
              const alreadyEarnedToday = earnedTodayByUser.get(att.userId) ?? 0
              const remainingDailyCap = Math.max(0, DAILY_POINT_CAP - alreadyEarnedToday)
              const clampedAmount = Math.min(rawAmount, remainingDailyCap)
              earnedTodayByUser.set(att.userId, alreadyEarnedToday + clampedAmount)

              pointTxData.push({
                userId: att.userId,
                ruleId: null, // Event attendance points are driven directly by Event & EventType
                amount: clampedAmount,
                type: "attendance" as const,
                description: `Event Attendance: ${currentEvent.title}`,
                referenceId: att.id,
              })

              const current = statsByUser.get(att.userId)
              if (current) {
                current.points += clampedAmount
                current.count += 1
                if (att.scannedAt > current.scannedAt) current.scannedAt = att.scannedAt
              } else {
                const userAtts = attendancesByUser.get(att.userId) ?? [{ scannedAt: att.scannedAt }]
                const { current_streak } = calculateWeeklyStreak(
                  userAtts,
                  eventDt,
                  activeCommunityWeeks
                )
                statsByUser.set(att.userId, {
                  points: clampedAmount,
                  count: 1,
                  scannedAt: att.scannedAt,
                  currentStreak: current_streak,
                })
              }
            }

            // Check first_attendance_bonus & streak_monthly_bonus per attendee
            const bonusCandidateRefs: string[] = []
            const monthBonusByUser = new Map<string, ReturnType<typeof evaluatePerfectMonthBonus>>()
            for (const [userId] of statsByUser) {
              bonusCandidateRefs.push(`first_attendance:${userId}`)
              const userAtts = attendancesByUser.get(userId) ?? []
              const monthEval = evaluatePerfectMonthBonus({
                userId,
                userAttendances: userAtts,
                monthEventDates,
                referenceEventDate: eventDt,
                hasFutureUnclosedWeeksInMonth,
              })
              monthBonusByUser.set(userId, monthEval)
              if (monthEval.eligible) {
                bonusCandidateRefs.push(monthEval.referenceId)
              }
            }

            const existingBonusTxs =
              bonusCandidateRefs.length > 0
                ? await tx.pointTransaction.findMany({
                    where: { referenceId: { in: bonusCandidateRefs } },
                    select: { referenceId: true },
                  })
                : []
            const existingBonusRefSet = new Set(existingBonusTxs.map((t) => t.referenceId))

            for (const [userId, stats] of statsByUser) {
              const userMeta = userMetaById.get(userId)

              // 1) first_attendance_bonus (System milestone, immune to daily point cap per PRD 2.2)
              if (
                firstAttendanceRule &&
                firstAttendanceRule.points > 0 &&
                userMeta?.isClaimed &&
                (userMeta.stats?.totalAttendances ?? 0) === 0
              ) {
                const firstRef = `first_attendance:${userId}`
                if (!existingBonusRefSet.has(firstRef)) {
                  const bonusAmount = firstAttendanceRule.points
                  stats.points += bonusAmount
                  pointTxData.push({
                    userId,
                    ruleId: firstAttendanceRule.id,
                    amount: bonusAmount,
                    type: "system" as const,
                    description: `${firstAttendanceRule.label}: ${currentEvent.title}`,
                    referenceId: firstRef,
                  })
                  existingBonusRefSet.add(firstRef)
                }
              }

              // 2) streak_monthly_bonus (Perfect Month >= 3 active weeks, immune to daily point cap)
              if (streakMonthlyRule && streakMonthlyRule.points > 0) {
                const monthEval = monthBonusByUser.get(userId)
                if (monthEval && monthEval.eligible && !existingBonusRefSet.has(monthEval.referenceId)) {
                  const bonusAmount = streakMonthlyRule.points
                  stats.points += bonusAmount
                  pointTxData.push({
                    userId,
                    ruleId: streakMonthlyRule.id,
                    amount: bonusAmount,
                    type: "system" as const,
                    description: `${streakMonthlyRule.label} (${monthEval.yearMonth})`,
                    referenceId: monthEval.referenceId,
                  })
                  existingBonusRefSet.add(monthEval.referenceId)
                }
              }
            }

            await tx.pointTransaction.createMany({ data: pointTxData, skipDuplicates: true })

            await Promise.all(
              Array.from(statsByUser.entries()).map(([userId, stats]) =>
                tx.userStats.upsert({
                  where: { userId },
                  update: {
                    points: { increment: stats.points },
                    totalAttendances: { increment: stats.count },
                    currentStreak: stats.currentStreak,
                    lastActivityAt: stats.scannedAt,
                  },
                  create: {
                    userId,
                    points: stats.points,
                    totalAttendances: stats.count,
                    currentStreak: stats.currentStreak,
                    lastActivityAt: stats.scannedAt,
                  },
                })
              )
            )

            pointsDistributed = true
          }
        }
      }

      // 5. Rollback distributed points & unfinalize attendances when Admin resets closed -> scheduled
      if (wasResetFromClosed) {
        const attendees = await tx.attendance.findMany({ where: { eventId: id } })
        totalAttendees = attendees.length

        if (attendees.length > 0) {
          // Unfinalize attendances while preserving isLate, pointsEarned, badgeActivityId, badgeBonusPoints, and scannedAt
          await tx.attendance.updateMany({
            where: { eventId: id },
            data: { isFinalized: false },
          })

          const attendeeIds = attendees.map((a) => a.id)
          const attendeeUserIds = Array.from(new Set(attendees.map((a) => a.userId)))
          const eventDt = new Date(currentEvent.eventDate)
          const currentMonthKey = toMonthKey(eventDt)

          const [attendanceTxs, remainingFinalized] = await Promise.all([
            tx.pointTransaction.findMany({
              where: { referenceId: { in: attendeeIds } },
              select: { id: true, userId: true, amount: true, referenceId: true },
            }),
            tx.attendance.findMany({
              where: { userId: { in: attendeeUserIds }, isFinalized: true },
              select: { userId: true, scannedAt: true },
            }),
          ])

          const remainingByUser = new Map<string, { scannedAt: Date }[]>()
          for (const rf of remainingFinalized) {
            const list = remainingByUser.get(rf.userId) ?? []
            list.push({ scannedAt: rf.scannedAt })
            remainingByUser.set(rf.userId, list)
          }

          const bonusCandidateRefs: string[] = []
          for (const userId of attendeeUserIds) {
            const remaining = remainingByUser.get(userId) ?? []
            if (remaining.length === 0) {
              bonusCandidateRefs.push(`first_attendance:${userId}`)
            }
            bonusCandidateRefs.push(`streak_monthly_bonus:${userId}:${currentMonthKey}`)
          }

          const bonusTxs =
            bonusCandidateRefs.length > 0
              ? await tx.pointTransaction.findMany({
                  where: { referenceId: { in: bonusCandidateRefs } },
                  select: { id: true, userId: true, amount: true, referenceId: true },
                })
              : []

          const allTxsToRollback = [...attendanceTxs, ...bonusTxs]
          const txIdsToDelete = allTxsToRollback.map((t) => t.id)

          if (txIdsToDelete.length > 0 && typeof (tx.pointTransaction as any).deleteMany === "function") {
            await (tx.pointTransaction as any).deleteMany({
              where: { id: { in: txIdsToDelete } },
            })
          }

          const pointsToDeductByUser = new Map<string, number>()
          for (const t of allTxsToRollback) {
            pointsToDeductByUser.set(t.userId, (pointsToDeductByUser.get(t.userId) ?? 0) + t.amount)
          }

          const attendanceCountByUser = new Map<string, number>()
          for (const att of attendees) {
            attendanceCountByUser.set(att.userId, (attendanceCountByUser.get(att.userId) ?? 0) + 1)
          }

          // Recompute remaining community active weeks for accurate streak rollback
          const activeCommunityWeeks = new Set<string>()
          if (typeof (tx.event as any).findMany === "function") {
            const closedEvents = await tx.event.findMany({
              where: { status: "closed" },
              select: { eventDate: true },
            })
            for (const ce of closedEvents) {
              activeCommunityWeeks.add(toWeekKey(new Date(ce.eventDate)))
            }
          }

          await Promise.all(
            attendeeUserIds.map(async (userId) => {
              const existingStats =
                typeof (tx.userStats as any).findUnique === "function"
                  ? await (tx.userStats as any).findUnique({ where: { userId } })
                  : null
              if (!existingStats || typeof (tx.userStats as any).update !== "function") return

              const deductPoints = pointsToDeductByUser.get(userId) ?? 0
              const deductAtts = attendanceCountByUser.get(userId) ?? 0
              const remainingUserAtts = remainingByUser.get(userId) ?? []

              let recomputedStreak = 0
              let latestRemainingScan: Date | null = null
              if (remainingUserAtts.length > 0) {
                for (const r of remainingUserAtts) {
                  if (!latestRemainingScan || r.scannedAt > latestRemainingScan) {
                    latestRemainingScan = r.scannedAt
                  }
                }
                const { current_streak } = calculateWeeklyStreak(
                  remainingUserAtts,
                  latestRemainingScan ?? new Date(),
                  activeCommunityWeeks
                )
                recomputedStreak = current_streak
              }

              await (tx.userStats as any).update({
                where: { userId },
                data: {
                  points: Math.max(0, (existingStats.points ?? 0) - deductPoints),
                  totalAttendances: Math.max(0, (existingStats.totalAttendances ?? 0) - deductAtts),
                  currentStreak: recomputedStreak,
                  lastActivityAt: latestRemainingScan,
                },
              })
            })
          )
        }
      }

      return { event: updated, totalAttendees, pointsDistributed }
    })

    await invalidateEventMutationCaches()
    if (normalizedTarget === "closed" || wasResetFromClosed) {
      await Promise.all([
        invalidatePattern("user:*:profile"),
        invalidatePattern("user:*:streak"),
        invalidatePattern("pengurus:insight:*"),
        invalidatePattern("leaderboard:*"),
      ])
    }

    auditLogger.log({
      actorId,
      actorRole,
      action: "EVENT_STATUS_CHANGED",
      targetId: result.event.id,
      status: "SUCCESS",
      details: { status: normalizedTarget },
    })

    if (normalizedTarget === "closed") {
      eventbus.publish(DomainEvents.EVENT_CLOSED, {
        eventId: result.event.id,
        pointReward: result.event.pointReward,
        totalAttendees: result.totalAttendees,
        pointsDistributed: result.pointsDistributed,
      })
    }

    return {
      id: result.event.id,
      title: result.event.title,
      status: normalizedTarget,
      total_attendees: result.totalAttendees,
      points_distributed: result.pointsDistributed,
      event_date: result.event.eventDate.toISOString(),
    }
  },

  async recordAttendance(
    actorId: string,
    eventId: string,
    targetIdentifier: string,
    method: "qr" | "manual" = "qr"
  ) {
    const event = await eventModels.findEventBasic(eventId)
    if (!event) {
      throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
    }

    if (isActiveEventExpired(event.status, event.eventDate)) {
      await closeExpiredEventSafely(event.id)
      ;(event as any).status = "closed"
    }

    if (event.status !== "active") {
      throw new AppError(
        `Attendance cannot be recorded because current event status is "${event.status}". Attendance is only open when event is "active".`,
        400,
        "EVENT_NOT_ACTIVE"
      )
    }

    const user = await eventModels.findUserForAttendance(targetIdentifier)
    if (!user) {
      throw new AppError(
        `User with identifier "${targetIdentifier}" not found.`,
        404,
        "USER_NOT_FOUND"
      )
    }

    // Check existing attendance (Zero duplicate guarantee)
    const existing = await eventModels.findExistingAttendance(eventId, user.id)
    if (existing) {
      throw new AppError("Participant has already attended", 409, "ALREADY_ATTENDED")
    }

    // Evaluate Late Penalty (if late_penalty_points <= 0, late policy is disabled and isLate is always false)
    const maxLateMinutes = event.maxLateMinutes ?? 30
    const latePenaltyPoints = event.latePenaltyPoints ?? 15
    const scheduledTime = new Date(event.eventDate).getTime()
    const nowTime = Date.now()
    const isLate =
      latePenaltyPoints > 0 &&
      nowTime > scheduledTime + maxLateMinutes * 60 * 1000
    const latePenaltyApplied = isLate ? latePenaltyPoints : 0
    const basePoints = event.pointReward ?? event.type?.defaultPointReward ?? 50
    const pointsEarned = Math.max(0, basePoints - latePenaltyApplied)

    let attendance
    try {
      attendance = await eventModels.createAttendance({
        userId: user.id,
        eventId,
        method,
        pointsEarned,
        isLate,
        latePenaltyApplied,
        isFinalized: false, // PRD: Draft until event closed
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Participant has already attended", 409, "ALREADY_ATTENDED")
      }
      throw error
    }

    await invalidateAttendanceMutationCaches()

    const attendeeName = user.profile?.name ?? "Sekkha Member"

    auditLogger.log({
      actorId,
      actorRole: "attendance_operator",
      action: "ATTENDANCE_RECORDED",
      targetId: attendance.id,
      status: "SUCCESS",
      details: { eventId, userId: user.id, method, isLate },
    })

    eventbus.publish(DomainEvents.ATTENDANCE_RECORDED, {
      userId: user.id,
      eventId,
      method,
    })

    return {
      attendance_id: attendance.id,
      user_id: user.id,
      name: attendeeName,
      user_number: user.userNumber ? String(user.userNumber) : "",
      role: user.role,
      school: user.profile?.school?.name ?? "Umum",
      points_earned: pointsEarned,
      is_late: isLate,
      late_penalty_applied: latePenaltyApplied,
      is_finalized: false,
      scanned_at: attendance.scannedAt.toISOString(),
    }
  },

  async assignBadgeActivity(
    actorId: string,
    eventId: string,
    userId: string,
    badgeActivityId?: string | null
  ) {
    const [event, existing] = await Promise.all([
      eventModels.findEventBasic(eventId),
      eventModels.findExistingAttendance(eventId, userId),
    ])
    if (!event) {
      throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
    }
    if (!existing) {
      throw new AppError("Attendance record not found.", 404, "ATTENDANCE_NOT_FOUND")
    }

    if (existing.isFinalized || event.status === "closed") {
      throw new AppError(
        "Cannot modify badge activity on a closed event.",
        400,
        "ATTENDANCE_ALREADY_FINALIZED"
      )
    }

    let badgeBonusPoints = 0
    let badgeActivity = null
    if (badgeActivityId) {
      badgeActivity = await eventModels.findBadgeActivityById(badgeActivityId)
      if (!badgeActivity) {
        throw new AppError("Badge activity not found.", 404, "BADGE_ACTIVITY_NOT_FOUND")
      }
      if (badgeActivity.isActive === false) {
        throw new AppError("Badge activity is inactive.", 400, "BADGE_INACTIVE")
      }
      badgeBonusPoints = badgeActivity.bonusPoints
    }

    const updated = await eventModels.updateAttendance(existing.id, {
      badgeActivityId: badgeActivityId || null,
      badgeBonusPoints,
    })

    await invalidateAttendanceMutationCaches()

    auditLogger.log({
      actorId,
      actorRole: "attendance_operator",
      action: "EVENT_UPDATED",
      targetId: existing.id,
      status: "SUCCESS",
      details: { subAction: "BADGE_ACTIVITY_ASSIGNED", eventId, userId, badgeActivityId, badgeBonusPoints },
    })

    return {
      attendance_id: updated.id,
      user_id: updated.userId,
      badge_activity_id: updated.badgeActivityId,
      badge_activity: updated.badgeActivity?.label ?? null,
      badge_bonus_points: updated.badgeBonusPoints,
    }
  },

  async listAttendances(
    eventId: string,
    callerId: string,
    isPrivileged: boolean,
    page = 1,
    limit = 100
  ) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(200, Math.max(1, limit))
    const event = await eventModels.findEventBasic(eventId)
    if (!event) {
      throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
    }

    if (!isPrivileged) {
      const ownAttendance = await eventModels.findExistingAttendance(eventId, callerId)
      if (!ownAttendance) {
        return {
          event_id: eventId,
          total_attended: 0,
          is_finalized: event.status === "closed",
          attendances: [],
          my_attendance: null,
        }
      }

      const user = await eventModels.findUserForAttendance(callerId)
      const mapped = {
        attendance_id: ownAttendance.id,
        user_id: ownAttendance.userId,
        name: user?.profile?.name ?? "Sekkha Member",
        user_number: user?.userNumber ? String(user.userNumber) : "",
        role: user?.role ?? "member",
        school: user?.profile?.school?.name ?? "Umum",
        method: (ownAttendance as any).method ?? "qr",
        points_earned: ownAttendance.pointsEarned,
        is_late: ownAttendance.isLate,
        late_penalty_applied: ownAttendance.latePenaltyApplied,
        badge_activity_id: (ownAttendance as any).badgeActivityId ?? null,
        badge_activity: ownAttendance.badgeActivity?.label ?? null,
        badge_bonus_points: ownAttendance.badgeBonusPoints,
        is_finalized: ownAttendance.isFinalized,
        scanned_at: ownAttendance.scannedAt.toISOString(),
      }

      return {
        event_id: eventId,
        total_attended: 1,
        is_finalized: event.status === "closed",
        attendances: [mapped],
        my_attendance: mapped,
      }
    }

    const totalCount = await eventModels.countEventAttendances(eventId)
    const attendances = await eventModels.findEventAttendances(
      eventId,
      (safePage - 1) * safeLimit,
      safeLimit
    )

    return {
      event_id: eventId,
      total_attended: totalCount,
      is_finalized: event.status === "closed",
      attendances: attendances.map((a) => ({
        attendance_id: a.id,
        user_id: a.userId,
        name: a.user.profile?.name ?? "Sekkha Member",
        user_number: a.user.userNumber ? String(a.user.userNumber) : "",
        role: a.user.role,
        school: a.user.profile?.school?.name ?? "Umum",
        method: a.method,
        points_earned: a.pointsEarned,
        is_late: a.isLate,
        late_penalty_applied: a.latePenaltyApplied,
        badge_activity_id: a.badgeActivityId,
        badge_activity: a.badgeActivity?.label ?? null,
        badge_bonus_points: a.badgeBonusPoints,
        is_finalized: a.isFinalized,
        scanned_at: a.scannedAt.toISOString(),
      })),
    }
  },

  async deleteAttendance(actorId: string, eventId: string, userId: string) {
    const [event, existing] = await Promise.all([
      eventModels.findEventBasic(eventId),
      eventModels.findExistingAttendance(eventId, userId),
    ])
    if (!event) {
      throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
    }
    if (!existing) {
      throw new AppError("Attendance record not found.", 404, "ATTENDANCE_NOT_FOUND")
    }
    if (existing.isFinalized || event.status === "closed") {
      throw new AppError(
        "Attendance cannot be removed on a closed event.",
        400,
        "CANNOT_DELETE_FINALIZED_ATTENDANCE"
      )
    }

    try {
      await eventModels.deleteAttendance(eventId, userId)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Attendance record not found.", 404, "ATTENDANCE_NOT_FOUND")
      }
      throw error
    }

    await invalidateAttendanceMutationCaches()

    auditLogger.log({
      actorId,
      actorRole: "attendance_operator",
      action: "ATTENDANCE_DELETED",
      targetId: userId,
      status: "SUCCESS",
      details: { eventId },
    })

    return { user_id: userId }
  },


  async deleteEvent(actorId: string, actorRole: string, id: string) {
    const current = await eventModels.findEventBasic(id)
    if (!current) {
      throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
    }
    if (current.status === "closed") {
      throw new AppError(
        "Closed events cannot be deleted because points have already been distributed.",
        400,
        "EVENT_CLOSED_IMMUTABLE"
      )
    }

    try {
      await eventModels.deleteEvent(id)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
      }
      throw error
    }
    await invalidateEventMutationCaches()

    auditLogger.log({
      actorId,
      actorRole,
      action: "EVENT_DELETED",
      targetId: id,
      status: "SUCCESS",
    })
    return { success: true }
  },
}
