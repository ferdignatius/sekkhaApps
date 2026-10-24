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
      code?: string
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

    const updateData: any = {}
    if (data.label !== undefined) updateData.label = data.label.trim()
    if (data.color !== undefined) updateData.color = data.color.trim()
    if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null
    if (data.default_point_reward !== undefined) updateData.defaultPointReward = data.default_point_reward
    if (data.is_active !== undefined) updateData.isActive = data.is_active

    // Auto-sync code from label (or explicit code)
    const baseCode = data.code ? toKebabCase(data.code) : (data.label ? toKebabCase(data.label) : null)
    if (baseCode && baseCode !== existing.code) {
      let candidateCode = baseCode
      let counter = 1
      while (true) {
        const found = await configureModels.findEventTypeByCode(candidateCode)
        if (!found || found.id === id) {
          break
        }
        if (data.code) {
          throw new AppError(`Event type with code '${candidateCode}' already exists`, 400, "DUPLICATE_CODE")
        }
        candidateCode = `${baseCode}-${counter}`
        counter++
      }
      updateData.code = candidateCode
    }

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
    const now = new Date()

    return Promise.all(
      seasons.map(async (s) => {
        const count = await configureModels.countSeasonAttendances(s.startDate, s.endDate)
        const daysLeft = Math.max(
          0,
          Math.ceil((s.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        )

        return {
          id: s.id,
          name: s.name,
          code: s.code,
          start_date: s.startDate.toISOString(),
          end_date: s.endDate.toISOString(),
          is_active: s.isActive,
          target_attendance: s.targetAttendance,
          description: s.description,
          total_attendances: count,
          days_left: daysLeft,
          created_at: s.createdAt.toISOString(),
          updated_at: s.updatedAt.toISOString(),
        }
      })
    )
  },

  async createSeason(data: {
    name: string
    code?: string
    start_date: string
    end_date: string
    is_active?: boolean
    target_attendance?: number
    description?: string | null
  }) {
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError("Invalid date range format. Use ISO dates.", 400, "INVALID_DATE_FORMAT")
    }

    if (endDate <= startDate) {
      throw new AppError("End date must be greater than start date.", 400, "INVALID_DATE_RANGE")
    }

    // Auto-generate code in uppercase kebab-case
    const baseCode = data.code
      ? toKebabCase(data.code).toUpperCase()
      : toKebabCase(data.name).toUpperCase()
    let cleanCode = baseCode || `SEASON-${Date.now().toString(36).toUpperCase()}`

    let candidateCode = cleanCode
    let counter = 1
    while (await configureModels.findSeasonByCode(candidateCode)) {
      if (data.code) {
        throw new AppError(`Season with code '${candidateCode}' already exists`, 400, "DUPLICATE_CODE")
      }
      candidateCode = `${cleanCode}-${counter}`
      counter++
    }
    cleanCode = candidateCode

    // Invariant: At most one active custom season at any given time
    if (data.is_active) {
      await configureModels.deactivateOtherSeasons()
    }

    const season = await configureModels.createSeason({
      name: data.name.trim(),
      code: cleanCode,
      startDate,
      endDate,
      isActive: data.is_active ?? false,
      targetAttendance: data.target_attendance ?? 500,
      description: data.description?.trim() || null,
    })

    computeAndCacheLeaderboard().catch(() => {})
    return {
      id: season.id,
      name: season.name,
      code: season.code,
      start_date: season.startDate.toISOString(),
      end_date: season.endDate.toISOString(),
      is_active: season.isActive,
      target_attendance: season.targetAttendance,
      description: season.description,
      created_at: season.createdAt.toISOString(),
      updated_at: season.updatedAt.toISOString(),
    }
  },

  async updateSeason(
    id: string,
    data: {
      name?: string
      code?: string
      start_date?: string
      end_date?: string
      is_active?: boolean
      target_attendance?: number
      description?: string | null
    }
  ) {
    const existing = await configureModels.findSeasonById(id)
    if (!existing) {
      throw new AppError("Season not found", 404, "SEASON_NOT_FOUND")
    }

    const startDate = data.start_date ? new Date(data.start_date) : existing.startDate
    const endDate = data.end_date ? new Date(data.end_date) : existing.endDate

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError("Invalid date range format. Use ISO dates.", 400, "INVALID_DATE_FORMAT")
    }

    if (endDate <= startDate) {
      throw new AppError("End date must be greater than start date.", 400, "INVALID_DATE_RANGE")
    }

    // Invariant: At most one active season
    if (data.is_active) {
      await configureModels.deactivateOtherSeasons(id)
    }

    const updatePayload: any = {}
    if (data.name !== undefined) updatePayload.name = data.name.trim()
    if (data.start_date !== undefined) updatePayload.startDate = startDate
    if (data.end_date !== undefined) updatePayload.endDate = endDate
    if (data.is_active !== undefined) updatePayload.isActive = data.is_active
    if (data.target_attendance !== undefined) updatePayload.targetAttendance = data.target_attendance
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null

    // Auto-sync code from name (or explicit code)
    const baseCode = data.code
      ? toKebabCase(data.code).toUpperCase()
      : (data.name ? toKebabCase(data.name).toUpperCase() : null)

    if (baseCode && baseCode !== existing.code) {
      let candidateCode = baseCode
      let counter = 1
      while (true) {
        const found = await configureModels.findSeasonByCode(candidateCode)
        if (!found || found.id === id) {
          break
        }
        if (data.code) {
          throw new AppError(`Season with code '${candidateCode}' already exists`, 400, "DUPLICATE_CODE")
        }
        candidateCode = `${baseCode}-${counter}`
        counter++
      }
      updatePayload.code = candidateCode
    }

    const season = await configureModels.updateSeason(id, updatePayload)
    computeAndCacheLeaderboard().catch(() => {})

    return {
      id: season.id,
      name: season.name,
      code: season.code,
      start_date: season.startDate.toISOString(),
      end_date: season.endDate.toISOString(),
      is_active: season.isActive,
      target_attendance: season.targetAttendance,
      description: season.description,
      created_at: season.createdAt.toISOString(),
      updated_at: season.updatedAt.toISOString(),
    }
  },

  async deleteSeason(id: string) {
    const existing = await configureModels.findSeasonById(id)
    if (!existing) {
      throw new AppError("Season not found", 404, "SEASON_NOT_FOUND")
    }

    // Safe delete relational check: block delete if season has events
    const eventCount = await configureModels.countEventsBySeasonId(id)
    if (eventCount > 0) {
      throw new AppError(
        `Cannot delete season because it is associated with ${eventCount} event(s). Please deactivate it instead.`,
        409,
        "SEASON_IN_USE"
      )
    }

    await configureModels.deleteSeason(id)
    computeAndCacheLeaderboard().catch(() => {})
    return { success: true, message: "Season deleted successfully" }
  },

  async activateSeason(id: string) {
    const existing = await configureModels.findSeasonById(id)
    if (!existing) {
      throw new AppError("Season not found", 404, "SEASON_NOT_FOUND")
    }

    await configureModels.deactivateOtherSeasons(id)
    const season = await configureModels.updateSeason(id, { isActive: true })
    await computeAndCacheLeaderboard()
    return { success: true, season }
  },

  // ─── Point Rules ───────────────────────────────────────────────────────────
  async getPointRules(filter?: { isActive?: boolean; category?: string; search?: string }) {
    const list = await configureModels.findPointRules(filter)
    return list.map((r) => ({
      id: r.id,
      code: r.code,
      label: r.label,
      points: r.points,
      description: r.description,
      category: r.category,
      is_active: r.isActive,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }))
  },

  async getPointRuleById(identifier: string) {
    const r = await configureModels.findPointRuleByIdOrCode(identifier)
    if (!r) {
      throw new AppError("Point rule not found", 404, "POINT_RULE_NOT_FOUND")
    }
    const txCount = await configureModels.countTransactionsByPointRuleId(r.id)
    return {
      id: r.id,
      code: r.code,
      label: r.label,
      points: r.points,
      description: r.description,
      category: r.category,
      is_active: r.isActive,
      transactions_count: txCount,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }
  },

  async updatePointRule(
    identifier: string,
    data: {
      label?: string
      points?: number
      description?: string | null
      is_active?: boolean
    }
  ) {
    if (data.points !== undefined && (data.points < 0 || data.points > 100)) {
      throw new AppError(
        "Point value must be between 0 and 100 to protect point economy from inflation.",
        400,
        "POINT_RULE_LIMIT_EXCEEDED"
      )
    }

    const updated = await configureModels.updatePointRule(identifier, {
      ...(data.label && { label: data.label }),
      ...(data.points !== undefined && { points: data.points }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.is_active !== undefined && { isActive: data.is_active }),
    })

    if (!updated) {
      throw new AppError("Point rule not found", 404, "POINT_RULE_NOT_FOUND")
    }

    return {
      id: updated.id,
      code: updated.code,
      label: updated.label,
      points: updated.points,
      description: updated.description,
      category: updated.category,
      is_active: updated.isActive,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    }
  },

  // ─── Badge Activities (Master Data) ─────────────────────────────────────────
  async getBadgeActivities(filter?: { isActive?: boolean; search?: string }) {
    const list = await configureModels.findBadgeActivities(filter)
    return list.map((b) => ({
      id: b.id,
      code: b.code,
      label: b.label,
      description: b.description,
      bonus_points: b.bonusPoints,
      is_active: b.isActive,
      created_at: b.createdAt.toISOString(),
      updated_at: b.updatedAt.toISOString(),
    }))
  },

  async getBadgeActivityById(id: string) {
    const b = await configureModels.findBadgeActivityById(id)
    if (!b) {
      throw new AppError("Badge activity not found", 404, "BADGE_ACTIVITY_NOT_FOUND")
    }
    return {
      id: b.id,
      code: b.code,
      label: b.label,
      description: b.description,
      bonus_points: b.bonusPoints,
      is_active: b.isActive,
      attendances_count: b._count.attendances,
      created_at: b.createdAt.toISOString(),
      updated_at: b.updatedAt.toISOString(),
    }
  },

  async createBadgeActivity(data: {
    code?: string
    label: string
    description?: string | null
    bonus_points?: number
    is_active?: boolean
  }) {
    // Generate clean kebab-case code from label if not provided
    const baseCode = data.code ? toKebabCase(data.code) : toKebabCase(data.label)
    let cleanCode = baseCode || `duty-${Date.now().toString(36)}`

    // Guarantee uniqueness with incremental suffix (O(1) average lookup via index)
    let candidateCode = cleanCode
    let counter = 1
    while (await configureModels.findBadgeActivityByCode(candidateCode)) {
      if (data.code) {
        throw new AppError(`Badge activity with code '${candidateCode}' already exists`, 400, "DUPLICATE_CODE")
      }
      candidateCode = `${cleanCode}-${counter}`
      counter++
    }
    cleanCode = candidateCode

    const created = await configureModels.createBadgeActivity({
      code: cleanCode,
      label: data.label.trim(),
      description: data.description?.trim() || null,
      bonusPoints: data.bonus_points ?? 30,
      isActive: data.is_active ?? true,
    })

    return {
      id: created.id,
      code: created.code,
      label: created.label,
      description: created.description,
      bonus_points: created.bonusPoints,
      is_active: created.isActive,
      created_at: created.createdAt.toISOString(),
      updated_at: created.updatedAt.toISOString(),
    }
  },

  async updateBadgeActivity(
    id: string,
    data: {
      code?: string
      label?: string
      description?: string | null
      bonus_points?: number
      is_active?: boolean
    }
  ) {
    const existing = await configureModels.findBadgeActivityById(id)
    if (!existing) {
      throw new AppError("Badge activity not found", 404, "BADGE_ACTIVITY_NOT_FOUND")
    }

    const updatePayload: {
      code?: string
      label?: string
      description?: string | null
      bonusPoints?: number
      isActive?: boolean
    } = {}

    if (data.label !== undefined) updatePayload.label = data.label.trim()
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null
    if (data.bonus_points !== undefined) updatePayload.bonusPoints = data.bonus_points
    if (data.is_active !== undefined) updatePayload.isActive = data.is_active

    // Auto-sync code from label (or explicit code)
    const baseCode = data.code ? toKebabCase(data.code) : (data.label ? toKebabCase(data.label) : null)
    if (baseCode && baseCode !== existing.code) {
      let candidateCode = baseCode
      let counter = 1
      while (true) {
        const found = await configureModels.findBadgeActivityByCode(candidateCode)
        if (!found || found.id === id) {
          break
        }
        if (data.code) {
          throw new AppError(`Badge activity with code '${candidateCode}' already exists`, 400, "DUPLICATE_CODE")
        }
        candidateCode = `${baseCode}-${counter}`
        counter++
      }
      updatePayload.code = candidateCode
    }

    const updated = await configureModels.updateBadgeActivity(id, updatePayload)

    return {
      id: updated.id,
      code: updated.code,
      label: updated.label,
      description: updated.description,
      bonus_points: updated.bonusPoints,
      is_active: updated.isActive,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    }
  },

  async deleteBadgeActivity(id: string) {
    const existing = await configureModels.findBadgeActivityById(id)
    if (!existing) {
      throw new AppError("Badge activity not found", 404, "BADGE_ACTIVITY_NOT_FOUND")
    }

    // Relational Integrity: In-Use Safe Delete Protection (O(1) indexed check)
    const usageCount = await configureModels.countAttendancesByBadgeActivityId(id)
    if (usageCount > 0) {
      throw new AppError(
        "Badge activity cannot be deleted because it is already linked to attendance records. Deactivate it instead.",
        409,
        "BADGE_ACTIVITY_IN_USE"
      )
    }

    await configureModels.deleteBadgeActivity(id)
    return { success: true, message: "Badge activity deleted successfully" }
  },
}

