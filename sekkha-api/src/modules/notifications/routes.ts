import { Router } from "express"
import { requireAuth } from "../../middleware/auth"
import { notificationControllers } from "./controllers"

export const notificationsRouter: Router = Router()

// GET /api/notifications — List notifications of logged-in user (F-13: bounded pagination)
notificationsRouter.get("/", requireAuth, notificationControllers.listNotifications)

// PATCH /api/notifications/:id/read — Mark notification as read
notificationsRouter.patch("/:id/read", requireAuth, notificationControllers.markAsRead)
