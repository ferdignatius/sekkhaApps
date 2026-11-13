import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import {
  resolveLeaderboardPeriods,
  resolveActiveSeason,
  computeAndCacheLeaderboard,
  getLeaderboardSnapshot,
} from "../services"
import { leaderboardModels } from "../models"
import { redis } from "../../../lib/redis"

describe("Leaderboard Module — Unit Tests", () => {
  const originalFindActiveSeason = leaderboardModels.findActiveSeason
  const originalFindScheduledSeason = leaderboardModels.findScheduledSeason
  const originalDeactivateOtherSeasons = leaderboardModels.deactivateOtherSeasons
  const originalDeactivateAllSeasons = leaderboardModels.deactivateAllSeasons
  const originalActivateSeason = leaderboardModels.activateSeason
  const originalCreateSeason = leaderboardModels.createSeason
  const originalFindLeaderboardUsers = leaderboardModels.findLeaderboardUsers
  const originalFindAttendanceCountsByUser = leaderboardModels.findAttendanceCountsByUser
  const originalCountTotalAttendances = leaderboardModels.countTotalAttendances
  const originalFindPointTotalsByUser = leaderboardModels.findPointTotalsByUser

  const originalRedisGet = redis.get
  const originalRedisSet = redis.set

  beforeEach(() => {
    // Default model mocks: in-memory safe
    leaderboardModels.findActiveSeason = async () => null
    leaderboardModels.findScheduledSeason = async () => null
    leaderboardModels.deactivateOtherSeasons = async () => ({ count: 0 } as any)
    leaderboardModels.deactivateAllSeasons = async () => ({ count: 0 } as any)
    leaderboardModels.activateSeason = async (id: string) => ({ id, isActive: true } as any)
    leaderboardModels.createSeason = async (data: any) => ({ id: "season_created", ...data } as any)
    leaderboardModels.findLeaderboardUsers = async () => []
    leaderboardModels.findAttendanceCountsByUser = async () => []
    leaderboardModels.countTotalAttendances = async () => 0
    leaderboardModels.findPointTotalsByUser = async () => []

    // Ensure redis mock does not hit external network
    redis.get = (async () => null) as any
    redis.set = (async () => "OK") as any
  })

  afterEach(() => {
    leaderboardModels.findActiveSeason = originalFindActiveSeason
    leaderboardModels.findScheduledSeason = originalFindScheduledSeason
    leaderboardModels.deactivateOtherSeasons = originalDeactivateOtherSeasons
    leaderboardModels.deactivateAllSeasons = originalDeactivateAllSeasons
    leaderboardModels.activateSeason = originalActivateSeason
    leaderboardModels.createSeason = originalCreateSeason
    leaderboardModels.findLeaderboardUsers = originalFindLeaderboardUsers
    leaderboardModels.findAttendanceCountsByUser = originalFindAttendanceCountsByUser
    leaderboardModels.countTotalAttendances = originalCountTotalAttendances
    leaderboardModels.findPointTotalsByUser = originalFindPointTotalsByUser

    redis.get = originalRedisGet
    redis.set = originalRedisSet
  })

  describe("1. Period Resolution & Switchover", () => {
    it("resolves semester 1 for dates between January and June", async () => {
      // 15 March 2026 -> Sem 1
      const marchDate = new Date(2026, 2, 15, 10, 0, 0)
      const { periods, activeCustom } = await resolveLeaderboardPeriods(marchDate)

      expect(activeCustom).toBeNull()
      expect(periods.length).toBe(2)

      const semester = periods.find((p) => p.key === "semester")!
      expect(semester).toBeDefined()
      expect(semester.id).toBe("sem-2026-1")
      expect(semester.code).toBe("S2026-SEM1")
      expect(semester.name).toBe("Semester 1 · 2026")
      expect(semester.is_active).toBe(true)
      expect(new Date(semester.start_date).getMonth()).toBe(0) // January
      expect(new Date(semester.end_date).getMonth()).toBe(5) // June
    })

    it("resolves semester 2 switchover for dates from July to December", async () => {
      // 1 July 2026 switchover boundary
      const julyBoundary = new Date(2026, 6, 1, 0, 0, 0)
      const { periods } = await resolveLeaderboardPeriods(julyBoundary)

      const semester = periods.find((p) => p.key === "semester")!
      expect(semester).toBeDefined()
      expect(semester.id).toBe("sem-2026-2")
      expect(semester.code).toBe("S2026-SEM2")
      expect(semester.name).toBe("Semester 2 · 2026")
      expect(new Date(semester.start_date).getMonth()).toBe(6) // July
      expect(new Date(semester.end_date).getMonth()).toBe(11) // December
    })

    it("resolves annual period boundaries covering the entire calendar year", async () => {
      const midYear = new Date(2026, 7, 20)
      const { periods } = await resolveLeaderboardPeriods(midYear)

      const annual = periods.find((p) => p.key === "annual")!
      expect(annual).toBeDefined()
      expect(annual.id).toBe("annual-2026")
      expect(annual.code).toBe("S2026-ANNUAL")
      expect(annual.is_active).toBe(false)

      const start = new Date(annual.start_date)
      const end = new Date(annual.end_date)
      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(0)
      expect(start.getDate()).toBe(1)
      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(11)
      expect(end.getDate()).toBe(31)
    })

    it("prepends active custom season with dynamic tab priority [custom, semester, annual]", async () => {
      const now = new Date(2026, 3, 10)
      leaderboardModels.findActiveSeason = async () =>
        ({
          id: "season_custom_1",
          name: "Vassa Retreat 2026",
          code: "VASSA-2026",
          startDate: new Date(2026, 3, 1),
          endDate: new Date(2026, 4, 30),
          isActive: true,
          targetAttendance: 300,
          description: "Special retreat season",
        }) as any

      const { periods, activeCustom } = await resolveLeaderboardPeriods(now)
      expect(activeCustom).not.toBeNull()
      expect(activeCustom.id).toBe("season_custom_1")
      expect(periods.length).toBe(3)
      expect(periods[0].key).toBe("custom")
      expect(periods[0].id).toBe("season_custom_1")
      expect(periods[0].is_active).toBe(true)
      expect(periods[1].key).toBe("semester")
      expect(periods[1].is_active).toBe(false)
      expect(periods[2].key).toBe("annual")
    })

    it("gracefully deactivates expired custom season when endDate < now", async () => {
      let deactivated = false
      leaderboardModels.findActiveSeason = async () =>
        ({
          id: "season_expired",
          name: "Old Season",
          code: "OLD-2025",
          startDate: new Date(2025, 0, 1),
          endDate: new Date(2025, 5, 30),
          isActive: true,
          targetAttendance: 100,
        }) as any
      leaderboardModels.deactivateAllSeasons = async () => {
        deactivated = true
        return { count: 1 } as any
      }

      const now = new Date(2026, 0, 1)
      const { periods, activeCustom } = await resolveLeaderboardPeriods(now)
      expect(activeCustom).toBeNull()
      expect(periods.some((p) => p.key === "custom")).toBe(false)
      expect(deactivated).toBe(true)
    })
  })

  describe("2. Season Auto-Activation & Fallback Creation", () => {
    it("returns active season directly if ongoing", async () => {
      const now = new Date(2026, 2, 1)
      const ongoingSeason = {
        id: "season_active",
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 5, 30),
        isActive: true,
      }
      leaderboardModels.findActiveSeason = async () => ongoingSeason as any

      const res = await resolveActiveSeason(now)
      expect(res.id).toBe("season_active")
    })

    it("activates scheduled season if current active is expired", async () => {
      const now = new Date(2026, 3, 5)
      leaderboardModels.findActiveSeason = async () => null
      leaderboardModels.findScheduledSeason = async () =>
        ({
          id: "season_scheduled_q2",
          startDate: new Date(2026, 3, 1),
          endDate: new Date(2026, 5, 30),
        }) as any

      let activatedId = ""
      leaderboardModels.activateSeason = async (id: string) => {
        activatedId = id
        return { id, isActive: true } as any
      }

      const res = await resolveActiveSeason(now)
      expect(activatedId).toBe("season_scheduled_q2")
      expect(res.id).toBe("season_scheduled_q2")
    })

    it("auto-creates quarterly season if no active or scheduled season exists", async () => {
      const now = new Date(2026, 7, 15) // August -> Q3
      leaderboardModels.findActiveSeason = async () => null
      leaderboardModels.findScheduledSeason = async () => null

      let createdData: any = null
      leaderboardModels.createSeason = async (data: any) => {
        createdData = data
        return { id: "season_auto_created", ...data } as any
      }

      const res = await resolveActiveSeason(now)
      expect(res.id).toBe("season_auto_created")
      expect(createdData.code).toBe("S2026-Q3")
      expect(createdData.name).toBe("Season 3 · 2026")
      expect(createdData.isActive).toBe(true)
    })
  })

  describe("3. Aggregation, Tie-Breakers & Zero State Handling", () => {
    it("handles users with 0 points and 0 attendances without NaN or crash", async () => {
      leaderboardModels.findLeaderboardUsers = async () => [
        {
          id: "u_zero",
          username: "novice_member",
          role: "member",
          profile: { name: "Novice Member" },
          stats: { points: 0, currentStreak: 0, totalAttendances: 0 },
        },
      ]
      leaderboardModels.findAttendanceCountsByUser = async () => []
      leaderboardModels.countTotalAttendances = async () => 0
      leaderboardModels.findPointTotalsByUser = async () => []

      await computeAndCacheLeaderboard()
      const snapshot = await getLeaderboardSnapshot("points")

      expect(snapshot.entries.length).toBe(1)
      expect(snapshot.entries[0].user_id).toBe("u_zero")
      expect(snapshot.entries[0].value).toBe(0)
      expect(snapshot.entries[0].attendances_count).toBe(0)
      expect(snapshot.entries[0].rank).toBe(1)
      expect(snapshot.community_total).toBe(0)
    })

    it("ranks users by value descending and assigns sequential ranks for tie scores", async () => {
      leaderboardModels.findLeaderboardUsers = async () => [
        {
          id: "u_1",
          username: "ananda",
          role: "member",
          profile: { name: "Ananda Thera" },
          stats: { points: 150, currentStreak: 2, totalAttendances: 5 },
        },
        {
          id: "u_2",
          username: "sariputta",
          role: "organizer",
          profile: { name: "Sariputta Thera" },
          stats: { points: 300, currentStreak: 5, totalAttendances: 10 },
        },
        {
          id: "u_3",
          username: "moggallana",
          role: "activist",
          profile: { name: "Moggallana Thera" },
          stats: { points: 300, currentStreak: 4, totalAttendances: 9 },
        },
      ]
      leaderboardModels.findPointTotalsByUser = async () => [
        { userId: "u_1", _sum: { amount: 150 } },
        { userId: "u_2", _sum: { amount: 300 } },
        { userId: "u_3", _sum: { amount: 300 } },
      ] as any

      await computeAndCacheLeaderboard()
      const snapshot = await getLeaderboardSnapshot("points")

      expect(snapshot.entries.length).toBe(3)
      // Top two share 300 points, ranked sequentially 1 and 2
      expect(snapshot.entries[0].value).toBe(300)
      expect(snapshot.entries[0].rank).toBe(1)
      expect(snapshot.entries[1].value).toBe(300)
      expect(snapshot.entries[1].rank).toBe(2)
      // Third place
      expect(snapshot.entries[2].value).toBe(150)
      expect(snapshot.entries[2].rank).toBe(3)
    })

    it("evaluates metric types (points, streak, attendance) using appropriate data sources", async () => {
      leaderboardModels.findLeaderboardUsers = async () => [
        {
          id: "u_high_streak",
          username: "streak_master",
          role: "member",
          profile: { name: "Streak Master" },
          stats: { points: 50, currentStreak: 12, totalAttendances: 2 },
        },
        {
          id: "u_high_points",
          username: "points_master",
          role: "member",
          profile: { name: "Points Master" },
          stats: { points: 500, currentStreak: 1, totalAttendances: 1 },
        },
      ]
      leaderboardModels.findPointTotalsByUser = async () => [
        { userId: "u_high_streak", _sum: { amount: 50 } },
        { userId: "u_high_points", _sum: { amount: 500 } },
      ] as any
      leaderboardModels.findAttendanceCountsByUser = async () => [
        { userId: "u_high_streak", _count: { _all: 8 } },
        { userId: "u_high_points", _count: { _all: 4 } },
      ] as any

      await computeAndCacheLeaderboard()

      const streakSnapshot = await getLeaderboardSnapshot("streak")
      expect(streakSnapshot.entries[0].user_id).toBe("u_high_streak")
      expect(streakSnapshot.entries[0].value).toBe(12)

      const pointsSnapshot = await getLeaderboardSnapshot("points")
      expect(pointsSnapshot.entries[0].user_id).toBe("u_high_points")
      expect(pointsSnapshot.entries[0].value).toBe(500)

      const attendanceSnapshot = await getLeaderboardSnapshot("attendance")
      expect(attendanceSnapshot.entries[0].user_id).toBe("u_high_streak")
      expect(attendanceSnapshot.entries[0].value).toBe(8)
    })
  })

  describe("4. Cache Miss, Redis Down & In-Memory Fallback", () => {
    it("falls back to in-memory cache and recomputation when Redis throws", async () => {
      // Simulate Redis being completely offline / throwing error
      redis.get = (async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:6379")
      }) as any
      redis.set = (async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:6379")
      }) as any

      leaderboardModels.findLeaderboardUsers = async () => [
        {
          id: "u_fallback",
          username: "fallback_user",
          role: "member",
          profile: { name: "Fallback User" },
          stats: { points: 80, currentStreak: 3, totalAttendances: 4 },
        },
      ]
      leaderboardModels.findPointTotalsByUser = async () => [
        { userId: "u_fallback", _sum: { amount: 80 } },
      ] as any

      const snapshot = await getLeaderboardSnapshot("points", undefined, true)
      expect(snapshot).toBeDefined()
      expect(snapshot.entries.length).toBe(1)
      expect(snapshot.entries[0].user_id).toBe("u_fallback")
      expect(snapshot.entries[0].value).toBe(80)
    })

    it("serves cached snapshot from Redis if present and fresh", async () => {
      const origStatus = (redis as any).status
      ;(redis as any).status = "ready"
      try {
        const now = new Date()
        const { periods } = await resolveLeaderboardPeriods(now)
        const targetPeriod = periods[0]

        const mockSnapshot = {
          entries: [
            {
              user_id: "u_cached",
              username: "cached_hero",
              name: "Cached Hero",
              initials: "CH",
              rank: 1,
              value: 999,
              attendances_count: 20,
              avatar_url: null,
              role: "member",
            },
          ],
          community_total: 20,
          season: {
            id: targetPeriod.id,
            name: targetPeriod.name,
            code: targetPeriod.code,
            start_date: targetPeriod.start_date,
            end_date: targetPeriod.end_date,
            days_left: targetPeriod.days_left,
            target_attendance: targetPeriod.target_attendance,
          },
          available_periods: [],
          active_period: targetPeriod,
          calculated_at: new Date().toISOString(),
        }

        redis.get = (async () => JSON.stringify(mockSnapshot)) as any

        let dbCalled = false
        leaderboardModels.findLeaderboardUsers = async () => {
          dbCalled = true
          return []
        }

        const snapshot = await getLeaderboardSnapshot("points", targetPeriod.id)
        expect(snapshot.entries[0].username).toBe("cached_hero")
        expect(snapshot.entries[0].value).toBe(999)
        expect(dbCalled).toBe(false)
      } finally {
        ;(redis as any).status = origStatus
      }
    })
  })
})
