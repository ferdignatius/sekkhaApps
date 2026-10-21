import type { NextFunction, Request, Response } from "express"
import { homeServices } from "./services"

export const homeControllers = {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await homeServices.getDashboard(req.user!.userId, req.user!.role)
      if (!dashboard) {
        res.status(404).json({ error: "User not found" })
        return
      }
      res.json(dashboard)
    } catch (error) {
      next(error)
    }
  },
}
