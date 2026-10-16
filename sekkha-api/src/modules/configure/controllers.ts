import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { configureServices } from "./services"

export const BadgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon_url: z.string().min(1),
  condition_type: z.enum(["streak", "attendance", "points", "event_count", "manual"]),
  condition_value: z.number().int().min(0),
})

export const LevelSchema = z.object({
  level: z.number().int().min(1),
  label: z.string().min(1),
  min_points: z.number().int().min(0),
})

export const EventTypeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1),
  is_default: z.boolean().optional(),
})

export const AchievementSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon_url: z.string().min(1),
  condition_type: z.enum(["streak", "attendance", "points", "event_count", "manual"]),
  condition_value: z.number().int().min(0),
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
  name: z.string().min(1),
  code: z.string().optional(),
  start_date: z.string().refine((v) => !isNaN(Date.parse(v)), "Format start_date tidak valid, gunakan format tanggal ISO"),
  end_date: z.string().refine((v) => !isNaN(Date.parse(v)), "Format end_date tidak valid, gunakan format tanggal ISO"),
  is_active: z.boolean().optional(),
  target_attendance: z.number().int().min(1).optional(),
  bonus_points: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
})

export const PointRuleUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  points: z.number().int().min(0),
  description: z.string().optional().nullable(),
})

export const configureControllers = {
  // Badges
  async getBadges(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await configureServices.getBadges())
    } catch (err) { next(err) }
  },
  async createBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const body = BadgeSchema.parse(req.body)
      res.status(201).json(await configureServices.createBadge(body))
    } catch (err) { next(err) }
  },
  async updateBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = BadgeSchema.partial().parse(req.body)
      res.json(await configureServices.updateBadge(id, body))
    } catch (err) { next(err) }
  },
  async deleteBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteBadge(id))
    } catch (err) { next(err) }
  },

  // Levels
  async getLevels(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await configureServices.getLevels())
    } catch (err) { next(err) }
  },
  async createLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const body = LevelSchema.parse(req.body)
      res.status(201).json(await configureServices.createLevel(body))
    } catch (err) { next(err) }
  },
  async updateLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = LevelSchema.partial().parse(req.body)
      res.json(await configureServices.updateLevel(id, body))
    } catch (err) { next(err) }
  },
  async deleteLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteLevel(id))
    } catch (err) { next(err) }
  },

  // Event Types
  async getEventTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await configureServices.getEventTypes())
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
      const body = EventTypeSchema.partial().parse(req.body)
      res.json(await configureServices.updateEventType(id, body))
    } catch (err) { next(err) }
  },
  async deleteEventType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteEventType(id))
    } catch (err) { next(err) }
  },

  // Achievements
  async getAchievements(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await configureServices.getAchievements())
    } catch (err) { next(err) }
  },
  async createAchievement(req: Request, res: Response, next: NextFunction) {
    try {
      const body = AchievementSchema.parse(req.body)
      res.status(201).json(await configureServices.createAchievement(body))
    } catch (err) { next(err) }
  },
  async updateAchievement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = AchievementSchema.partial().parse(req.body)
      res.json(await configureServices.updateAchievement(id, body))
    } catch (err) { next(err) }
  },
  async deleteAchievement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      res.json(await configureServices.deleteAchievement(id))
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
      const body = SeasonSchema.partial().parse(req.body)
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
  async getPointRules(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await configureServices.getPointRules())
    } catch (err) { next(err) }
  },
  async updatePointRule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const body = PointRuleUpdateSchema.parse(req.body)
      res.json(await configureServices.updatePointRule(id, body))
    } catch (err) { next(err) }
  },
}
