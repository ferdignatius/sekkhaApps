import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { eventControllers } from "./controllers"

export const eventsRouter: Router = Router()

// GET /api/events — List events with role-based visibility filtering
eventsRouter.get("/", requireAuth, eventControllers.listEvents)

// GET /api/events/:id — Detail event with role-based visibility guard
eventsRouter.get("/:id", requireAuth, eventControllers.getEventDetail)

// POST /api/events — Create event (Organizer & Admin only)
eventsRouter.post("/", requireAuth, requireRole("organizer", "admin"), eventControllers.createEvent)

// PUT /api/events/:id — Update event general data (Organizer & Admin only)
eventsRouter.put("/:id", requireAuth, requireRole("organizer", "admin"), eventControllers.updateEvent)

// PATCH /api/events/:id/status — Update event lifecycle status via Action Buttons (Organizer & Admin only)
eventsRouter.patch("/:id/status", requireAuth, requireRole("organizer", "admin"), eventControllers.updateStatus)

// POST /api/events/:id/attendances — Record attendance (Organizer & Admin only per PRD AC-EVT-01 & AC-ATT-03)
eventsRouter.post(
  "/:id/attendances",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.recordAttendance
)
eventsRouter.post(
  "/:id/attendance",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.recordAttendance
)

// GET /api/events/:id/attendances — List attendances summary (Organizer & Admin only per PRD AC-EVT-02)
eventsRouter.get(
  "/:id/attendances",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.listAttendances
)


// PATCH /api/events/:id/attendances/:userId/badge-activity — Assign service role to attendee (Organizer & Admin only)
eventsRouter.patch(
  "/:id/attendances/:userId/badge-activity",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.assignBadgeActivity
)

// DELETE /api/events/:id/attendances/:userId — Delete draft attendance record (Organizer & Admin only)
eventsRouter.delete(
  "/:id/attendances/:userId",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.deleteAttendance
)

// DELETE /api/events/:id — Delete event (Organizer & Admin only)
eventsRouter.delete("/:id", requireAuth, requireRole("organizer", "admin"), eventControllers.deleteEvent)

// GET /api/events/:id/live-attendance — Real-time SSE stream for event check-in
eventsRouter.get(
  "/:id/live-attendance",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.liveAttendanceStream
)
