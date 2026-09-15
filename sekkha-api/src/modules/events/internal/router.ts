import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { invalidatePattern, invalidate, CacheKeys } from "../../../lib/cache"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { generateBlindIndex } from "../../../lib/crypto"
import { auditLogger } from "../../../lib/auditLogger"
import { registerSseClient, broadcastAttendanceScan } from "./sse"

export const eventsRouter: Router = Router()

// F-15 Remediation: Add string length bounds to event schemas
const CreateEventSchema = z.object({
  title: z.string().trim().min(1, "Judul event wajib diisi").max(200, "Judul maksimal 200 karakter"),
  description: z.string().trim().max(2000, "Deskripsi maksimal 2000 karakter").optional(),
  location: z.string().trim().min(1, "Lokasi event wajib diisi").max(200, "Lokasi maksimal 200 karakter"),
  event_date: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Format event_date tidak valid, gunakan format tanggal ISO"),
  event_type: z.enum(["rutin", "special"]).optional(),
  event_type_id: z.string().optional(),
  season_id: z.string().optional(),
  tag: z.string().max(50).optional(),
  status: z.enum(["draft", "published", "active", "closed", "cancelled"]).optional(),
  visibility: z.enum(["all", "umat", "aktivis", "pengurus_only"]).optional(),
})

const UpdateEventSchema = CreateEventSchema.partial()

// GET /api/events — list with visibility authorization (F-10) and pagination bounds (F-13)
eventsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const userRole = req.user?.role || "umat"
    const isPrivileged = userRole === "pengurus" || userRole === "admin"
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20))
    const skip = (page - 1) * limit

    let whereClause: any = {}
    if (userRole === "umat") {
      whereClause = {
        status: { in: ["published", "active", "closed"] },
        visibility: { in: ["all", "umat"] },
      }
    } else if (userRole === "aktivis") {
      whereClause = {
        status: { in: ["published", "active", "closed"] },
        visibility: { in: ["all", "umat", "aktivis"] },
      }
    } else {
      // pengurus and admin can see all events
      whereClause = {}
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        type: true,
        season: true,
      },
      orderBy: { eventDate: "asc" },
      skip,
      take: limit,
    })

    const formatted = events.map((e) => ({
      id: e.id,
      title: e.title || "Acara Vihara",
      description: e.description || "",
      location: e.location || "Vihara",
      event_date: e.eventDate
        ? (typeof e.eventDate === "string" ? e.eventDate : new Date(e.eventDate).toISOString())
        : new Date().toISOString(),
      event_type: e.type?.code || e.eventType || "rutin",
      event_type_id: e.eventTypeId,
      season_id: e.seasonId,
      tag: e.tag || "Umum",
      status: e.status || "published",
      visibility: e.visibility,
      qr_code: isPrivileged && e.qrCode ? { code: e.qrCode, expires_at: null } : null,
    }))

    res.json(formatted)
  } catch (err) { next(err) }
})

// GET /api/events/:id — detail with role-aware visibility guard (F-10)
eventsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const userRole = req.user?.role || "umat"
    const isPrivileged = userRole === "pengurus" || userRole === "admin"

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        type: true,
        season: true,
      },
    })
    if (!event) { res.status(404).json({ error: "Event tidak ditemukan" }); return }

    if (!isPrivileged) {
      if (event.status === "draft" || event.status === "cancelled") {
        res.status(403).json({ error: "Event tidak dapat diakses." })
        return
      }
      if (event.visibility === "pengurus_only") {
        res.status(403).json({ error: "Event ini hanya untuk Pengurus." })
        return
      }
      if (event.visibility === "aktivis" && userRole === "umat") {
        res.status(403).json({ error: "Event ini khusus untuk Aktivis dan Pengurus." })
        return
      }
    }

    res.json({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: typeof event.eventDate === "string" ? event.eventDate : new Date(event.eventDate).toISOString(),
      event_type: event.type?.code || event.eventType,
      event_type_id: event.eventTypeId,
      season_id: event.seasonId,
      tag: event.tag,
      status: event.status,
      visibility: event.visibility,
      qr_code: isPrivileged && event.qrCode ? { code: event.qrCode, expires_at: null } : null,
    })
  } catch (err) { next(err) }
})

// POST /api/events — create (pengurus/admin)
eventsRouter.post("/", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const body = CreateEventSchema.parse(req.body)
    const qrCode = `EVT-${Date.now().toString(36).toUpperCase()}`

    let eventTypeId = body.event_type_id
    if (!eventTypeId && body.event_type) {
      const et = await prisma.eventType.findUnique({ where: { code: body.event_type } })
      eventTypeId = et?.id
    }

    let seasonId = body.season_id
    if (!seasonId) {
      const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
      seasonId = activeSeason?.id
    }

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        location: body.location,
        eventDate: new Date(body.event_date),
        eventType: body.event_type || "rutin",
        eventTypeId: eventTypeId || null,
        seasonId: seasonId || null,
        tag: body.tag,
        status: body.status ?? "published",
        visibility: body.visibility ?? "all",
        qrCode,
      },
    })
    await invalidatePattern("events:*")

    auditLogger.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "EVENT_CREATED",
      targetId: event.id,
      status: "SUCCESS",
      details: { title: event.title, visibility: event.visibility },
    })

    res.status(201).json({
      id: event.id,
      title: event.title,
      status: event.status,
      visibility: event.visibility,
      qr_code: { code: qrCode, expires_at: null },
    })
  } catch (err) { next(err) }
})

