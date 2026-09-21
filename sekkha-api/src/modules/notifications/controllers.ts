import type { Request, Response, NextFunction } from "express"
import { notificationServices } from "./services"

export const notificationControllers = {
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 20
      const userId = req.user!.userId
      const result = await notificationServices.listNotifications(userId, page, limit)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const userId = req.user!.userId
      const result = await notificationServices.markAsRead(id, userId)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },
}
