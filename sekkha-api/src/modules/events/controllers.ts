import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { eventServices } from "./services"
import { registerSseClient } from "./internal/sse"
import { canRecordAttendance } from "./policy"

export const CreateEventSchema = z.object({
  title: z
    .string({ required_error: "Nama Acara wajib diisi" })
    .trim()
    .min(3, "Nama Acara minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  description: z.string().trim().max(2000, "Deskripsi maksimal 2000 karakter").optional(),
  location: z.string({ required_error: "Lokasi wajib diisi" }).trim().min(1, "Lokasi wajib diisi").max(200),
  event_date: z
    .string({ required_error: "Tanggal pelaksanaan wajib diisi" })
    .refine((val) => !isNaN(Date.parse(val)), "Format tanggal event tidak valid"),
  event_type: z.string().optional(),
  event_type_id: z.string().optional(),
  season_id: z.string().optional(),
  tag: z.string().max(50).optional(),
  visibility: z.enum(["all", "member", "activist", "organizer"]).optional().default("all"),
  point_reward: z.number().int().min(0).max(100).optional(),
  max_late_minutes: z.number().int().min(0).max(240).optional(),
  late_penalty_points: z.number().int().min(0).max(100).optional(),
})

// Status cannot be updated via regular update form per PRD Section 4
export const UpdateEventSchema = CreateEventSchema.partial()

export const UpdateStatusSchema = z.object({
  status: z.enum(["active", "closed", "cancel", "cancelled", "scheduled"]),
  event_date: z.string().optional(),
})

export const RecordAttendanceSchema = z.object({
  user_number: z.string().optional(),
  user_id: z.string().optional(),
  method: z.enum(["qr", "manual"]).optional().default("qr"),
  qr_code: z.string().optional(),
})

export const AssignBadgeActivitySchema = z.object({
  badge_activity_id: z.string().nullable().optional(),
})

export const eventControllers = {
  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role || "member"
      const isPrivileged = userRole === "organizer" || userRole === "admin"
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))
      const status = req.query.status ? String(req.query.status) : undefined
      const event_type_id = req.query.event_type_id ? String(req.query.event_type_id) : undefined
      const month = req.query.month ? String(req.query.month) : undefined
      const search = typeof req.query.search === "string" ? req.query.search : undefined

      const result = await eventServices.listEvents(userRole, isPrivileged, page, limit, {
        status,
        event_type_id,
        month,
        search,
      })

      res.json({
        status: "success",
        code: 200,
        message: "Events retrieved successfully",
        data: result,
      })
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
      res.json({
        status: "success",
        code: 200,
        message: "Event detail retrieved successfully",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
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

      res.status(201).json({
        status: "success",
        code: 201,
        message: "Event created successfully",
        data: result,
      })
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

      res.json({
        status: "success",
        code: 200,
        message: "Event updated successfully",
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const { status, event_date } = UpdateStatusSchema.parse(req.body)

      const actorId = req.user!.userId
      const actorRole = req.user!.role
      const result = await eventServices.updateEventStatus(actorId, actorRole, id, status, event_date)

      let message = "Event status updated successfully"
      if (result.status === "active") {
        message = "Event started successfully and attendance session is now active"
      } else if (result.status === "closed") {
        message = "Event closed successfully and attendance points distributed"
      } else if (result.status === "scheduled") {
        message = "Event rescheduled successfully"
      } else if (result.status === "cancel") {
        message = "Event cancelled successfully"
      }

      res.json({
        status: "success",
        code: 200,
        message,
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
        return
      }
      next(err)
    }
  },

  async recordAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const callerRole = req.user?.role || ""

      // Role check: Only organizer and admin per PRD AC-EVT-01 & AC-ATT-03
      if (!canRecordAttendance(callerRole)) {
        res.status(403).json({
          status: "error",
          code: 403,
          message: "Hanya Pengurus dan Admin yang berhak mencatat presensi.",
        })
        return
      }

      const { user_number, user_id, method = "qr" } = RecordAttendanceSchema.parse(req.body)
      const targetIdentifier = user_number?.trim() || user_id?.trim()

      if (!targetIdentifier) {
        res.status(400).json({
          status: "error",
          code: 400,
          message: "Nomor anggota atau identifier jemaat wajib diisi.",
        })
        return
      }

      const actorId = req.user!.userId
      const result = await eventServices.recordAttendance(actorId, id, targetIdentifier, method)

      res.status(201).json({
        status: "success",
        code: 201,
        message: "Attendance drafted successfully",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
        return
      }
      next(err)
    }
  },

  async assignBadgeActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const userId = req.params.userId as string
      const { badge_activity_id } = AssignBadgeActivitySchema.parse(req.body)

      const actorId = req.user!.userId
      const result = await eventServices.assignBadgeActivity(actorId, id, userId, badge_activity_id)

      res.json({
        status: "success",
        code: 200,
        message: "Peran pelayanan berhasil diperbarui",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
        return
      }
      next(err)
    }
  },

  async listAttendances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const callerRole = req.user?.role || ""

      // Role check: Only organizer and admin per PRD AC-EVT-02
      if (!canRecordAttendance(callerRole)) {
        res.status(403).json({
          status: "error",
          code: 403,
          message: "Hanya Pengurus dan Admin yang berhak melihat rekap presensi.",
        })
        return
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 100))
      const result = await eventServices.listAttendances(id, page, limit)

      res.json({
        status: "success",
        code: 200,
        message: "Daftar kehadiran berhasil diambil",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
        return
      }
      next(err)
    }
  },


  async deleteAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const userId = req.params.userId as string
      const actorId = req.user!.userId
      const result = await eventServices.deleteAttendance(actorId, id, userId)

      res.json({
        status: "success",
        code: 200,
        message: "Presensi peserta berhasil dibatalkan",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
        return
      }
      next(err)
    }
  },

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const actorId = req.user!.userId
      const actorRole = req.user!.role
      const result = await eventServices.deleteEvent(actorId, actorRole, id)

      res.json({
        status: "success",
        code: 200,
        message: "Event deleted successfully",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "error",
          code: err.statusCode,
          message: err.message,
        })
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
}
