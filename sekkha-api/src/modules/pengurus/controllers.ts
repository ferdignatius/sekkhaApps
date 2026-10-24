import type { Request, Response, NextFunction } from "express"
import { pengurusServices } from "./services"

export const pengurusControllers = {
  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pengurusServices.getInsights(req.query as any)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
}
