import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { cached, invalidatePattern, invalidate, CacheKeys } from "../../../lib/cache"
import { requireAuth, requireRole } from "../../../middleware/auth"

export const eventsRouter = Router()

const CreateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  event_date: z.string(),
  event_type: z.enum(["rutin", "special"]),
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
        orderBy: { eventDate: "asc" },
      })
    })

    res.json(events.map(e => ({
      id: e.id,
      title: e.title || "Acara Vihara",
      description: e.description || "",
      location: e.location || "Vihara",
      event_date: e.eventDate
        ? (typeof e.eventDate === "string" ? e.eventDate : new Date(e.eventDate).toISOString())
        : new Date().toISOString(),
      event_type: e.eventType || "kebaktian",
      tag: e.tag || "Umum",
      status: e.status || "published",
      qr_code: e.qrCode ? { code: e.qrCode, expires_at: null } : null,
    })))
  } catch (err) { next(err) }
})

// GET /api/events/:id — detail
eventsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const event = await prisma.event.findUnique({
      where: { id },
    })
    if (!event) { res.status(404).json({ error: "Event tidak ditemukan" }); return }

    res.json({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: typeof event.eventDate === "string" ? event.eventDate : new Date(event.eventDate).toISOString(),
      event_type: event.eventType,
      tag: event.tag,
      status: event.status,
      qr_code: event.qrCode ? { code: event.qrCode, expires_at: null } : null,
    })
  } catch (err) { next(err) }
})

// POST /api/events — create (pengurus/admin)
eventsRouter.post("/", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const body = CreateEventSchema.parse(req.body)
    const qrCode = `EVT-${Date.now().toString(36).toUpperCase()}`
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        location: body.location,
        eventDate: new Date(body.event_date),
        eventType: body.event_type,
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
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.location && { location: body.location }),
        ...(body.event_date && { eventDate: new Date(body.event_date) }),
        ...(body.event_type && { eventType: body.event_type }),
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
        const pointRuleModel = (prisma as any).pointRule
        const ruleCode = event.eventType === "special" ? "attendance_special" : "attendance_rutin"
        const activeRule = await pointRuleModel.findUnique({ where: { code: ruleCode } }).catch(() => null)
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
            amount: att.pointsEarned || defaultPoints,
            type: "attendance",
            description: `Presensi Event: ${event.title}`,
            referenceId: att.id,
          }))

          await prisma.$transaction([
            prisma.pointTransaction.createMany({ data: pointTxData }),
            ...pendingAttendees.map((att) =>
              prisma.user.update({
                where: { id: att.userId },
                data: {
                  points: { increment: att.pointsEarned || defaultPoints },
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

      // Refresh leaderboard snapshots
      const { computeAndCacheLeaderboard } = await import("../../leaderboard/internal/service")
      await computeAndCacheLeaderboard().catch(() => {})
    }

    await invalidatePattern("events:*")
    res.json({ id: event.id, status: event.status })
  } catch (err) { next(err) }
})

// POST /api/events/:id/attendance — record attendance (Staged in DB with strict idempotency)
eventsRouter.post("/:id/attendance", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { method, user_id } = z.object({
      method: z.enum(["qr", "manual"]),
      user_id: z.string().optional(),
    }).parse(req.body)

    // Authorization Guard: Prevent normal users from recording attendance on behalf of others
    if (user_id && user_id !== req.user!.userId) {
      if (req.user!.role !== "pengurus" && req.user!.role !== "admin") {
        res.status(403).json({ error: "Hanya Pengurus atau Admin yang dapat mencatatkan presensi untuk anggota lain." })
        return
      }
    }

    const targetUserId = user_id ?? req.user!.userId

    // Verify event exists and is not closed
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, eventType: true, status: true },
    })

    if (!event) {
      res.status(404).json({ error: "Kegiatan tidak ditemukan." })
      return
    }

    if (event.status === "closed" || event.status === "cancelled") {
      res.status(400).json({ error: "Sesi presensi untuk kegiatan ini telah ditutup." })
      return
    }

    // Verify target user exists in People database
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, role: true, userNumber: true },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Pengguna tidak ditemukan dalam basis data People." })
      return
    }

    // Strict Idempotency Check: Reject duplicate scans
    const existing = await prisma.attendance.findUnique({
      where: { userId_eventId: { userId: targetUserId, eventId: id } },
    })

    if (existing) {
      res.status(409).json({
        error: "DUPLICATE_ATTENDANCE",
        message: `Umat ${targetUser.name} (${targetUser.userNumber || "ID Terdaftar"}) sudah tercatat hadir sebelumnya.`,
        data: {
          id: existing.id,
          user_id: targetUserId,
          name: targetUser.name,
          scanned_at: existing.scannedAt.toISOString(),
        },
      })
      return
    }

    // Dynamically retrieve configured points rule (non-hardcoded)
    const pointRuleModel = (prisma as any).pointRule
    const ruleCode = event.eventType === "special" ? "attendance_special" : "attendance_rutin"
    const activeRule = await pointRuleModel.findUnique({ where: { code: ruleCode } }).catch(() => null)
    const pointsAwarded = activeRule?.points ?? (event.eventType === "special" ? 100 : 50)

    // Persist attendance immediately in DB (Staged — preserved across reloads / navigation)
    const attendance = await prisma.attendance.create({
      data: {
        userId: targetUserId,
        eventId: id,
        method,
        pointsEarned: pointsAwarded,
        scannedAt: new Date(),
      },
    })

    await invalidate(CacheKeys.userAttendances(targetUserId))
    await invalidatePattern("events:*")

    res.status(201).json({
      id: attendance.id,
      user_id: targetUserId,
      name: targetUser.name,
      role: targetUser.role,
      user_number: targetUser.userNumber,
      method: attendance.method,
      points_earned: pointsAwarded,
      scanned_at: attendance.scannedAt.toISOString(),
      status: "staged",
    })
  } catch (err) { next(err) }
})

// GET /api/events/:id/attendances — list attendees
eventsRouter.get("/:id/attendances", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const records = await prisma.attendance.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: { id: true, name: true, role: true, userNumber: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { scannedAt: "desc" },
    })
    res.json(records.map((r: any) => ({
      user_id: r.userId,
      name: r.user.name,
      role: r.user.role,
      user_number: r.user.userNumber,
      email: r.user.email,
      avatar_url: r.user.avatarUrl,
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
    res.json({ success: true, message: "Presensi berhasil dihapus" })
  } catch (err) { next(err) }
})

// DELETE /api/events/:id — delete event
eventsRouter.delete("/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    await prisma.rsvp.deleteMany({ where: { eventId: id } })
    await prisma.attendance.deleteMany({ where: { eventId: id } })
    await prisma.event.delete({ where: { id } })
    await invalidatePattern("events:*")
    await invalidate(CacheKeys.events())
    res.json({ message: "Event berhasil dihapus" })
  } catch (err) { next(err) }
})

