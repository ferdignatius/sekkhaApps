import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { homeServices } from "../services"
import { homeModels } from "../models"
import { redis } from "../../../lib/redis"

describe("Home Module — Unit Tests (Dashboard, Events & Stats)", () => {
  const originalFindProfile = homeModels.findProfile
  const originalFindUpcomingEvents = homeModels.findUpcomingEvents
  const originalFindRecentActivity = homeModels.findRecentActivity
  const originalFindAttendanceWeeks = homeModels.findAttendanceWeeks
  const originalFindActiveSeason = homeModels.findActiveSeason

  const originalRedisGet = redis.get
  const originalRedisSet = redis.set

  beforeEach(() => {
    // Default in-memory stubs
    homeModels.findProfile = async (userId: string) => ({
      id: userId,
      username: "buddha_youth",
      email: null,
      role: "member",
      userNumber: BigInt(2026111001),
      profile: { name: "Budi Santoso" },
      stats: { points: 120 },
    }) as any

    homeModels.findUpcomingEvents = async () => []
    homeModels.findRecentActivity = async () => []
    homeModels.findAttendanceWeeks = async () => []
    homeModels.findActiveSeason = async () => null

    // Cache bypass
    redis.get = (async () => null) as any
    redis.set = (async () => "OK") as any
  })

  afterEach(() => {
    homeModels.findProfile = originalFindProfile
    homeModels.findUpcomingEvents = originalFindUpcomingEvents
    homeModels.findRecentActivity = originalFindRecentActivity
    homeModels.findAttendanceWeeks = originalFindAttendanceWeeks
    homeModels.findActiveSeason = originalFindActiveSeason

    redis.get = originalRedisGet
    redis.set = originalRedisSet
  })

  describe("1. User Dashboard & Stats", () => {
    it("returns null if user profile is not found", async () => {
      homeModels.findProfile = async () => null

      const data = await homeServices.getDashboard("usr_missing", "member")
      expect(data).toBeNull()
    })

    it("maps user profile, points, streak, and recent activities correctly", async () => {
      const now = new Date("2026-07-15T10:00:00Z")
      homeModels.findProfile = async () => ({
        id: "usr_1",
        username: "ananda",
        email: null,
        role: "activist",
        userNumber: BigInt(2026071501),
        profile: { name: "Ananda Putra" },
        stats: { points: 250 },
      }) as any

      homeModels.findAttendanceWeeks = async () => [
        { week: new Date("2026-07-13T00:00:00Z"), last_attended: new Date("2026-07-15T09:00:00Z") },
        { week: new Date("2026-07-06T00:00:00Z"), last_attended: new Date("2026-07-08T09:00:00Z") },
      ]

      homeModels.findRecentActivity = async () => [
        {
          eventId: "evt_1",
          method: "qr_scan",
          scannedAt: new Date("2026-07-15T09:00:00Z"),
          event: { title: "Dhammasakaccha", eventDate: new Date("2026-07-15T08:30:00Z") },
        },
      ] as any

      const data = await homeServices.getDashboard("usr_1", "activist")
      expect(data).not.toBeNull()
      expect(data?.profile.name).toBe("Ananda Putra")
      expect(data?.profile.role).toBe("activist")
      expect(data?.profile.points).toBe(250)
      expect(data?.profile.user_number).toBe(BigInt(2026071501))
      expect(data?.streak.last_attended).toBe(new Date("2026-07-15T09:00:00Z").toISOString())
      expect(data?.activities.length).toBe(1)
      expect(data?.activities[0].event_title).toBe("Dhammasakaccha")
      expect(data?.activities[0].method).toBe("qr_scan")
    })
  })

  describe("2. Event Visibility Filtering by Role", () => {
    it("queries events with member target_roles or legacy visibility for member role", async () => {
      let passedWhere: any = null
      homeModels.findUpcomingEvents = async (where: any) => {
        passedWhere = where
        return []
      }

      await homeServices.getDashboard("usr_mem", "member")
      expect(passedWhere).toBeDefined()
      expect(passedWhere.OR).toEqual([
        { targetRoles: { has: "member" } },
        { targetRoles: { isEmpty: true }, visibility: { in: ["all", "member"] } },
      ])
      expect(passedWhere.status.in).toEqual(["scheduled", "active"])
    })

    it("queries events with activist target_roles or legacy visibility for activist role", async () => {
      let passedWhere: any = null
      homeModels.findUpcomingEvents = async (where: any) => {
        passedWhere = where
        return []
      }

      await homeServices.getDashboard("usr_act", "activist")
      expect(passedWhere.OR).toEqual([
        { targetRoles: { has: "activist" } },
        { targetRoles: { isEmpty: true }, visibility: { in: ["all", "activist"] } },
      ])
    })

    it("queries events with all visibility tiers for organizer and admin roles", async () => {
      let passedWhereOrg: any = null
      homeModels.findUpcomingEvents = async (where: any) => {
        passedWhereOrg = where
        return []
      }
      await homeServices.getDashboard("usr_org", "organizer")
      expect(passedWhereOrg.visibility.in).toEqual(["all", "member", "activist", "organizer"])

      let passedWhereAdmin: any = null
      homeModels.findUpcomingEvents = async (where: any) => {
        passedWhereAdmin = where
        return []
      }
      await homeServices.getDashboard("usr_adm", "admin")
      expect(passedWhereAdmin.visibility.in).toEqual(["all", "member", "activist", "organizer"])
    })
  })

  describe("3. Season Information Resolution", () => {
    it("returns active custom season if ongoing", async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      homeModels.findActiveSeason = async () =>
        ({
          id: "custom_season_1",
          name: "Kathina 2026",
          code: "KATHINA-2026",
          startDate,
          endDate: futureDate,
          targetAttendance: 800,
        }) as any

      const data = await homeServices.getDashboard("usr_1", "member")
      expect(data?.season.id).toBe("custom_season_1")
      expect(data?.season.name).toBe("Kathina 2026")
      expect(data?.season.target_attendance).toBe(800)
      expect(data?.season.days_left).toBeGreaterThan(0)
    })

    it("falls back to default semester season when no active custom season exists", async () => {
      homeModels.findActiveSeason = async () => null

      const data = await homeServices.getDashboard("usr_1", "member")
      expect(data?.season).toBeDefined()
      expect(data?.season.code).toMatch(/^S\d{4}-SEM[12]$/)
      expect(data?.season.target_attendance).toBe(500)
    })

    it("coerces user_number back to BigInt when served from Redis cache", async () => {
      let dbProfileCalls = 0
      homeModels.findProfile = async () => {
        dbProfileCalls += 1
        return null
      }
      redis.get = (async () =>
        JSON.stringify({
          profile: {
            id: "usr_cached",
            name: "Cached Member",
            avatar_url: null,
            role: "member",
            user_number: "2026071501",
            points: 180,
          },
          streak: { current_streak: 2, longest_streak: 2, status: "active", last_attended: null },
          season: {
            id: "sem-2026-2",
            name: "Semester 2 · 2026",
            code: "S2026-SEM2",
            start_date: "2026-07-01T00:00:00.000Z",
            end_date: "2026-12-31T23:59:59.999Z",
            target_attendance: 500,
            days_left: 46,
          },
          events: [],
          activities: [],
        })) as any

      const data = await homeServices.getDashboard("usr_cached", "member")
      expect(dbProfileCalls).toBe(0)
      expect(typeof data?.profile.user_number).toBe("bigint")
      expect(data?.profile.user_number).toBe(BigInt(2026071501))
    })
  })
})
