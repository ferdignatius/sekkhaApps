import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { pengurusServices } from "./services"

export const PengurusInsightsQuerySchema = z
  .object({
    periodType: z.enum(["Year", "Quarter", "Month"]).optional(),
    timeUnit: z.enum(["year", "month", "quarter", "Year", "Month", "Quarter"]).optional(),
    primaryYear: z.coerce.number().int().min(2000).max(2100).optional(),
    primaryMonth: z.coerce.number().int().min(1).max(12).optional(),
    isComparisonEnabled: z.union([z.string(), z.boolean()]).optional(),
    compareYear: z.coerce.number().int().min(2000).max(2100).optional(),
    compareMonth: z.coerce.number().int().min(1).max(12).optional(),
    segmentFilter: z.string().max(30).optional(),
    role: z.string().max(30).optional(),
    eventCategoryFilter: z.string().max(100).optional(),
    selectedCategories: z.string().max(200).optional(),
    selectedPeriods: z.string().max(200).optional(),
  })
  .passthrough()

export const pengurusControllers = {
  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = PengurusInsightsQuerySchema.parse(req.query)
      const result = await pengurusServices.getInsights(validatedQuery as any)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
}
