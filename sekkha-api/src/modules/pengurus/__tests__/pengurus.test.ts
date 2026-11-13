import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { pengurusServices } from "../services"
import { pengurusModels } from "../models"
import { redis } from "../../../lib/redis"

describe("Pengurus Module — Unit Tests (Insights & Analytics)", () => {
  const originalFindUsers = pengurusModels.findUsersForInsights
  const originalFindEvents = pengurusModels.findEventsWithAttendancesForInsights
  const originalFindEventTypes = pengurusModels.findEventTypesForInsights

  const originalRedisGet = redis.get
  const originalRedisSet = redis.set

  beforeEach(() => {
    // In-memory safe defaults: no database hits
    pengurusModels.findUsersForInsights = async () => []
    pengurusModels.findEventsWithAttendancesForInsights = async () => []
    pengurusModels.findEventTypesForInsights = async () => []

    // Cache passthrough
    redis.get = (async () => null) as any
    redis.set = (async () => "OK") as any
  })

  afterEach(() => {
    pengurusModels.findUsersForInsights = originalFindUsers
    pengurusModels.findEventsWithAttendancesForInsights = originalFindEvents
    pengurusModels.findEventTypesForInsights = originalFindEventTypes

    redis.get = originalRedisGet
    redis.set = originalRedisSet
  })

  describe("1. Zero-Division Avoidance & Empty States", () => {
    it("handles zero users and zero events cleanly without NaN or crashes", async () => {
      pengurusModels.findUsersForInsights = async () => []
      pengurusModels.findEventsWithAttendancesForInsights = async () => []
      pengurusModels.findEventTypesForInsights = async () => []

      const insights = await pengurusServices.getInsights({
        timeUnit: "month",
        primaryYear: 2026,
        primaryMonth: 7,
        isComparisonEnabled: false,
      })

      expect(insights).toBeDefined()
      expect(insights.timeUnit).toBe("month")
      expect(insights.summary.totalActiveMembers.value).toBe(0)
      expect(insights.summary.avgAttendanceRate.value).toBe("0%")
      expect(insights.summary.retentionRate.value).toBe("0%")
      expect(insights.summary.totalSevaSessions.value).toBe(0)

      // Role comparisons with 0 members
      expect(insights.roleComparison.member.totalCount).toBe(0)
      expect(insights.roleComparison.member.avgAttendancePercent).toBe(0)
      expect(insights.roleComparison.member.avgMonthlyEvents).toBe(0)
      expect(insights.roleComparison.member.topStreak).toBe(0)
      expect(insights.roleComparison.member.avgAbsenceRate).toBe("0%")

      // Tenure breakdown with 0 members
      expect(insights.tenureBreakdown.length).toBe(4)
      for (const t of insights.tenureBreakdown) {
        expect(Number.isNaN(t.percentage)).toBe(false)
        expect(t.count).toBe(0)
      }
    })

    it("handles events with zero attendances without division by zero", async () => {
      pengurusModels.findUsersForInsights = async () => [
        {
          id: "u_1",
          role: "member",
          createdAt: new Date("2026-01-01"),
          profile: { name: "Budi" },
          stats: { points: 10, currentStreak: 1 },
        },
      ]
      pengurusModels.findEventsWithAttendancesForInsights = async () => [
        {
          id: "evt_1",
          title: "Sunday Puja",
          eventDate: new Date("2026-07-05T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [],
        },
      ]

      const insights = await pengurusServices.getInsights({
        timeUnit: "month",
        primaryYear: 2026,
        primaryMonth: 7,
        compareYear: 2026,
        compareMonth: 6,
        isComparisonEnabled: true,
      })

      expect(insights.summary.totalActiveMembers.value).toBe(0)
      expect(insights.summary.avgAttendanceRate.value).toBe("0%")
      expect(insights.summary.totalActiveMembers.deltaText).toBe("+0%")
      expect(insights.summary.totalSevaSessions.deltaText).toBe("+0%")
      expect(insights.eventCategories[0].avgAttendance).toBe(0)
    })
  })

  describe("2. Date Filtering & Comparison Periods", () => {
    it("filters events strictly within primary and compare months", async () => {
      const mockUsers = [
        {
          id: "u_july",
          role: "member",
          createdAt: new Date("2026-01-01"),
          profile: { name: "July User" },
          stats: { points: 100, currentStreak: 4 },
        },
        {
          id: "u_june",
          role: "member",
          createdAt: new Date("2026-01-01"),
          profile: { name: "June User" },
          stats: { points: 50, currentStreak: 2 },
        },
      ]
      const mockEvents = [
        {
          id: "evt_june",
          title: "June Puja",
          eventDate: new Date("2026-06-15T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [{ id: "att_1", userId: "u_june", pointsEarned: 10, scannedAt: new Date("2026-06-15"), badgeActivityId: null }],
        },
        {
          id: "evt_july",
          title: "July Puja",
          eventDate: new Date("2026-07-15T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [
            { id: "att_2", userId: "u_july", pointsEarned: 10, scannedAt: new Date("2026-07-15"), badgeActivityId: null },
            { id: "att_3", userId: "u_june", pointsEarned: 10, scannedAt: new Date("2026-07-15"), badgeActivityId: "badge_seva_1" },
          ],
        },
        {
          id: "evt_august",
          title: "August Puja",
          eventDate: new Date("2026-08-15T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [{ id: "att_4", userId: "u_july", pointsEarned: 10, scannedAt: new Date("2026-08-15"), badgeActivityId: null }],
        },
      ]

      pengurusModels.findUsersForInsights = async () => mockUsers
      pengurusModels.findEventsWithAttendancesForInsights = async () => mockEvents

      const insights = await pengurusServices.getInsights({
        timeUnit: "month",
        primaryYear: 2026,
        primaryMonth: 7,
        compareYear: 2026,
        compareMonth: 6,
        isComparisonEnabled: true,
      })

      // In July: u_july and u_june attended -> 2 active members
      expect(insights.summary.totalActiveMembers.value).toBe(2)
      // In June: u_june attended -> 1 active member. Delta = ((2 - 1) / 1) * 100 = +100%
      expect(insights.summary.totalActiveMembers.deltaText).toBe("+100%")
      // Seva sessions: in July, att_3 has badgeActivityId -> 1 seva session
      expect(insights.summary.totalSevaSessions.value).toBe(1)
      // Retention: u_june was in compare period and also attended in primary -> 1/1 = 100%
      expect(insights.summary.retentionRate.value).toBe("100%")
    })

    it("supports year-level aggregation and trendChartData with 12 months", async () => {
      pengurusModels.findUsersForInsights = async () => [
        {
          id: "u_annual",
          role: "member",
          createdAt: new Date("2025-05-01"),
          profile: { name: "Annual Member" },
          stats: { points: 200, currentStreak: 8 },
        },
      ]
      pengurusModels.findEventsWithAttendancesForInsights = async () => [
        {
          id: "evt_jan",
          title: "Jan Puja",
          eventDate: new Date("2026-01-10T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [{ id: "att_jan", userId: "u_annual", pointsEarned: 10, scannedAt: new Date("2026-01-10"), badgeActivityId: null }],
        },
        {
          id: "evt_dec",
          title: "Dec Puja",
          eventDate: new Date("2026-12-20T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [{ id: "att_dec", userId: "u_annual", pointsEarned: 10, scannedAt: new Date("2026-12-20"), badgeActivityId: null }],
        },
      ]

      const insights = await pengurusServices.getInsights({
        timeUnit: "year",
        primaryYear: 2026,
        selectedPeriods: "2026",
      })

      expect(insights.timeUnit).toBe("year")
      expect(insights.periodLabel).toBe("2026")
      expect(insights.trendChartData.length).toBe(12)
      // Month index 0 (Jan) and 11 (Dec) should have 1 attendance
      expect(insights.trendChartData[0]["2026"]).toBe(1)
      expect(insights.trendChartData[1]["2026"]).toBe(0)
      expect(insights.trendChartData[11]["2026"]).toBe(1)
    })
  })

  describe("3. Segment & Category Filtering", () => {
    it("filters insights by role segment (activist only)", async () => {
      pengurusModels.findUsersForInsights = async () => [
        {
          id: "u_mem",
          role: "member",
          createdAt: new Date("2026-01-01"),
          profile: { name: "Regular Member" },
          stats: { points: 50, currentStreak: 1 },
        },
        {
          id: "u_act",
          role: "activist",
          createdAt: new Date("2026-01-01"),
          profile: { name: "Youth Activist" },
          stats: { points: 150, currentStreak: 6 },
        },
      ]
      pengurusModels.findEventsWithAttendancesForInsights = async () => [
        {
          id: "evt_1",
          title: "Study Group",
          eventDate: new Date("2026-07-05T09:00:00Z"),
          status: "closed",
          type: { code: "dhammasakaccha", label: "Dhamma Discussion", color: "#8B5CF6" },
          attendances: [
            { id: "a1", userId: "u_mem", pointsEarned: 10, scannedAt: new Date("2026-07-05"), badgeActivityId: null },
            { id: "a2", userId: "u_act", pointsEarned: 10, scannedAt: new Date("2026-07-05"), badgeActivityId: null },
          ],
        },
      ]

      const insights = await pengurusServices.getInsights({
        timeUnit: "month",
        primaryYear: 2026,
        primaryMonth: 7,
        segmentFilter: "activist",
      })

      expect(insights.segmentFilter).toBe("activist")
      // Only activist is in target pool: total active member = 1
      expect(insights.summary.totalActiveMembers.value).toBe(1)
    })

    it("filters events by category filter when specified", async () => {
      pengurusModels.findUsersForInsights = async () => [
        {
          id: "u_1",
          role: "member",
          createdAt: new Date("2026-01-01"),
          profile: { name: "Member 1" },
          stats: { points: 50, currentStreak: 1 },
        },
      ]
      pengurusModels.findEventsWithAttendancesForInsights = async () => [
        {
          id: "evt_puja",
          title: "Sunday Puja",
          eventDate: new Date("2026-07-05T09:00:00Z"),
          status: "closed",
          type: { code: "puja_bhakti", label: "Sunday Service", color: "#3B82F6" },
          attendances: [{ id: "a1", userId: "u_1", pointsEarned: 10, scannedAt: new Date("2026-07-05"), badgeActivityId: null }],
        },
        {
          id: "evt_meditation",
          title: "Meditation Night",
          eventDate: new Date("2026-07-10T19:00:00Z"),
          status: "closed",
          type: { code: "meditasi", label: "Meditation Practice", color: "#10B981" },
          attendances: [{ id: "a2", userId: "u_1", pointsEarned: 10, scannedAt: new Date("2026-07-10"), badgeActivityId: null }],
        },
      ]

      const insights = await pengurusServices.getInsights({
        timeUnit: "month",
        primaryYear: 2026,
        primaryMonth: 7,
        eventCategoryFilter: "meditasi",
      })

      expect(insights.eventCategoryFilter).toBe("meditasi")
      const meditationCat = insights.eventCategories.find((c) => c.categoryName.toLowerCase().includes("meditation"))
      expect(meditationCat).toBeDefined()
      expect(meditationCat?.eventCount).toBe(1)
    })
  })
})
