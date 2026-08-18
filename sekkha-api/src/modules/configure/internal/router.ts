// Master data CRUD: badges, levels, event-types, achievements
import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"

export const configureRouter = Router()

// All configure routes require auth
configureRouter.use(requireAuth)

// GET allows pengurus & admin, other methods (POST, PUT, DELETE) only allow admin
configureRouter.use((req, res, next) => {
  if (req.method === "GET") {
    requireRole("pengurus", "admin")(req, res, next)
  } else {
    requireRole("admin")(req, res, next)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════════════════════════

const BadgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon_url: z.string().min(1),
  condition_type: z.enum(["streak", "attendance", "points", "event_count", "manual"]),
  condition_value: z.number().int().min(0),
})

configureRouter.get("/badges", async (_req, res, next) => {
  try {
    const badges = await prisma.badge.findMany({ orderBy: { name: "asc" } })
    res.json(badges.map(b => ({
      id: b.id, name: b.name, description: b.description, icon_url: b.iconUrl,
      condition_type: b.conditionType, condition_value: b.conditionValue, is_active: b.isActive,
    })))
  } catch (err) { next(err) }
})

configureRouter.post("/badges", async (req, res, next) => {
  try {
    const body = BadgeSchema.parse(req.body)
    const badge = await prisma.badge.create({
      data: { name: body.name, description: body.description, iconUrl: body.icon_url,
        conditionType: body.condition_type, conditionValue: body.condition_value },
    })
    res.status(201).json({ id: badge.id, name: badge.name })
  } catch (err) { next(err) }
})

configureRouter.put("/badges/:id", async (req, res, next) => {
  try {
    const body = BadgeSchema.partial().parse(req.body)
    const badge = await prisma.badge.update({
      where: { id: req.params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.icon_url && { iconUrl: body.icon_url }),
        ...(body.condition_type && { conditionType: body.condition_type }),
        ...(body.condition_value !== undefined && { conditionValue: body.condition_value }),
      },
    })
    res.json({ id: badge.id, name: badge.name })
  } catch (err) { next(err) }
})

configureRouter.delete("/badges/:id", async (req, res, next) => {
  try {
    await prisma.badge.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

const LevelSchema = z.object({
  level: z.number().int().min(1),
  label: z.string().min(1),
  min_points: z.number().int().min(0),
})

configureRouter.get("/levels", async (_req, res, next) => {
  try {
    const levels = await prisma.level.findMany({ orderBy: { level: "asc" } })
    res.json(levels.map(l => ({ id: l.id, level: l.level, label: l.label, min_points: l.minPoints })))
  } catch (err) { next(err) }
})

configureRouter.post("/levels", async (req, res, next) => {
  try {
    const body = LevelSchema.parse(req.body)
    const level = await prisma.level.create({
      data: { level: body.level, label: body.label, minPoints: body.min_points },
    })
    res.status(201).json({ id: level.id, level: level.level })
  } catch (err) { next(err) }
})

configureRouter.put("/levels/:id", async (req, res, next) => {
  try {
    const body = LevelSchema.partial().parse(req.body)
    const level = await prisma.level.update({
      where: { id: req.params.id },
      data: {
        ...(body.level !== undefined && { level: body.level }),
        ...(body.label && { label: body.label }),
        ...(body.min_points !== undefined && { minPoints: body.min_points }),
      },
    })
    res.json({ id: level.id, level: level.level })
  } catch (err) { next(err) }
})

configureRouter.delete("/levels/:id", async (req, res, next) => {
  try {
    await prisma.level.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

const EventTypeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1),
  is_default: z.boolean().optional(),
})

configureRouter.get("/event-types", async (_req, res, next) => {
  try {
    const types = await prisma.eventType.findMany({ orderBy: { label: "asc" } })
    res.json(types.map(t => ({ id: t.id, code: t.code, label: t.label, color: t.color, is_default: t.isDefault })))
  } catch (err) { next(err) }
})

configureRouter.post("/event-types", async (req, res, next) => {
  try {
    const body = EventTypeSchema.parse(req.body)
    const type = await prisma.eventType.create({
      data: { code: body.code, label: body.label, color: body.color, isDefault: body.is_default ?? false },
    })
    res.status(201).json({ id: type.id, code: type.code })
  } catch (err) { next(err) }
})

configureRouter.put("/event-types/:id", async (req, res, next) => {
  try {
    const body = EventTypeSchema.partial().parse(req.body)
    const type = await prisma.eventType.update({
      where: { id: req.params.id },
      data: {
        ...(body.code && { code: body.code }),
        ...(body.label && { label: body.label }),
        ...(body.color && { color: body.color }),
        ...(body.is_default !== undefined && { isDefault: body.is_default }),
      },
    })
    res.json({ id: type.id, code: type.code })
  } catch (err) { next(err) }
})

configureRouter.delete("/event-types/:id", async (req, res, next) => {
  try {
    await prisma.eventType.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENTS (same model as Badge, but used for achievement master data page)
// ═══════════════════════════════════════════════════════════════════════════════

const AchievementSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon_url: z.string().min(1),
  condition_type: z.enum(["streak", "attendance", "points", "event_count", "manual"]),
  condition_value: z.number().int().min(0),
  is_active: z.boolean().optional(),
})

configureRouter.get("/achievements", async (_req, res, next) => {
  try {
    const badges = await prisma.badge.findMany({ orderBy: { name: "asc" } })
    res.json(badges.map(b => ({
      id: b.id, name: b.name, description: b.description, icon_url: b.iconUrl,
      condition_type: b.conditionType, condition_value: b.conditionValue, is_active: b.isActive,
    })))
  } catch (err) { next(err) }
})

configureRouter.post("/achievements", async (req, res, next) => {
  try {
    const body = AchievementSchema.parse(req.body)
    const badge = await prisma.badge.create({
      data: { name: body.name, description: body.description, iconUrl: body.icon_url,
        conditionType: body.condition_type, conditionValue: body.condition_value, isActive: body.is_active ?? true },
    })
    res.status(201).json({ id: badge.id, name: badge.name })
  } catch (err) { next(err) }
})

configureRouter.put("/achievements/:id", async (req, res, next) => {
  try {
    const body = AchievementSchema.partial().parse(req.body)
    const badge = await prisma.badge.update({
      where: { id: req.params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.icon_url && { iconUrl: body.icon_url }),
        ...(body.condition_type && { conditionType: body.condition_type }),
        ...(body.condition_value !== undefined && { conditionValue: body.condition_value }),
        ...(body.is_active !== undefined && { isActive: body.is_active }),
      },
    })
    res.json({ id: badge.id, name: badge.name })
  } catch (err) { next(err) }
})

configureRouter.delete("/achievements/:id", async (req, res, next) => {
  try {
    await prisma.badge.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EARLY WARNING THRESHOLD
// ═══════════════════════════════════════════════════════════════════════════════

let defaultThresholds = {
  warningConsecutiveMissed: 2,
  atRiskConsecutiveMissed: 3,
  lostConsecutiveMissed: 4,
  churnedDaysThreshold: 60,
}

configureRouter.get("/threshold", async (_req, res) => {
  res.json(defaultThresholds)
})

configureRouter.put("/threshold", async (req, res) => {
  defaultThresholds = { ...defaultThresholds, ...req.body }
  res.json({ success: true, thresholds: defaultThresholds })
})

