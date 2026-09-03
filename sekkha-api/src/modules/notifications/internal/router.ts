import { Router } from "express"
import { prisma } from "../../../lib/prisma"
import { requireAuth } from "../../../middleware/auth"

export const notificationsRouter: Router = Router()

// GET /api/notifications — List notifications of logged-in user
notificationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    })
    res.json(notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      status: n.status,
      data: n.data,
      created_at: n.createdAt.toISOString(),
    })))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/notifications/:id/read — Mark notification as read
notificationsRouter.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id as string },
    })

    if (!notification) {
      res.status(404).json({ error: "Notification not found" })
      return
    }

    if (notification.userId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" })
      return
    }

    await prisma.notification.update({
      where: { id: req.params.id as string },
      data: { status: "read" },
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
