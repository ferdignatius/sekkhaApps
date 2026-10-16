import { eventModels } from "./models"
import { prisma } from "../../lib/prisma"
import { invalidatePattern, invalidate, CacheKeys } from "../../lib/cache"
import { auditLogger } from "../../lib/auditLogger"
import { broadcastAttendanceScan } from "./internal/sse"
import crypto from "crypto"
import { Prisma } from "@prisma/client"
import { AppError } from "../../lib/AppError"
import type { Prisma as PrismaTypes } from "@prisma/client"
import { canViewEvent } from "./policy"

type CreateEventInput = {
  title: string
  description?: string
  location?: string
  event_date: string
  event_type?: "rutin" | "special"
  event_type_id?: string
  season_id?: string
  tag?: string
  status?: "draft" | "scheduled" | "active" | "closed" | "cancelled"
  visibility?: "all" | "member" | "activist" | "organizer"
}
type UpdateEventInput = Partial<CreateEventInput>

export const eventServices = {
  async listEvents(userRole: string, isPrivileged: boolean, page = 1, limit = 20) {
    const validPage = Math.max(1, page)
    const validLimit = Math.min(50, Math.max(1, limit))
    const skip = (validPage - 1) * validLimit

    let whereClause: PrismaTypes.EventWhereInput = {}
    if (userRole === "member") {
      whereClause = {
        status: { in: ["scheduled", "active", "closed"] },
        visibility: { in: ["all", "member"] },
      }
    } else if (userRole === "activist") {
      whereClause = {
        status: { in: ["scheduled", "active", "closed"] },
        visibility: { in: ["all", "member", "activist"] },
      }
    } else {
      whereClause = {}
    }

    const events = await eventModels.findEvents(whereClause, skip, validLimit)
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      event_date: typeof e.eventDate === "string" ? e.eventDate : new Date(e.eventDate).toISOString(),
      event_type: e.type?.code || "rutin",
      event_type_id: e.eventTypeId,
      season_id: e.seasonId,
      tag: e.tag || "Umum",
      status: e.status || "scheduled",
      visibility: e.visibility,
      qr_code: isPrivileged && e.qrCode ? { code: e.qrCode, expires_at: null } : null,
    }))
  },

  async getEventDetail(id: string, userRole: string, isPrivileged: boolean) {
    const event = await eventModels.findEventById(id)
    if (!event) {
      throw new AppError("Event tidak ditemukan", 404, "EVENT_NOT_FOUND")
    }

    if (!canViewEvent(userRole, event.status, event.visibility)) {
      throw new AppError("Event tidak dapat diakses.", 403, "EVENT_FORBIDDEN")
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: typeof event.eventDate === "string" ? event.eventDate : new Date(event.eventDate).toISOString(),
      event_type: event.type?.code || "rutin",
      event_type_id: event.eventTypeId,
      season_id: event.seasonId,
      tag: event.tag || "Umum",
      status: event.status,
      visibility: event.visibility,
      qr_code: isPrivileged && event.qrCode ? { code: event.qrCode, expires_at: null } : null,
      created_at: event.createdAt,
    }
  },

  async createEvent(actorId: string, actorRole: string, body: CreateEventInput) {
    let eventTypeId = body.event_type_id
    if (!eventTypeId && body.event_type) {
      const typeByCode = await prisma.eventType.findUnique({ where: { code: body.event_type } })
      if (typeByCode) eventTypeId = typeByCode.id
    }
    if (!eventTypeId) {
      const defaultType = await eventModels.findDefaultEventType()
      eventTypeId = defaultType?.id
    }

    let seasonId = body.season_id
    if (!seasonId) {
      const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
      seasonId = activeSeason?.id
    }

    const qrCode = crypto.randomBytes(32).toString("base64url")

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        location: body.location ?? "",
        eventDate: new Date(body.event_date),
        eventTypeId: eventTypeId || null,
        seasonId: seasonId || null,
        tag: body.tag,
        status: body.status ?? "scheduled",
        visibility: body.visibility ?? "all",
        qrCode,
      },
      include: { type: true },
    })

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())

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
      qr_code: { code: qrCode, expires_at: null },
    }
  },

  async updateEvent(actorId: string, actorRole: string, id: string, body: UpdateEventInput) {
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.event_date && { eventDate: new Date(body.event_date) }),
        ...(body.tag !== undefined && { tag: body.tag }),
        ...(body.visibility && { visibility: body.visibility }),
        ...(body.event_type_id !== undefined && { eventTypeId: body.event_type_id }),
        ...(body.season_id !== undefined && { seasonId: body.season_id }),
      },
      include: { type: true },
    })

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())

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

  async updateEventStatus(actorId: string, actorRole: string, id: string, status: string) {
    const event = await prisma.$transaction(async (tx) => {
      const currentEvent = await tx.event.findUnique({ where: { id }, include: { type: true } })
      if (!currentEvent) {
        const err = new Error("Event tidak ditemukan") as any
        err.statusCode = 404
        throw err
      }

      if (currentEvent.status === "closed" && status === "closed") {
        return currentEvent
      }

      const updated = await tx.event.update({
        where: { id },
        data: { status: status as any },
      })

      if (status === "closed") {
        const attendees = await tx.attendance.findMany({ where: { eventId: id } })
        if (attendees.length > 0) {
          const typeCode = currentEvent.type?.code || "rutin"
          const ruleCode = typeCode === "special" ? "attendance_special" : "attendance_rutin"
          const activeRule = await tx.pointRule.findUnique({ where: { code: ruleCode } }).catch(() => null)
          const defaultPoints = activeRule?.points ?? (typeCode === "special" ? 100 : 50)

          const existingTxs = await tx.pointTransaction.findMany({
            where: { referenceId: { in: attendees.map((a) => a.id) } },
            select: { referenceId: true },
          })
          const processedAttIds = new Set(existingTxs.map((t) => t.referenceId))
            const pendingAttendees = attendees.filter((a) => !processedAttIds.has(a.id))

            if (pendingAttendees.length > 0) {
            const pointTxData = pendingAttendees.map((att) => ({
              userId: att.userId,
              ruleId: activeRule?.id || null,
              amount: att.pointsEarned || defaultPoints,
              type: "attendance" as const,
              description: `Presensi Event: ${currentEvent.title}`,
              referenceId: att.id,
            }))

              await tx.pointTransaction.createMany({ data: pointTxData, skipDuplicates: true })

            const statsByUser = new Map<string, { points: number; count: number; scannedAt: Date }>()
            for (const att of pendingAttendees) {
              const current = statsByUser.get(att.userId)
              const points = att.pointsEarned || defaultPoints
              if (current) {
                current.points += points
                current.count += 1
                if (att.scannedAt > current.scannedAt) current.scannedAt = att.scannedAt
              } else {
                statsByUser.set(att.userId, { points, count: 1, scannedAt: att.scannedAt })
              }
            }

            for (const [userId, stats] of statsByUser) {
              await tx.userStats.upsert({
                where: { userId },
                update: {
                  points: { increment: stats.points },
                  totalAttendances: { increment: stats.count },
                  consecutiveMissed: 0,
                  lastActivityAt: stats.scannedAt,
                },
                create: {
                  userId,
                  points: stats.points,
                  totalAttendances: stats.count,
                  consecutiveMissed: 0,
                  lastActivityAt: stats.scannedAt,
                },
              })
            }
          }
        }
      }

      return updated
    })

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())

    auditLogger.log({
      actorId,
      actorRole,
      action: "EVENT_STATUS_CHANGED",
      targetId: event.id,
      status: "SUCCESS",
      details: { status: event.status },
    })

    return { id: event.id, title: event.title, status: event.status }
  },

  async recordAttendance(
    actorId: string,
    eventId: string,
    targetIdentifier: string,
    method: "qr" | "manual" = "qr",
    qrCodeParam?: string
  ) {
    const event = await eventModels.findEventBasic(eventId)
    if (!event) {
      const error = new Error("Event tidak ditemukan.") as any
      error.statusCode = 404
      throw error
    }

    if (event.status !== "active") {
      const error = new Error(
        `Presensi tidak dapat dilakukan karena status event saat ini "${event.status}". Presensi hanya dibuka saat event berstatus "active".`
      ) as any
      error.statusCode = 400
      throw error
    }

    if (method === "qr" && (!qrCodeParam || !event.qrCode || qrCodeParam !== event.qrCode)) {
      const error = new Error("Kode QR tidak valid atau tidak cocok dengan event ini.") as any
      error.statusCode = 400
      throw error
    }

    const user = await eventModels.findUserForAttendance(targetIdentifier)
    if (!user) {
      const error = new Error(`Umat dengan ID/nomor "${targetIdentifier}" tidak ditemukan.`) as any
      error.statusCode = 404
      throw error
    }

    const existing = await eventModels.findExistingAttendance(eventId, user.id)
    if (existing) {
      return {
        alreadyRecorded: true,
        attendance: {
          id: existing.id,
          event_id: eventId,
          user_id: user.id,
          user_number: user.userNumber,
          name: user.profile?.name ?? "Anggota Sekkha",
          role: user.role,
          points_earned: existing.pointsEarned,
          scanned_at: existing.scannedAt.toISOString(),
          message: "Umat ini sudah tercatat presensinya sebelumnya.",
        },
      }
    }

    const typeCode = event.type?.code || "rutin"
    const pointsEarned = typeCode === "special" ? 100 : 50

    let attendance
    try {
      attendance = await eventModels.createAttendance({
        userId: user.id,
        eventId,
        method,
        pointsEarned,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await eventModels.findExistingAttendance(eventId, user.id)
        if (duplicate) {
          return {
            alreadyRecorded: true,
            attendance: {
              id: duplicate.id,
              event_id: eventId,
              user_id: user.id,
              user_number: user.userNumber,
              name: user.profile?.name ?? "Anggota Sekkha",
              role: user.role,
              points_earned: duplicate.pointsEarned,
              scanned_at: duplicate.scannedAt.toISOString(),
              message: "Umat ini sudah tercatat presensinya sebelumnya.",
            },
          }
        }
      }
      throw error
    }

    const attendeeName = user.profile?.name ?? "Anggota Sekkha"

    auditLogger.log({
      actorId,
      actorRole: "attendance_operator",
      action: "ATTENDANCE_RECORDED",
      targetId: attendance.id,
      status: "SUCCESS",
      details: { eventId, userId: user.id, method },
    })

    broadcastAttendanceScan({
      eventId,
      attendanceId: attendance.id,
      userId: user.id,
      name: attendeeName,
      userNumber: user.userNumber ?? "",
      pointsEarned,
      method,
      scannedAt: attendance.scannedAt.toISOString(),
    })

    return {
      alreadyRecorded: false,
      attendance: {
        id: attendance.id,
        event_id: eventId,
        user_id: user.id,
        user_number: user.userNumber,
        name: attendeeName,
        role: user.role,
        points_earned: pointsEarned,
        scanned_at: attendance.scannedAt.toISOString(),
      },
    }
  },

  async listAttendances(eventId: string, page = 1, limit = 50) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const attendances = await eventModels.findEventAttendances(eventId, (safePage - 1) * safeLimit, safeLimit)
    return attendances.map((a) => ({
      id: a.id,
      user_id: a.userId,
      user_number: a.user.userNumber,
      name: a.user.profile?.name ?? "Anggota Sekkha",
      method: a.method,
      points_earned: a.pointsEarned,
      scanned_at: a.scannedAt.toISOString(),
    }))
  },

  async deleteAttendance(actorId: string, eventId: string, userId: string) {
    try {
      await eventModels.deleteAttendance(eventId, userId)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Presensi tidak ditemukan.", 404, "ATTENDANCE_NOT_FOUND")
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
    return { success: true }
  },

  async deleteEvent(actorId: string, actorRole: string, id: string) {
    try {
      await eventModels.deleteEvent(id)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Event tidak ditemukan.", 404, "EVENT_NOT_FOUND")
      }
      throw error
    }
    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())

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
