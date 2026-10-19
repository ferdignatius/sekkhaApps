import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { eventServices } from "./services"
import { registerSseClient } from "./internal/sse"
import { canRecordAttendance } from "./policy"

export const CreateEventSchema = z.object({
  title: z.string().trim().min(1, "Judul event wajib diisi").max(200, "Judul maksimal 200 karakter"),
  description: z.string().trim().max(2000, "Deskripsi maksimal 2000 karakter").optional(),
  location: z.string().trim().max(200, "Lokasi maksimal 200 karakter").optional(),
  event_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Format tanggal event tidak valid"),
  event_type: z.enum(["rutin", "special"]).optional(),
  event_type_id: z.string().optional(),
  season_id: z.string().optional(),
  tag: z.string().max(50).optional(),
  status: z.enum(["draft", "scheduled", "active", "closed", "cancelled"]).optional(),
  visibility: z.enum(["all", "member", "activist", "organizer"]).optional(),
})

export const UpdateEventSchema = CreateEventSchema.partial()

export const eventControllers = {
  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role || "member"
      const isPrivileged = userRole === "organizer" || userRole === "admin"
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20))

      const result = await eventServices.listEvents(userRole, isPrivileged, page, limit)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async getEventDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const userRole = req.user?.role || "member"
      const isPrivileged = userRole === "organizer" || userRole === "admin"

      const result = await eventServices.getEventDetail(id, userRole, isPrivileged)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateEventSchema.parse(req.body)
      const actorId = req.user!.userId
      const actorRole = req.user!.role
      const result = await eventServices.createEvent(actorId, actorRole, body)
      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  },

  async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const body = UpdateEventSchema.parse(req.body)
      const actorId = req.user!.userId
      const actorRole = req.user!.role
      const result = await eventServices.updateEvent(actorId, actorRole, id, body)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const { status } = z
        .object({
          status: z.enum(["draft", "scheduled", "active", "closed", "cancelled"]),
        })
        .parse(req.body)

      const actorId = req.user!.userId
      const actorRole = req.user!.role
      const result = await eventServices.updateEventStatus(actorId, actorRole, id, status)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async recordAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const callerRole = req.user?.role
      const isPrivileged = canRecordAttendance(callerRole ?? "")

      if (!isPrivileged) {
        res.status(403).json({ error: "Hanya Pengurus, Admin, atau Aktivis yang berhak mencatat presensi." })
        return
      }

      const { user_id, method = "qr", qr_code } = z
        .object({
          user_id: z.string().min(1, "Identifier jemaat (user_id/user_number/username) wajib diisi").optional(),
          method: z.enum(["qr", "manual"]).optional(),
          qr_code: z.string().optional(),
        })
        .parse(req.body)

      const isSelfCheckIn = !user_id?.trim()
      const targetUserId = user_id?.trim() || req.user!.userId
      if (isSelfCheckIn && method === "qr" && !qr_code) {
        res.status(400).json({ error: "QR event wajib dikirim untuk presensi mandiri." })
        return
      }

      const actorId = req.user!.userId
      const result = await eventServices.recordAttendance(actorId, id, targetUserId, method, qr_code, isSelfCheckIn)
      res.status(result.alreadyRecorded ? 200 : 201).json(result.attendance)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  liveAttendanceStream(req: Request, res: Response): void {
    const id = req.params.id as string

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const unregister = registerSseClient(id, res)
    res.write(`data: ${JSON.stringify({ type: "connected", eventId: id })}\n\n`)

    const heartbeat = setInterval(() => {
      try {
        res.write(": keepalive\n\n")
      } catch {
        clearInterval(heartbeat)
      }
    }, 15000)

    req.on("close", () => {
      clearInterval(heartbeat)
      unregister()
    })
  },

  async listAttendances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))
      const result = await eventServices.listAttendances(id, page, limit)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async deleteAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const userId = req.params.userId as string
      const actorId = req.user!.userId
      const result = await eventServices.deleteAttendance(actorId, id, userId)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const actorId = req.user!.userId
      const actorRole = req.user!.role
      const result = await eventServices.deleteEvent(actorId, actorRole, id)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
}
