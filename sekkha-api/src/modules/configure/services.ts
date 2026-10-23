import { configureModels } from "./models"
import { computeAndCacheLeaderboard, resolveActiveSeason } from "../leaderboard/services"

let defaultThresholds = {
  warningConsecutiveMissed: 2,
  atRiskConsecutiveMissed: 3,
  lostConsecutiveMissed: 4,
  churnedDaysThreshold: 60,
}

export const configureServices = {

  // ─── Event Types ───────────────────────────────────────────────────────────
  async getEventTypes() {
    const types = await configureModels.findEventTypes()
    return types.map((t) => ({
      id: t.id,
      code: t.code,
      label: t.label,
      color: t.color,
      description: t.description,
      default_point_reward: t.defaultPointReward,
      is_active: t.isActive,
    }))
  },

  async createEventType(data: any) {
    const type = await configureModels.createEventType({
      code: data.code,
      label: data.label,
      color: data.color,
      description: data.description,
      defaultPointReward: data.default_point_reward ?? 0,
      isActive: data.is_active ?? true,
    })
    return { id: type.id, code: type.code }
  },

  async updateEventType(id: string, data: any) {
    const type = await configureModels.updateEventType(id, {
      ...(data.code && { code: data.code }),
      ...(data.label && { label: data.label }),
      ...(data.color && { color: data.color }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.default_point_reward !== undefined && { defaultPointReward: data.default_point_reward }),
      ...(data.is_active !== undefined && { isActive: data.is_active }),
    })
    return { id: type.id, code: type.code }
  },

  async deleteEventType(id: string) {
    await configureModels.deleteEventType(id)
    return { success: true }
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
