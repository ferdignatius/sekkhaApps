import { configureModels } from "./models"
import { computeAndCacheLeaderboard, resolveActiveSeason } from "../leaderboard/services"
import { AppError } from "../../lib/AppError"

let defaultThresholds = {
  warningConsecutiveMissed: 2,
  atRiskConsecutiveMissed: 3,
  lostConsecutiveMissed: 4,
  churnedDaysThreshold: 60,
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export const configureServices = {

  // ─── Event Types ───────────────────────────────────────────────────────────
  async getEventTypes(filter?: { isActive?: boolean }) {
    const types = await configureModels.findEventTypes(filter)
    return types.map((t) => ({
      id: t.id,
      code: t.code,
      label: t.label,
      color: t.color,
      description: t.description,
      default_point_reward: t.defaultPointReward,
      is_active: t.isActive,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
    }))
  },

  async createEventType(data: {
    code?: string
    label: string
    color: string
    description?: string | null
    default_point_reward?: number
    is_active?: boolean
  }) {
    // Generate code from label if not manually provided
    const baseCode = data.code ? toKebabCase(data.code) : toKebabCase(data.label)
    let cleanCode = baseCode || `event-${Date.now().toString(36)}`

    let candidateCode = cleanCode
    let counter = 1
    while (await configureModels.findEventTypeByCode(candidateCode)) {
      if (data.code) {
        throw new AppError(`Event type with code '${candidateCode}' already exists`, 400, "DUPLICATE_CODE")
      }
      candidateCode = `${cleanCode}-${counter}`
      counter++
    }
    cleanCode = candidateCode

    const type = await configureModels.createEventType({
      code: cleanCode,
      label: data.label.trim(),
      color: data.color.trim(),
      description: data.description?.trim() || null,
      defaultPointReward: data.default_point_reward ?? 0,
      isActive: data.is_active ?? true,
    })

    return {
      id: type.id,
      code: type.code,
      label: type.label,
      color: type.color,
      description: type.description,
      default_point_reward: type.defaultPointReward,
      is_active: type.isActive,
    }
  },

  async updateEventType(
    id: string,
    data: {
      label?: string
      color?: string
      description?: string | null
      default_point_reward?: number
      is_active?: boolean
    }
  ) {
    const existing = await configureModels.findEventTypeById(id)
    if (!existing) {
      throw new AppError("Event type not found", 404, "EVENT_TYPE_NOT_FOUND")
    }

    // Code is strictly immutable per PRD rules
    const updateData: any = {}
    if (data.label !== undefined) updateData.label = data.label.trim()
    if (data.color !== undefined) updateData.color = data.color.trim()
    if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null
    if (data.default_point_reward !== undefined) updateData.defaultPointReward = data.default_point_reward
    if (data.is_active !== undefined) updateData.isActive = data.is_active

    const type = await configureModels.updateEventType(id, updateData)

    return {
      id: type.id,
      code: type.code,
      label: type.label,
      color: type.color,
      description: type.description,
      default_point_reward: type.defaultPointReward,
      is_active: type.isActive,
    }
  },

  async deleteEventType(id: string) {
    const existing = await configureModels.findEventTypeById(id)
    if (!existing) {
      throw new AppError("Event type not found", 404, "EVENT_TYPE_NOT_FOUND")
    }

    const inUseCount = await configureModels.countEventsByEventTypeId(id)
    if (inUseCount > 0) {
      throw new AppError(
        `Cannot delete Event Type that is currently in use by ${inUseCount} event(s). Please deactivate it instead.`,
        409,
        "EVENT_TYPE_IN_USE"
      )
    }

    await configureModels.deleteEventType(id)
    return { success: true, message: "Event type deleted successfully" }
  },


  // ─── Thresholds ────────────────────────────────────────────────────────────
  getThresholds() {
    return defaultThresholds
  },

  updateThresholds(data: any) {
    defaultThresholds = { ...defaultThresholds, ...data }
    return defaultThresholds
  },

  // ─── Seasons ───────────────────────────────────────────────────────────────
  async getSeasons() {
    await resolveActiveSeason()
    const seasons = await configureModels.findSeasons()
    return Promise.all(
      seasons.map(async (s) => {
        const count = await configureModels.countSeasonAttendances(s.startDate, s.endDate)
        return {
          id: s.id,
          name: s.name,
          code: s.code,
          start_date: s.startDate.toISOString(),
          end_date: s.endDate.toISOString(),
          is_active: s.isActive,
          target_attendance: s.targetAttendance,
          bonus_points: s.bonusPoints,
          description: s.description,
          total_attendances: count,
          created_at: s.createdAt.toISOString(),
        }
      })
    )
  },

  async createSeason(data: any) {
    if (data.is_active) {
      await configureModels.deactivateOtherSeasons()
    }
    const season = await configureModels.createSeason({
      name: data.name,
      code: data.code || `S-${Date.now().toString(36).toUpperCase()}`,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      isActive: data.is_active ?? false,
      targetAttendance: data.target_attendance ?? 500,
      bonusPoints: data.bonus_points ?? 100,
      description: data.description,
    })
    computeAndCacheLeaderboard().catch(() => {})
    return season
  },

  async updateSeason(id: string, data: any) {
    if (data.is_active) {
      await configureModels.deactivateOtherSeasons(id)
    }
    const season = await configureModels.updateSeason(id, {
      ...(data.name && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.start_date && { startDate: new Date(data.start_date) }),
      ...(data.end_date && { endDate: new Date(data.end_date) }),
      ...(data.is_active !== undefined && { isActive: data.is_active }),
      ...(data.target_attendance !== undefined && { targetAttendance: data.target_attendance }),
      ...(data.bonus_points !== undefined && { bonusPoints: data.bonus_points }),
      ...(data.description !== undefined && { description: data.description }),
    })
    computeAndCacheLeaderboard().catch(() => {})
    return season
  },

  async deleteSeason(id: string) {
    await configureModels.deleteSeason(id)
    computeAndCacheLeaderboard().catch(() => {})
    return { success: true }
  },

  async activateSeason(id: string) {
    await configureModels.deactivateOtherSeasons()
    const season = await configureModels.updateSeason(id, { isActive: true })
    await computeAndCacheLeaderboard()
    return { success: true, season }
  },

  // ─── Point Rules ───────────────────────────────────────────────────────────
  async getPointRules() {
    return configureModels.findPointRules()
  },

  async updatePointRule(id: string, data: any) {
    return configureModels.updatePointRule(id, {
      ...(data.label && { label: data.label }),
      points: data.points,
      ...(data.description !== undefined && { description: data.description }),
    })
  },
}
