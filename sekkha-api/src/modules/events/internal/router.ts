import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { cached, invalidatePattern, invalidate, CacheKeys } from "../../../lib/cache"
import { requireAuth, requireRole } from "../../../middleware/auth"

export const eventsRouter: Router = Router()

const CreateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  event_date: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Format event_date tidak valid, gunakan format tanggal ISO"),
  event_type: z.enum(["rutin", "special"]).optional(),
  event_type_id: z.string().optional(),
  season_id: z.string().optional(),
  tag: z.string().optional(),
  status: z.enum(["draft", "published", "active", "closed", "cancelled"]).optional(),
})

const UpdateEventSchema = CreateEventSchema.partial()

// GET /api/events — list (cached 60s)
eventsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const events = await cached(CacheKeys.events(), 60, async () => {
      return prisma.event.findMany({
        where: { status: { in: ["published", "active", "closed"] } },
        include: {
          type: true,
          season: true,
        },
        orderBy: { eventDate: "asc" },
      })
    })

    const isPrivileged = req.user?.role === "pengurus" || req.user?.role === "admin"
    res.json(events.map(e => ({
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
      qr_code: isPrivileged && e.qrCode ? { code: e.qrCode, expires_at: null } : null,
    })))
  } catch (err) { next(err) }
})

// GET /api/events/:id — detail
eventsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        type: true,
        season: true,
      },
    })
    if (!event) { res.status(404).json({ error: "Event not found" }); return }

    const isPrivileged = req.user?.role === "pengurus" || req.user?.role === "admin"
    if (!isPrivileged && (event.status === "draft" || event.status === "cancelled")) {
      res.status(403).json({ error: "Access denied. Event is not publicly accessible." })
      return
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
        qrCode,
      },
    })
    await invalidatePattern("events:*")
    res.status(201).json({ id: event.id, title: event.title, status: event.status, qr_code: { code: qrCode, expires_at: null } })
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
      },
    })
    await invalidatePattern("events:*")
    res.json({ id: event.id, title: event.title, status: event.status })
  } catch (err) { next(err) }
})

// PATCH /api/events/:id/status — update event lifecycle status (pengurus/admin)
eventsRouter.patch("/:id/status", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { status } = z.object({
      status: z.enum(["draft", "published", "active", "closed", "cancelled"]),
    }).parse(req.body)

    const event = await prisma.event.update({
      where: { id },
      data: { status },
    })

    // When closing the event, finalize all attendances and credit points to attendees in batch
    if (status === "closed") {
      const attendees = await prisma.attendance.findMany({
        where: { eventId: id },
      })

      if (attendees.length > 0) {
        const ruleCode = event.eventType === "special" ? "attendance_special" : "attendance_rutin"
        const activeRule = await prisma.pointRule.findUnique({ where: { code: ruleCode } }).catch(() => null)
        const defaultPoints = activeRule?.points ?? (event.eventType === "special" ? 100 : 50)

        const existingTxs = await prisma.pointTransaction.findMany({
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
            description: `Presensi Event: ${event.title}`,
            referenceId: att.id,
          }))

          await prisma.$transaction([
            prisma.pointTransaction.createMany({ data: pointTxData }),
            ...pendingAttendees.map((att) =>
              prisma.userStats.upsert({
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
            ),
          ])

          await Promise.all(
            pendingAttendees.map((att) =>
              Promise.all([
                invalidate(CacheKeys.userAttendances(att.userId)),
                invalidate(CacheKeys.userProfile(att.userId)),
              ])
            )
          )
        }
      }
    }

    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())
    res.json({ id: event.id, title: event.title, status: event.status })
  } catch (err) { next(err) }
})

// Handler for recording attendance with QR and Active status validation
async function handleRecordAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string
    const isPrivileged = req.user?.role === "pengurus" || req.user?.role === "admin"
    const { user_id, method = "qr", qr_code } = z.object({
      user_id: z.string().optional(),
      method: z.enum(["qr", "manual"]).optional(),
      qr_code: z.string().optional(),
    }).parse(req.body)

    if (user_id && user_id !== req.user!.userId) {
      if (!isPrivileged) {
        res.status(403).json({ error: "Hanya Pengurus atau Admin yang dapat mencatat presensi anggota lain." })
        return
      }
    }

    const targetUserId = user_id ?? req.user!.userId

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

    // Method and QR verification
    if (method === "qr") {
      const submittedCode = (qr_code || (req.body as any).qrCode || "").trim().toUpperCase()
      const expectedCode = (event.qrCode || "").trim().toUpperCase()
      if (!isPrivileged) {
        if (!submittedCode || submittedCode !== expectedCode) {
          res.status(400).json({ error: "Kode QR presensi tidak valid atau tidak cocok dengan event ini." })
          return
        }
      }
    } else if (method === "manual") {
      if (!isPrivileged) {
        res.status(403).json({ error: "Presensi manual hanya dapat dicatat oleh Pengurus atau Admin." })
        return
      }
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetUserId },
          { userNumber: targetUserId },
          { username: targetUserId },
          { email: targetUserId },
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
      res.status(404).json({ error: "User tidak ditemukan di direktori jemaat." })
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

// POST /api/events/:id/attendances — scan / record attendance
eventsRouter.post("/:id/attendances", requireAuth, handleRecordAttendance)
eventsRouter.post("/:id/attendance", requireAuth, handleRecordAttendance)

// GET /api/events/:id/attendances — list attendees (redacted PII)
eventsRouter.get("/:id/attendances", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
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
    res.json({ success: true, message: "Attendance record deleted" })
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
    res.json({ message: "Event deleted successfully" })
  } catch (err) { next(err) }
})
