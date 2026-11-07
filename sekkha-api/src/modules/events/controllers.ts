import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { eventServices } from "./services"
import { canRecordAttendance } from "./policy"

export const CreateEventSchema = z.object({
  title: z
    .string({ required_error: "Event title is required" })
    .trim()
    .min(3, "Event title must be at least 3 characters")
    .max(200, "Event title must not exceed 200 characters"),
  description: z.string().trim().max(2000, "Description must not exceed 2000 characters").optional(),
  location: z.string({ required_error: "Event location is required" }).trim().min(1, "Event location is required").max(200),
  event_date: z
    .string({ required_error: "Event date is required" })
    .refine((val) => !isNaN(Date.parse(val)), "Invalid event date format")
    .refine(
      (val) => new Date(val).getTime() >= Date.now() - 60000,
      "Event date cannot be in the past"
    ),
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
export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.never({ message: "Event status cannot be changed via update form" }).optional(),
})

export const UpdateStatusSchema = z.object({
  status: z.enum(["active", "closed", "cancel", "scheduled"]),
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
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
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
        data: {
          id: result.id,
          status: result.status,
        },
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
      let data: any = {
        id: result.id,
        status: result.status,
      }

      if (result.status === "active") {
        message = "Event started successfully and attendance session is now active"
      } else if (result.status === "closed") {
        message = "Event closed successfully and attendance points distributed"
        data = {
          id: result.id,
          status: result.status,
          total_attendees: result.total_attendees,
          points_distributed: result.points_distributed,
        }
      } else if (result.status === "scheduled") {
        message = "Event rescheduled successfully"
        data = {
          id: result.id,
          status: result.status,
          event_date: result.event_date,
        }
      } else if (result.status === "cancel") {
        message = "Event cancelled successfully"
      }

      res.json({
        status: "success",
        code: 200,
        message,
        data,
      })
    } catch (err: any) {
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
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
          message: "Only organizers and admins are allowed to record attendance.",
        })
        return
      }

      const { user_number, user_id, method = "qr" } = RecordAttendanceSchema.parse(req.body)
      const targetIdentifier = user_number?.trim() || user_id?.trim()

      if (!targetIdentifier) {
        res.status(400).json({
          status: "error",
          code: 400,
          message: "Member number or user identifier is required.",
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
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
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
        message: "Badge activity assigned successfully",
        data: result,
      })
    } catch (err: any) {
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
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
          message: "Only organizers and admins are allowed to view attendance records.",
        })
        return
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 100))
      const result = await eventServices.listAttendances(id, page, limit)

      res.json({
        status: "success",
        code: 200,
        message: "Attendance records retrieved successfully",
        data: result,
      })
    } catch (err: any) {
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
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
        message: "Attendance successfully removed",
        data: result,
      })
    } catch (err: any) {
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
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
      await eventServices.deleteEvent(actorId, actorRole, id)

      res.json({
        status: "success",
        code: 200,
        message: "Event deleted successfully",
      })
    } catch (err: any) {
      const status = err.status || err.statusCode
      if (status) {
        res.status(status).json({
          status: "error",
          code: status,
          message: err.message,
        })
        return
      }
      next(err)
    }
  },
}
