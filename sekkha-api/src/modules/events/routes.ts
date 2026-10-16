import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { eventControllers } from "./controllers"

export const eventsRouter: Router = Router()

// GET /api/events — List events with role-based visibility filtering
eventsRouter.get("/", requireAuth, eventControllers.listEvents)

// GET /api/events/:id — Detail event with role-based visibility guard
eventsRouter.get("/:id", requireAuth, eventControllers.getEventDetail)

// POST /api/events — Create event (Organizer & Admin)
eventsRouter.post("/", requireAuth, requireRole("organizer", "admin"), eventControllers.createEvent)

// PUT /api/events/:id — Update event (Organizer & Admin)
eventsRouter.put("/:id", requireAuth, requireRole("organizer", "admin"), eventControllers.updateEvent)

// PATCH /api/events/:id/status — Update event lifecycle status
eventsRouter.patch("/:id/status", requireAuth, requireRole("organizer", "admin"), eventControllers.updateStatus)

// POST /api/events/:id/attendances — Record attendance (Organizer, Admin, Activist)
eventsRouter.post(
  "/:id/attendances",
  requireAuth,
  requireRole("organizer", "admin", "activist"),
  eventControllers.recordAttendance
)
eventsRouter.post(
  "/:id/attendance",
  requireAuth,
  requireRole("organizer", "admin", "activist"),
  eventControllers.recordAttendance
)

// GET /api/events/:id/live-attendance — Real-time SSE stream for event check-in
eventsRouter.get(
  "/:id/live-attendance",
  requireAuth,
  requireRole("organizer", "admin", "activist"),
  eventControllers.liveAttendanceStream
)

// GET /api/events/:id/attendances — List attendances for an event
eventsRouter.get(
  "/:id/attendances",
  requireAuth,
  requireRole("organizer", "admin", "activist"),
  eventControllers.listAttendances
)

// DELETE /api/events/:id/attendances/:userId — Delete attendance record
eventsRouter.delete(
  "/:id/attendances/:userId",
  requireAuth,
  requireRole("organizer", "admin"),
  eventControllers.deleteAttendance
)

// DELETE /api/events/:id — Delete event
eventsRouter.delete("/:id", requireAuth, requireRole("organizer", "admin"), eventControllers.deleteEvent)