// PUT /api/events/:id — update (pengurus/admin)
eventsRouter.put("/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const body = UpdateEventSchema.parse(req.body)

    let eventTypeId = body.event_type_id
    if (!eventTypeId && body.event_type) {
      const et = await prisma.eventType.findUnique({ where: { code: body.event_type } })
      eventTypeId = et?.id
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.location && { location: body.location }),
        ...(body.event_date && { eventDate: new Date(body.event_date) }),
        ...(body.event_type && { eventType: body.event_type }),
        ...(eventTypeId && { eventTypeId }),
        ...(body.season_id && { seasonId: body.season_id }),
        ...(body.tag !== undefined && { tag: body.tag }),
        ...(body.status && { status: body.status }),
        ...(body.visibility && { visibility: body.visibility }),
      },
    })
    await invalidatePattern("events:*")
    res.json({ id: event.id, title: event.title, status: event.status, visibility: event.visibility })
  } catch (err) { next(err) }
})

// PATCH /api/events/:id/status — update event lifecycle status with idempotent point award transaction (F-14)
eventsRouter.patch("/:id/status", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { status } = z.object({
      status: z.enum(["draft", "published", "active", "closed", "cancelled"]),
    }).parse(req.body)

    // Execute status transition and point crediting in an atomic database transaction
    const event = await prisma.$transaction(async (tx) => {
      const currentEvent = await tx.event.findUnique({ where: { id } })
      if (!currentEvent) {
        const err = new Error("Event tidak ditemukan") as Error & { status: number }
        err.status = 404
        throw err
      }

      // If already closed and requesting closed again, return idempotently without duplicate points
      if (currentEvent.status === "closed" && status === "closed") {
        return currentEvent
      }

      const updated = await tx.event.update({
        where: { id },
        data: { status },
      })

      // When closing event, credit points to attendees idempotently
      if (status === "closed") {
        const attendees = await tx.attendance.findMany({ where: { eventId: id } })
        if (attendees.length > 0) {
          const ruleCode = currentEvent.eventType === "special" ? "attendance_special" : "attendance_rutin"
          const activeRule = await tx.pointRule.findUnique({ where: { code: ruleCode } }).catch(() => null)
          const defaultPoints = activeRule?.points ?? (currentEvent.eventType === "special" ? 100 : 50)

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

            for (const att of pendingAttendees) {
              await tx.userStats.upsert({
                where: { userId: att.userId },
                update: {
                  points: { increment: att.pointsEarned || defaultPoints },
                  totalAttendances: { increment: 1 },
                  consecutiveMissed: 0,
                  lastActivityAt: att.scannedAt,
                },
                create: {
                  userId: att.userId,
                  points: att.pointsEarned || defaultPoints,
                  totalAttendances: 1,
                  consecutiveMissed: 0,
                  lastActivityAt: att.scannedAt,
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
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "EVENT_STATUS_CHANGED",
      targetId: event.id,
      status: "SUCCESS",
      details: { status: event.status },
    })

    res.json({ id: event.id, title: event.title, status: event.status })
  } catch (err) { next(err) }
})

// Handler for recording attendance — F-06: Restricted to authorized organizers
async function handleRecordAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string
    const callerRole = req.user?.role
    const isPrivileged = callerRole === "pengurus" || callerRole === "admin" || callerRole === "aktivis"

    if (!isPrivileged) {
      res.status(403).json({ error: "Hanya Pengurus, Admin, atau Aktivis yang berhak mencatat presensi." })
      return
    }

    const { user_id, method = "qr" } = z.object({
      user_id: z.string().min(1, "Identifier jemaat (user_id/user_number/username) wajib diisi"),
      method: z.enum(["qr", "manual"]).optional(),
      qr_code: z.string().optional(),
    }).parse(req.body)

    const targetUserId = user_id.trim()

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, eventType: true, status: true, qrCode: true },
    })

    if (!event) {
      res.status(404).json({ error: "Event tidak ditemukan." })
      return
    }

    // Attendance is ONLY permitted when event status is 'active'
    if (event.status !== "active") {
      res.status(400).json({ error: "Presensi hanya dapat dilakukan saat event berstatus aktif (active)." })
      return
    }

    const bindex = generateBlindIndex(targetUserId.toLowerCase())
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetUserId },
          { userNumber: targetUserId },
          { username: targetUserId },
          ...(bindex ? [{ emailBindex: bindex }] : []),
        ],
      },
      select: {
        id: true,
        role: true,
        userNumber: true,
        profile: { select: { name: true } },
      },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Jemaat dengan identitas tersebut tidak ditemukan." })
      return
    }

    const actualUserId = targetUser.id
    const userName = targetUser.profile?.name || "Anggota"

    const existing = await prisma.attendance.findUnique({
      where: { userId_eventId: { userId: actualUserId, eventId: id } },
    })

    if (existing) {
      res.status(409).json({
        error: "DUPLICATE_ATTENDANCE",
        message: `Member ${userName} (${targetUser.userNumber || "ID Terdaftar"}) sudah tercatat hadir.`,
        data: {
          id: existing.id,
          user_id: actualUserId,
          name: userName,
          scanned_at: existing.scannedAt.toISOString(),
        },
      })
      return
    }

    const ruleCode = event.eventType === "special" ? "attendance_special" : "attendance_rutin"
    const activeRule = await prisma.pointRule.findUnique({ where: { code: ruleCode } }).catch(() => null)
    const pointsAwarded = activeRule?.points ?? (event.eventType === "special" ? 100 : 50)

    const attendance = await prisma.attendance.create({
      data: {
        userId: actualUserId,
        eventId: id,
        method: method === "manual" ? "manual" : "qr",
        pointsEarned: pointsAwarded,
        scannedAt: new Date(),
      },
    })

    await invalidate(CacheKeys.userAttendances(actualUserId))
    await invalidatePattern("events:*")

    auditLogger.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "ATTENDANCE_RECORDED",
      targetId: actualUserId,
      status: "SUCCESS",
      details: { eventId: id, method },
    })

    // FE-10 Remediation: Broadcast real-time scan event to connected organizer devices
    broadcastAttendanceScan({
      eventId: id,
      attendanceId: attendance.id,
      userId: actualUserId,
      name: userName,
      userNumber: targetUser.userNumber || "",
      pointsEarned: pointsAwarded,
      method: attendance.method,
      scannedAt: attendance.scannedAt.toISOString(),
    })

    res.status(201).json({
      id: attendance.id,
      user_id: actualUserId,
      name: userName,
      role: targetUser.role,
      user_number: targetUser.userNumber,
      method: attendance.method,
      points_earned: pointsAwarded,
      scanned_at: attendance.scannedAt.toISOString(),
      status: "staged",
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/events/:id/attendances — F-06: scan / record attendance restricted to organizers
eventsRouter.post("/:id/attendances", requireAuth, requireRole("pengurus", "admin", "aktivis"), handleRecordAttendance)
eventsRouter.post("/:id/attendance", requireAuth, requireRole("pengurus", "admin", "aktivis"), handleRecordAttendance)

// GET /api/events/:id/live-attendance — FE-10: SSE stream for real-time attendance scan events
eventsRouter.get("/:id/live-attendance", requireAuth, requireRole("pengurus", "admin", "aktivis"), (req, res) => {
  const eventId = req.params.id as string

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders?.()

  res.write(`data: ${JSON.stringify({ type: "CONNECTED", eventId })}\n\n`)

  const unregister = registerSseClient(eventId, res)

  req.on("close", () => {
    unregister()
  })
})

// GET /api/events/:id/attendances — F-07: list attendees restricted to organizers with pagination
eventsRouter.get("/:id/attendances", requireAuth, requireRole("pengurus", "admin", "aktivis"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const skip = (page - 1) * limit

    const records = await prisma.attendance.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            userNumber: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      skip,
      take: limit,
    })

    res.json(records.map((r) => ({
      user_id: r.userId,
      name: r.user.profile?.name || "Anggota",
      role: r.user.role,
      user_number: r.user.userNumber,
      avatar_url: r.user.profile?.avatarUrl || null,
      method: r.method,
      scanned_at: r.scannedAt.toISOString(),
    })))
  } catch (err) { next(err) }
})

// DELETE /api/events/:id/attendances/:userId — remove attendee record (pengurus/admin)
eventsRouter.delete("/:id/attendances/:userId", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const { id, userId } = req.params
    await prisma.attendance.delete({
      where: { userId_eventId: { userId: userId as string, eventId: id as string } },
    })
    await invalidate(CacheKeys.userAttendances(userId as string))

    auditLogger.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "ATTENDANCE_DELETED",
      targetId: userId as string,
      status: "SUCCESS",
      details: { eventId: id },
    })

    res.json({ success: true, message: "Catatan presensi berhasil dihapus" })
  } catch (err) { next(err) }
})

// DELETE /api/events/:id — delete event
eventsRouter.delete("/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    await prisma.attendance.deleteMany({ where: { eventId: id } })
    await prisma.event.delete({ where: { id } })
    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())

    auditLogger.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "EVENT_DELETED",
      targetId: id,
      status: "SUCCESS",
    })

    res.json({ message: "Event berhasil dihapus" })
  } catch (err) { next(err) }
})
