import { eventModels } from "./models"
import { prisma } from "../../lib/prisma"
import { invalidatePattern, invalidate, CacheKeys } from "../../lib/cache"
import { auditLogger } from "../../lib/auditLogger"
import crypto from "crypto"
import { Prisma } from "@prisma/client"
import { AppError } from "../../lib/AppError"
import type { Prisma as PrismaTypes } from "@prisma/client"
import { canViewEvent } from "./policy"
import { eventbus, DomainEvents } from "../../core/eventbus"
import { calculateWeeklyStreak, toWeekKey } from "../users/internal/utils"

const VALID_EVENT_STATUSES = ["scheduled", "active", "closed", "cancel"] as const
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const DAILY_POINT_CAP = 150

function toWibDateKey(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)
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

    const events = await eventModels.findEvents(whereClause, skip, validLimit)
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
          }
        : null,
    }))
  },

  async getEventDetail(id: string, userRole: string, isPrivileged: boolean) {
    const event = await eventModels.findEventById(id)
    if (!event) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND")
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
          }
        : null,
      season_id: event.seasonId,
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    }
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
      const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
      seasonId = activeSeason?.id
    }

    const pointReward = body.point_reward ?? eventType.defaultPointReward ?? 50
    const maxLateMinutes = body.max_late_minutes ?? 30
    const latePenaltyPoints = body.late_penalty_points ?? 15

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

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())
    await invalidatePattern("user:*:home:*")

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
          }
        : null,
    }
  },

  async updateEvent(actorId: string, actorRole: string, id: string, body: UpdateEventInput) {
    const current = await eventModels.findEventById(id)
    if (!current) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND")
    }

    if (current.status === "closed") {
      throw new AppError("Closed events cannot be edited.", 400, "CANNOT_EDIT_CLOSED_EVENT")
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

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())
    await invalidatePattern("user:*:home:*")

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

        const scheduledTime = new Date(currentEvent.eventDate).getTime()
        const nowTime = Date.now()

        if (rescheduleDate) {
          const parsedDate = new Date(rescheduleDate)
          if (!isNaN(parsedDate.getTime())) {
            updatedEventDate = parsedDate
          }
        }

        const effectiveEventDate = updatedEventDate ?? new Date(currentEvent.eventDate)
        if (toWibDateKey(new Date(nowTime)) > toWibDateKey(effectiveEventDate)) {
          throw new AppError(
            "Event cannot be activated because its scheduled date has already passed",
            400,
            "EVENT_DATE_PASSED"
          )
        }

        // Allow organizer/admin to start event early.
        // If event is started before scheduled date/time and no explicit date was passed,
        // update eventDate to now so attendance timing and calculations are accurate.
        if (scheduledTime > nowTime && !updatedEventDate) {
          updatedEventDate = new Date()
        }
      }

      // 2. Validation for "scheduled" (Reschedule from cancel)
      if (normalizedTarget === "scheduled") {
        if (currentStatus !== "cancel") {
          throw new AppError("Only cancelled events can be rescheduled.", 400, "INVALID_STATUS_TRANSITION")
        }
        if (!rescheduleDate) {
          throw new AppError("Reschedule date is required.", 400, "RESCHEDULE_DATE_REQUIRED")
        }
        const parsedDate = new Date(rescheduleDate)
        if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now() - 60000) {
          throw new AppError("Rescheduled event date cannot be in the past.", 400, "EVENT_DATE_PAST")
        }
        updatedEventDate = parsedDate
      }

      // 3. Validation for "closed"
      if (normalizedTarget === "closed") {
        if (currentStatus !== "active") {
          throw new AppError("Only active events can be closed and finalized.", 400, "INVALID_STATUS_TRANSITION")
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

            // Fetch active PointRule definitions
            const activeRules = await tx.pointRule.findMany({ where: { isActive: true } })
            const ruleByCode = new Map(activeRules.map((r) => [r.code, r]))
            const attendanceRule = ruleByCode.get("attendance_rutin")
            const firstAttendanceRule = ruleByCode.get("first_attendance_bonus")
            const streakMonthlyRule = ruleByCode.get("streak_monthly_bonus")

            // Enforce 150-point daily cap (pointRules.md)
            const nowDate = new Date()
            const startOfToday = new Date(nowDate)
            startOfToday.setHours(0, 0, 0, 0)
            const endOfToday = new Date(nowDate)
            endOfToday.setHours(23, 59, 59, 999)

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
                stats: { select: { totalAttendances: true } },
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
                ruleId: attendanceRule?.id ?? null,
                amount: clampedAmount,
                type: "attendance" as const,
                description: `Presensi Event: ${currentEvent.title}`,
                referenceId: att.id,
              })

              const current = statsByUser.get(att.userId)
              if (current) {
                current.points += clampedAmount
                current.count += 1
                if (att.scannedAt > current.scannedAt) current.scannedAt = att.scannedAt
              } else {
                const userAtts = attendancesByUser.get(att.userId) ?? [{ scannedAt: att.scannedAt }]
                const { current_streak } = calculateWeeklyStreak(userAtts)
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
            for (const [userId, stats] of statsByUser) {
              bonusCandidateRefs.push(`first_attendance:${userId}`)
              if (stats.currentStreak > 0 && stats.currentStreak % 4 === 0) {
                bonusCandidateRefs.push(`streak_${stats.currentStreak}w:${userId}:${toWeekKey(stats.scannedAt)}`)
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

              // 1) first_attendance_bonus
              if (
                firstAttendanceRule &&
                firstAttendanceRule.points > 0 &&
                userMeta?.isClaimed &&
                (userMeta.stats?.totalAttendances ?? 0) === 0
              ) {
                const firstRef = `first_attendance:${userId}`
                if (!existingBonusRefSet.has(firstRef)) {
                  const alreadyEarned = earnedTodayByUser.get(userId) ?? 0
                  const bonusAmount = Math.min(
                    firstAttendanceRule.points,
                    Math.max(0, DAILY_POINT_CAP - alreadyEarned)
                  )
                  if (bonusAmount > 0) {
                    earnedTodayByUser.set(userId, alreadyEarned + bonusAmount)
                    stats.points += bonusAmount
                    pointTxData.push({
                      userId,
                      ruleId: firstAttendanceRule.id,
                      amount: bonusAmount,
                      type: "system" as const,
                      description: `${firstAttendanceRule.label}: ${currentEvent.title}`,
                      referenceId: firstRef,
                    })
                  }
                }
              }

              // 2) streak_monthly_bonus (every 4 consecutive weeks)
              if (
                streakMonthlyRule &&
                streakMonthlyRule.points > 0 &&
                stats.currentStreak > 0 &&
                stats.currentStreak % 4 === 0
              ) {
                const streakRef = `streak_${stats.currentStreak}w:${userId}:${toWeekKey(stats.scannedAt)}`
                if (!existingBonusRefSet.has(streakRef)) {
                  const alreadyEarned = earnedTodayByUser.get(userId) ?? 0
                  const bonusAmount = Math.min(
                    streakMonthlyRule.points,
                    Math.max(0, DAILY_POINT_CAP - alreadyEarned)
                  )
                  if (bonusAmount > 0) {
                    earnedTodayByUser.set(userId, alreadyEarned + bonusAmount)
                    stats.points += bonusAmount
                    pointTxData.push({
                      userId,
                      ruleId: streakMonthlyRule.id,
                      amount: bonusAmount,
                      type: "system" as const,
                      description: `${streakMonthlyRule.label} (${stats.currentStreak} minggu)`,
                      referenceId: streakRef,
                    })
                  }
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

      return { event: updated, totalAttendees, pointsDistributed }
    })

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())
    await invalidatePattern("user:*:home:*")
    if (normalizedTarget === "closed") {
      await invalidatePattern("user:*:profile")
      await invalidatePattern("pengurus:insight:*")
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

    // Evaluate Late Penalty
    const maxLateMinutes = event.maxLateMinutes ?? 30
    const latePenaltyPoints = event.latePenaltyPoints ?? 15
    const scheduledTime = new Date(event.eventDate).getTime()
    const nowTime = Date.now()
    const isLate = nowTime > scheduledTime + maxLateMinutes * 60 * 1000
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

    await invalidatePattern("user:*:home:*")

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
      badgeBonusPoints = badgeActivity.bonusPoints
    }

    const updated = await eventModels.updateAttendance(existing.id, {
      badgeActivityId: badgeActivityId || null,
      badgeBonusPoints,
    })

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

  async listAttendances(eventId: string, page = 1, limit = 100) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(200, Math.max(1, limit))
    const event = await eventModels.findEventBasic(eventId)
    if (!event) {
      throw new AppError("Event not found.", 404, "EVENT_NOT_FOUND")
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
    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())
    await invalidatePattern("user:*:home:*")

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
