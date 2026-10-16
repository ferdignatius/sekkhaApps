import type { Request, Response, NextFunction } from "express"
import { pengurusServices } from "./services"

export const pengurusControllers = {
  async getRecencyAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pengurusServices.getRecencyAlerts(req.query as any)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async getUserRecencyAlertDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string
      const result = await pengurusServices.getUserRecencyAlertDetail(userId)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pengurusServices.getInsights(req.query as any)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
}
