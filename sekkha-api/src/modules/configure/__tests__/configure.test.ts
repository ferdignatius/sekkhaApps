import { describe, it, expect } from "bun:test"
import {
  EventTypeSchema,
  EventTypeUpdateSchema,
  SeasonSchema,
  SeasonUpdateSchema,
  PointRuleUpdateSchema,
  BadgeActivitySchema,
  BadgeActivityUpdateSchema,
  ThresholdSchema,
} from "../controllers"
import { configureServices } from "../services"
import { configureModels } from "../models"
import { AppError } from "../../../lib/AppError"

describe("Configure Module Validation Schemas", () => {
  it("validates EventTypeSchema constraints", () => {
    // Valid event type
    const valid = EventTypeSchema.safeParse({
      label: "Sunday Service",
      color: "#4262FF",
      default_point_reward: 50,
    })
    expect(valid.success).toBe(true)

    // Invalid hex color
    const invalidColor = EventTypeSchema.safeParse({
      label: "Sunday Service",
      color: "red",
    })
    expect(invalidColor.success).toBe(false)

    // Code must be kebab-case
    const invalidCode = EventTypeSchema.safeParse({
      code: "INVALID CODE",
      label: "Sunday Service",
      color: "#4262FF",
    })
    expect(invalidCode.success).toBe(false)

    // Negative points
    const negativePoints = EventTypeSchema.safeParse({
      label: "Sunday Service",
      color: "#4262FF",
      default_point_reward: -10,
    })
    expect(negativePoints.success).toBe(false)
  })

  it("validates SeasonSchema constraints", () => {
    const valid = SeasonSchema.safeParse({
      name: "Season 1 2026",
      start_date: "2026-01-01T00:00:00.000Z",
      end_date: "2026-03-31T23:59:59.000Z",
      target_attendance: 600,
    })
    expect(valid.success).toBe(true)

    const invalidDate = SeasonSchema.safeParse({
      name: "Season 1 2026",
      start_date: "not-a-date",
      end_date: "2026-03-31",
    })
    expect(invalidDate.success).toBe(false)
  })

  it("validates PointRuleUpdateSchema anti-inflation guardrail", () => {
    // 0 to 100 points allowed
    expect(PointRuleUpdateSchema.safeParse({ points: 50 }).success).toBe(true)
    expect(PointRuleUpdateSchema.safeParse({ points: 0 }).success).toBe(true)
    expect(PointRuleUpdateSchema.safeParse({ points: 100 }).success).toBe(true)

    // > 100 rejected to prevent point inflation
    const overLimit = PointRuleUpdateSchema.safeParse({ points: 150 })
    expect(overLimit.success).toBe(false)
    if (!overLimit.success) {
      expect(overLimit.error.errors[0].message).toContain("Points cannot exceed 100")
    }

    // Negative points rejected
    const negative = PointRuleUpdateSchema.safeParse({ points: -1 })
    expect(negative.success).toBe(false)
  })

  it("validates BadgeActivitySchema constraints", () => {
    const valid = BadgeActivitySchema.safeParse({
      label: "Puja Leader",
      bonus_points: 30,
    })
    expect(valid.success).toBe(true)

    // Invalid code formatting
    const invalidCode = BadgeActivitySchema.safeParse({
      code: "UPPER_CASE_CODE",
      label: "Puja Leader",
    })
    expect(invalidCode.success).toBe(false)

    // Bonus points over 100 rejected
    const overBonus = BadgeActivitySchema.safeParse({
      label: "Puja Leader",
      bonus_points: 150,
    })
    expect(overBonus.success).toBe(false)
  })

  it("validates ThresholdSchema boundaries", () => {
    expect(ThresholdSchema.safeParse({ warningConsecutiveMissed: 2 }).success).toBe(true)
    expect(ThresholdSchema.safeParse({ churnedDaysThreshold: 60 }).success).toBe(true)
    expect(ThresholdSchema.safeParse({ unknownField: 123 }).success).toBe(false)
  })
})

describe("Configure Services & Business Policies", () => {
  it("prevents deleting Event Type currently in use", async () => {
    const originalFind = configureModels.findEventTypeById
    const originalCount = configureModels.countEventsByEventTypeId

    configureModels.findEventTypeById = async () => ({
      id: "evt_type_in_use",
      code: "puja-rutin",
      label: "Puja Rutin",
      color: "#4262FF",
      description: null,
      defaultPointReward: 50,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    configureModels.countEventsByEventTypeId = async () => 5

    try {
      await configureServices.deleteEventType("evt_type_in_use")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err instanceof AppError).toBe(true)
      expect(err.statusCode || err.status).toBe(409)
      expect(err.code).toBe("EVENT_TYPE_IN_USE")
    }

    configureModels.findEventTypeById = originalFind
    configureModels.countEventsByEventTypeId = originalCount
  })

  it("validates Season date ranges and prevents deleting Season with events", async () => {
    // End date before start date throws 400
    try {
      await configureServices.createSeason({
        name: "Invalid Season",
        start_date: "2026-06-01T00:00:00Z",
        end_date: "2026-05-01T00:00:00Z",
      })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.statusCode || err.status).toBe(400)
      expect(err.code).toBe("INVALID_DATE_RANGE")
    }

    // In-use delete protection
    const originalFindSeason = configureModels.findSeasonById
    const originalCountEvents = configureModels.countEventsBySeasonId

    configureModels.findSeasonById = async () => ({
      id: "season_active",
      name: "Season 1 2026",
      code: "S2026-Q1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
      targetAttendance: 500,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    configureModels.countEventsBySeasonId = async () => 3

    try {
      await configureServices.deleteSeason("season_active")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.statusCode || err.status).toBe(409)
      expect(err.code).toBe("SEASON_IN_USE")
    }

    configureModels.findSeasonById = originalFindSeason
    configureModels.countEventsBySeasonId = originalCountEvents
  })

  it("enforces Point Rule point value bounds in updatePointRule", async () => {
    try {
      await configureServices.updatePointRule("streak_monthly_bonus", { points: 120 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.statusCode || err.status).toBe(400)
      expect(err.code).toBe("POINT_RULE_LIMIT_EXCEEDED")
    }
  })

  it("prevents deleting Badge Activity currently linked to attendances", async () => {
    const originalFindBadge = configureModels.findBadgeActivityById
    const originalCountAttendances = configureModels.countAttendancesByBadgeActivityId

    configureModels.findBadgeActivityById = async () => ({
      id: "badge_in_use",
      code: "mc",
      label: "Master of Ceremony",
      description: null,
      bonusPoints: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    configureModels.countAttendancesByBadgeActivityId = async () => 12

    try {
      await configureServices.deleteBadgeActivity("badge_in_use")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.statusCode || err.status).toBe(409)
      expect(err.code).toBe("BADGE_ACTIVITY_IN_USE")
    }

    configureModels.findBadgeActivityById = originalFindBadge
    configureModels.countAttendancesByBadgeActivityId = originalCountAttendances
  })
})
