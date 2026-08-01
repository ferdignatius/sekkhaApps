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
})

const UpdateEventSchema = CreateEventSchema.partial()

// GET /api/events — list (cached 60s)
eventsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const events = await cached(CacheKeys.events(), 60, async () => {
      return prisma.event.findMany({
        where: { status: "published" },
        orderBy: { eventDate: "asc" },
        include: { _count: { select: { rsvps: { where: { status: "hadir" } } } } },
      })
    })

    const userId = req.user!.userId
    const myRsvps = await prisma.rsvp.findMany({
      where: { userId, eventId: { in: events.map(e => e.id) } },
    })
    const rsvpMap = Object.fromEntries(myRsvps.map(r => [r.eventId, r.status]))

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
      rsvp_count: e._count?.rsvps ?? 0,
      my_rsvp: rsvpMap[e.id] ?? null,
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
      include: { _count: { select: { rsvps: { where: { status: "hadir" } } } } },
    })
    if (!event) { res.status(404).json({ error: "Event tidak ditemukan" }); return }

    const myRsvp = await prisma.rsvp.findUnique({
      where: { userId_eventId: { userId: req.user!.userId, eventId: event.id } },
    })

    res.json({
      id: event.id, title: event.title, description: event.description, location: event.location,
      event_date: typeof event.eventDate === "string" ? event.eventDate : new Date(event.eventDate).toISOString(), event_type: event.eventType, tag: event.tag,
      status: event.status, rsvp_count: event._count.rsvps, my_rsvp: myRsvp?.status ?? null,
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
      data: { title: body.title, description: body.description, location: body.location,
        eventDate: new Date(body.event_date), eventType: body.event_type, tag: body.tag, qrCode },
    })
    await invalidatePattern("events:*")
    res.status(201).json({ id: event.id, title: event.title, qr_code: { code: qrCode, expires_at: null } })
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
      },
    })
    await invalidatePattern("events:*")
    res.json({ id: event.id, title: event.title })
  } catch (err) { next(err) }
})

// DELETE /api/events/:id (pengurus/admin)
eventsRouter.delete("/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string
    await prisma.event.delete({ where: { id } })
    await invalidatePattern("events:*")
    res.json({ success: true })
  } catch (err) { next(err) }
})

// POST /api/events/:id/rsvp
eventsRouter.post("/:id/rsvp", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { status } = z.object({ status: z.enum(["hadir", "tidak_hadir"]) }).parse(req.body)
    await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: req.user!.userId, eventId: id } },
      update: { status }, create: { userId: req.user!.userId, eventId: id, status },
    })
    await invalidatePattern("events:*")
    res.json({ success: true, status })
  } catch (err) { next(err) }
})

// POST /api/events/:id/attendance — record attendance
eventsRouter.post("/:id/attendance", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { method, user_id } = z.object({
      method: z.enum(["qr", "manual"]),
      user_id: z.string().optional(),
    }).parse(req.body)

    const targetUserId = user_id ?? req.user!.userId

    // Verify target user exists in People database
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, role: true, userNumber: true },
    })

    if (!targetUser) {
      res.status(404).json({ error: "Pengguna tidak ditemukan dalam data People." })
      return
    }

    // Upsert attendance record so duplicate scan/manual entry doesn't crash
    const attendance = await prisma.attendance.upsert({
      where: { userId_eventId: { userId: targetUserId, eventId: id } },
      update: { method, scannedAt: new Date() },
      create: { userId: targetUserId, eventId: id, method },
    })

    // Update DB last_activity_at on User
    await prisma.user.update({
      where: { id: targetUserId },
      data: { lastActivityAt: attendance.scannedAt },
    }).catch(() => {})

    await invalidate(CacheKeys.userAttendances(targetUserId))

    res.status(201).json({
      id: attendance.id,
      user_id: targetUserId,
      name: targetUser.name,
      role: targetUser.role,
      user_number: targetUser.userNumber,
      method: attendance.method,
      scanned_at: attendance.scannedAt.toISOString(),
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
    await invalidate(CacheKeys.events())
    res.json({ message: "Event berhasil dihapus" })
  } catch (err) { next(err) }
})

