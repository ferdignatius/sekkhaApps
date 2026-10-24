import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { configureServices } from "./services"


export const EventTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Code must be lowercase kebab-case (e.g. regular-puja)")
    .optional(),
  label: z
    .string({ required_error: "Label is required" })
    .trim()
    .min(1, "Label is required")
    .max(100, "Label cannot exceed 100 characters"),
  color: z
    .string({ required_error: "Color is required" })
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid 6-digit hex code (e.g. #4262FF)"),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  default_point_reward: z
    .number()
    .int("Points must be an integer")
    .min(0, "Points must be non-negative")
    .max(10000, "Points cannot exceed 10,000")
    .optional()
    .default(0),
  is_active: z.boolean().optional().default(true),
})

export const EventTypeUpdateSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Code must be lowercase kebab-case (e.g. regular-puja)")
    .optional(),
  label: z.string().trim().min(1, "Label is required").max(100).optional(),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid 6-digit hex code").optional(),
  description: z.string().trim().max(500).optional().nullable(),
  default_point_reward: z.number().int().min(0).max(10000).optional(),
  is_active: z.boolean().optional(),
})


export const ThresholdSchema = z
  .object({
    warningConsecutiveMissed: z.number().int().min(1).max(50).optional(),
    atRiskConsecutiveMissed: z.number().int().min(1).max(50).optional(),
    lostConsecutiveMissed: z.number().int().min(1).max(50).optional(),
    churnedDaysThreshold: z.number().int().min(1).max(365).optional(),
  })
  .strict()

export const SeasonSchema = z.object({
  name: z.string().trim().min(1, "Season name is required"),
  code: z.string().trim().optional(),
  start_date: z.string().refine((v) => !isNaN(Date.parse(v)), "Format start_date must be valid ISO date"),
  end_date: z.string().refine((v) => !isNaN(Date.parse(v)), "Format end_date must be valid ISO date"),
  is_active: z.boolean().optional(),
  target_attendance: z.number().int().min(1).optional().default(500),
  description: z.string().trim().nullable().optional(),
})

export const SeasonUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().optional(),
  start_date: z.string().refine((v) => !isNaN(Date.parse(v)), "Format start_date must be valid ISO date").optional(),
  end_date: z.string().refine((v) => !isNaN(Date.parse(v)), "Format end_date must be valid ISO date").optional(),
  is_active: z.boolean().optional(),
  target_attendance: z.number().int().min(1).optional(),
  description: z.string().trim().nullable().optional(),
})

export const PointRuleUpdateSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100).optional(),
  points: z
    .number()
    .int("Points must be an integer")
    .min(0, "Points must be non-negative")
    .max(100, "Points cannot exceed 100 to protect point economy from inflation"),
  description: z.string().trim().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
})

export const BadgeActivitySchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Code must be lowercase kebab-case (e.g. puja-leader)")
    .optional(),
  label: z
    .string({ required_error: "Label is required" })
    .trim()
    .min(1, "Label is required")
    .max(100, "Label cannot exceed 100 characters"),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  bonus_points: z
    .number()
    .int("Bonus points must be an integer")
    .min(0, "Bonus points must be non-negative")
    .max(100, "Bonus points cannot exceed 100")
    .optional()
    .default(30),
  is_active: z.boolean().optional().default(true),
})

export const BadgeActivityUpdateSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Code must be lowercase kebab-case (e.g. mc)")
    .optional(),
  label: z.string().trim().min(1, "Label is required").max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  bonus_points: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
})

export const configureControllers = {

  // Event Types
  async getEventTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const isActiveParam = req.query.is_active
      let filter: { isActive?: boolean } | undefined = undefined
      if (isActiveParam === "true") {
        filter = { isActive: true }
      } else if (isActiveParam === "false") {
        filter = { isActive: false }
      }
      res.json(await configureServices.getEventTypes(filter))
    } catch (err) { next(err) }
  },
  async createEventType(req: Request, res: Response, next: NextFunction) {
    try {
      const body = EventTypeSchema.parse(req.body)
      res.status(201).json(await configureServices.createEventType(body))
    } catch (err) { next(err) }
  },
  async updateEventType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = EventTypeUpdateSchema.parse(req.body)
      res.json(await configureServices.updateEventType(id, body))
    } catch (err) { next(err) }
  },
  async deleteEventType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteEventType(id))
    } catch (err) { next(err) }
  },


  // Thresholds
  getThresholds(_req: Request, res: Response) {
    res.json(configureServices.getThresholds())
  },
  updateThresholds(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = ThresholdSchema.parse(req.body)
      const updated = configureServices.updateThresholds(validated)
      res.json({ success: true, thresholds: updated })
    } catch (err) { next(err) }
  },

  // Seasons
  async getSeasons(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await configureServices.getSeasons())
    } catch (err) { next(err) }
  },
  async createSeason(req: Request, res: Response, next: NextFunction) {
    try {
      const body = SeasonSchema.parse(req.body)
      res.status(201).json(await configureServices.createSeason(body))
    } catch (err) { next(err) }
  },
  async updateSeason(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = SeasonUpdateSchema.parse(req.body)
      res.json(await configureServices.updateSeason(id, body))
    } catch (err) { next(err) }
  },
  async deleteSeason(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteSeason(id))
    } catch (err) { next(err) }
  },
  async activateSeason(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.activateSeason(id))
    } catch (err) { next(err) }
  },

  // Point Rules
  async getPointRules(req: Request, res: Response, next: NextFunction) {
    try {
      const isActive = req.query.is_active !== undefined ? req.query.is_active === "true" : undefined
      const category = req.query.category ? String(req.query.category) : undefined
      const search = req.query.search ? String(req.query.search) : undefined
      res.json(await configureServices.getPointRules({ isActive, category, search }))
    } catch (err) { next(err) }
  },
  async getPointRuleById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.getPointRuleById(id))
    } catch (err) { next(err) }
  },
  async updatePointRule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = PointRuleUpdateSchema.parse(req.body)
      res.json(await configureServices.updatePointRule(id, body))
    } catch (err) { next(err) }
  },

  // Badge Activities (Master Data)
  async getBadgeActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const isActive = req.query.is_active !== undefined ? req.query.is_active === "true" : undefined
      const search = req.query.search ? String(req.query.search) : undefined
      res.json(await configureServices.getBadgeActivities({ isActive, search }))
    } catch (err) { next(err) }
  },
  async getBadgeActivityById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.getBadgeActivityById(id))
    } catch (err) { next(err) }
  },
  async createBadgeActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const body = BadgeActivitySchema.parse(req.body)
      res.status(201).json(await configureServices.createBadgeActivity(body))
    } catch (err) { next(err) }
  },
  async updateBadgeActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = BadgeActivityUpdateSchema.parse(req.body)
      res.json(await configureServices.updateBadgeActivity(id, body))
    } catch (err) { next(err) }
  },
  async deleteBadgeActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteBadgeActivity(id))
    } catch (err) { next(err) }
  },
}

