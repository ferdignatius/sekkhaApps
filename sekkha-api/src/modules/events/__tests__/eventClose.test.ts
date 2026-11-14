import { describe, it, expect } from "bun:test"
import { eventServices } from "../services"
import { eventModels } from "../models"
import { prisma } from "../../../lib/prisma"

describe("Event Closure Point Distribution & Milestone Bonuses", () => {
  it("awards streak_monthly_bonus with daily cap immunity when user is near or at cap", async () => {
    let createdPointTxs: any[] = []
    let updatedStats: any[] = []

    const eventDate = new Date("2026-02-22T10:00:00Z")
    const originalTransaction = prisma.$transaction

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_active_1",
            title: "Sunday Puja",
            eventDate,
            status: "active",
            type: { id: "type_1", code: "regular_puja" },
          }),
          update: async () => ({
            id: "evt_active_1",
            title: "Sunday Puja",
            eventDate,
            status: "closed",
          }),
        },
        attendance: {
          findMany: async ({ where }: any) => {
            if (where.eventId) {
              return [
                {
                  id: "att_1",
                  userId: "usr_active_member",
                  pointsEarned: 30,
                  badgeBonusPoints: 0,
                  scannedAt: new Date("2026-02-22T09:30:00Z"),
                },
              ]
            }
            // finalized attendances for streak calculation (4 consecutive weeks)
            return [
              { userId: "usr_active_member", scannedAt: new Date("2026-02-01T09:00:00Z") },
              { userId: "usr_active_member", scannedAt: new Date("2026-02-08T09:00:00Z") },
              { userId: "usr_active_member", scannedAt: new Date("2026-02-15T09:00:00Z") },
              { userId: "usr_active_member", scannedAt: new Date("2026-02-22T09:30:00Z") },
            ]
          },
          updateMany: async () => ({ count: 1 }),
        },
        pointTransaction: {
          findMany: async () => [],
          groupBy: async () => [
            {
              userId: "usr_active_member",
              _sum: { amount: 140 }, // Already earned 140 points today (cap is 150)
            },
          ],
          createMany: async ({ data }: any) => {
            createdPointTxs = data
            return { count: data.length }
          },
        },
        pointRule: {
          findMany: async () => [
            {
              id: "rule_streak_4w",
              code: "streak_monthly_bonus",
              label: "4-Week Attendance Streak",
              points: 50,
              isActive: true,
            },
          ],
        },
        user: {
          findMany: async () => [
            {
              id: "usr_active_member",
              isClaimed: true,
              stats: {
                totalAttendances: 3,
                currentStreak: 3,
              },
            },
          ],
        },
        userStats: {
          upsert: async (payload: any) => {
            updatedStats.push(payload)
            return payload
          },
        },
        memberPointSummary: {
          upsert: async () => ({}),
        },
      }
      return cb(txMock)
    }

    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_active_1", "closed")

      // 1. Attendance point clamped to remaining cap (150 - 140 = 10)
      const attTx = createdPointTxs.find((tx) => tx.type === "attendance")
      expect(attTx).toBeDefined()
      expect(attTx.amount).toBe(10)

      // 2. Streak bonus must be awarded in FULL (50 points), immune to daily cap
      const streakTx = createdPointTxs.find((tx) => tx.ruleId === "rule_streak_4w")
      expect(streakTx).toBeDefined()
      expect(streakTx.amount).toBe(50)
      expect(streakTx.type).toBe("system")

      // 3. User stats gets total points: 10 + 50 = 60, currentStreak: 4
      const userStat = updatedStats.find((s) => s.where.userId === "usr_active_member")
      expect(userStat).toBeDefined()
      expect(userStat.update.points.increment).toBe(60)
      expect(userStat.update.currentStreak).toBe(4)
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it("denies streak_monthly_bonus when the calendar month has fewer than 3 active weeks", async () => {
    let createdPointTxs: any[] = []

    const eventDate = new Date("2026-03-22T10:00:00Z")
    const originalTransaction = prisma.$transaction

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_short_month",
            title: "Sunday Puja Late March",
            eventDate,
            status: "active",
            type: { id: "type_1", code: "regular_puja" },
          }),
          findMany: async () => [
            { id: "evt_m1", eventDate: new Date("2026-03-08T10:00:00Z"), status: "closed" },
            { id: "evt_short_month", eventDate, status: "closed" },
          ],
          update: async () => ({
            id: "evt_short_month",
            title: "Sunday Puja Late March",
            eventDate,
            status: "closed",
          }),
        },
        attendance: {
          findMany: async ({ where }: any) => {
            if (where.eventId) {
              return [
                {
                  id: "att_short",
                  userId: "usr_short",
                  pointsEarned: 20,
                  badgeBonusPoints: 0,
                  scannedAt: eventDate,
                },
              ]
            }
            // Only 2 active weeks in March 2026
            return [
              { userId: "usr_short", scannedAt: new Date("2026-03-08T09:00:00Z") },
              { userId: "usr_short", scannedAt: eventDate },
            ]
          },
          updateMany: async () => ({ count: 1 }),
        },
        pointTransaction: {
          findMany: async () => [],
          groupBy: async () => [],
          createMany: async ({ data }: any) => {
            createdPointTxs = data
            return { count: data.length }
          },
        },
        pointRule: {
          findMany: async () => [
            {
              id: "rule_streak_4w",
              code: "streak_monthly_bonus",
              label: "Perfect Month Attendance",
              points: 50,
              isActive: true,
            },
          ],
        },
        user: {
          findMany: async () => [
            {
              id: "usr_short",
              isClaimed: true,
              stats: {
                totalAttendances: 1,
                currentStreak: 1,
              },
            },
          ],
        },
        userStats: {
          upsert: async () => ({}),
        },
        memberPointSummary: {
          upsert: async () => ({}),
        },
      }
      return cb(txMock)
    }

    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_short_month", "closed")

      const streakTxs = createdPointTxs.filter((tx) => tx.ruleId === "rule_streak_4w")
      expect(streakTxs.length).toBe(0)
    } finally {
      prisma.$transaction = originalTransaction
    }
  })
})

describe("Event Start & Late Attendance Policy", () => {
  it("anchors eventDate to actual start time even when started later on the same day, so immediate scans are on time", async () => {
    const now = Date.now()
    // Scheduled 4 hours earlier today (e.g., 09:00 when started at 13:00 in WIB, safely same WIB day or handle timezone safely)
    // Pick a time 4 hours ago only if still same UTC/WIB calendar day, or construct 02:00 UTC (09:00 WIB) -> wait, unit test runs regardless of clock!
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
    const wibNow = new Date(now + WIB_OFFSET_MS)
    const startOfWibDayUtc =
      Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate(), 0, 0, 0, 0) -
      WIB_OFFSET_MS
    const scheduledSameWibDayEarlier = new Date(
      Math.max(startOfWibDayUtc, now - 4 * 60 * 60 * 1000)
    )

    let persistedEventDate: Date | null = null
    const originalTransaction = prisma.$transaction

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_late_start",
            title: "Morning Puja Started Afternoon",
            eventDate: scheduledSameWibDayEarlier,
            status: "scheduled",
            pointReward: 50,
            maxLateMinutes: 15,
            latePenaltyPoints: 15,
            type: { id: "type_1", code: "regular_puja" },
          }),
          update: async ({ data }: any) => {
            persistedEventDate = data.eventDate ?? scheduledSameWibDayEarlier
            return {
              id: "evt_late_start",
              title: "Morning Puja Started Afternoon",
              eventDate: persistedEventDate,
              status: data.status,
              type: { id: "type_1", code: "regular_puja" },
            }
          },
        },
      }
      return cb(txMock)
    }

    const origFindEventBasic = eventModels.findEventBasic
    const origFindUserForAttendance = eventModels.findUserForAttendance
    const origFindExistingAttendance = eventModels.findExistingAttendance
    const origCreateAttendance = eventModels.createAttendance

    try {
      const started = await eventServices.updateEventStatus(
        "usr_admin",
        "admin",
        "evt_late_start",
        "active"
      )

      expect(started.status).toBe("active")
      expect(persistedEventDate).not.toBeNull()
      // eventDate must be anchored near actual start time (now), not left at earlier scheduled time
      expect(Math.abs(persistedEventDate!.getTime() - Date.now())).toBeLessThan(5000)

      eventModels.findEventBasic = async () =>
        ({
          id: "evt_late_start",
          title: "Morning Puja Started Afternoon",
          eventDate: persistedEventDate!,
          pointReward: 50,
          maxLateMinutes: 15,
          latePenaltyPoints: 15,
          status: "active",
          type: { code: "regular_puja", label: "Regular Puja", defaultPointReward: 50 },
        }) as any

      eventModels.findUserForAttendance = async () =>
        ({
          id: "usr_member_1",
          userNumber: 2026111401n,
          role: "member",
          profile: { name: "Hendra", school: { name: "Umum" } },
        }) as any

      eventModels.findExistingAttendance = async () => null
      eventModels.createAttendance = async (data) =>
        ({
          id: "att_new_1",
          ...data,
          scannedAt: new Date(),
          badgeActivity: null,
        }) as any

      const scanRes = await eventServices.recordAttendance(
        "usr_admin",
        "evt_late_start",
        "2026111401",
        "qr"
      )

      expect(scanRes.is_late).toBe(false)
      expect(scanRes.late_penalty_applied).toBe(0)
      expect(scanRes.points_earned).toBe(50)
    } finally {
      prisma.$transaction = originalTransaction
      eventModels.findEventBasic = origFindEventBasic
      eventModels.findUserForAttendance = origFindUserForAttendance
      eventModels.findExistingAttendance = origFindExistingAttendance
      eventModels.createAttendance = origCreateAttendance
    }
  })

  it("never marks is_late or applies penalty when late_penalty_points is 0, even 10 hours after start", async () => {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000)
    const origFindEventBasic = eventModels.findEventBasic
    const origFindUserForAttendance = eventModels.findUserForAttendance
    const origFindExistingAttendance = eventModels.findExistingAttendance
    const origCreateAttendance = eventModels.createAttendance

    try {
      eventModels.findEventBasic = async () =>
        ({
          id: "evt_no_penalty",
          title: "Open Workshop",
          eventDate: tenHoursAgo,
          pointReward: 50,
          maxLateMinutes: 0,
          latePenaltyPoints: 0,
          status: "active",
          type: { code: "workshop", label: "Workshop", defaultPointReward: 50 },
        }) as any

      eventModels.findUserForAttendance = async () =>
        ({
          id: "usr_member_2",
          userNumber: 2026111402n,
          role: "member",
          profile: { name: "Sari", school: { name: "Umum" } },
        }) as any

      eventModels.findExistingAttendance = async () => null
      eventModels.createAttendance = async (data) =>
        ({
          id: "att_no_penalty",
          ...data,
          scannedAt: new Date(),
          badgeActivity: null,
        }) as any

      const res = await eventServices.recordAttendance(
        "usr_admin",
        "evt_no_penalty",
        "2026111402",
        "qr"
      )

      expect(res.is_late).toBe(false)
      expect(res.late_penalty_applied).toBe(0)
      expect(res.points_earned).toBe(50)
    } finally {
      eventModels.findEventBasic = origFindEventBasic
      eventModels.findUserForAttendance = origFindUserForAttendance
      eventModels.findExistingAttendance = origFindExistingAttendance
      eventModels.createAttendance = origCreateAttendance
    }
  })

  it("marks is_late and deducts late_penalty_points when late_penalty_points > 0 and grace period exceeded", async () => {
    const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000)
    const origFindEventBasic = eventModels.findEventBasic
    const origFindUserForAttendance = eventModels.findUserForAttendance
    const origFindExistingAttendance = eventModels.findExistingAttendance
    const origCreateAttendance = eventModels.createAttendance

    try {
      eventModels.findEventBasic = async () =>
        ({
          id: "evt_with_penalty",
          title: "Evening Puja",
          eventDate: fortyMinutesAgo,
          pointReward: 50,
          maxLateMinutes: 15,
          latePenaltyPoints: 15,
          status: "active",
          type: { code: "puja", label: "Puja", defaultPointReward: 50 },
        }) as any

      eventModels.findUserForAttendance = async () =>
        ({
          id: "usr_member_3",
          userNumber: 2026111403n,
          role: "member",
          profile: { name: "Budi", school: { name: "Umum" } },
        }) as any

      eventModels.findExistingAttendance = async () => null
      eventModels.createAttendance = async (data) =>
        ({
          id: "att_late_1",
          ...data,
          scannedAt: new Date(),
          badgeActivity: null,
        }) as any

      const res = await eventServices.recordAttendance(
        "usr_admin",
        "evt_with_penalty",
        "2026111403",
        "qr"
      )

      expect(res.is_late).toBe(true)
      expect(res.late_penalty_applied).toBe(15)
      expect(res.points_earned).toBe(35)
    } finally {
      eventModels.findEventBasic = origFindEventBasic
      eventModels.findUserForAttendance = origFindUserForAttendance
      eventModels.findExistingAttendance = origFindExistingAttendance
      eventModels.createAttendance = origCreateAttendance
    }
  })

  it("auto-closes active events when current date > start event_date via autoCloseExpiredActiveEvents and getEventDetail", async () => {
    const yesterdayDate = new Date(Date.now() - 26 * 60 * 60 * 1000)
    const originalTransaction = prisma.$transaction
    const origFindExpired = eventModels.findExpiredActiveEvents
    const origFindById = eventModels.findEventById
    let updatedToStatus: string | null = null

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_expired_active",
            title: "Yesterday Puja",
            eventDate: yesterdayDate,
            status: "active",
            pointReward: 50,
            type: { id: "type_1", code: "regular_puja" },
          }),
          update: async ({ data }: any) => {
            updatedToStatus = data.status
            return {
              id: "evt_expired_active",
              title: "Yesterday Puja",
              eventDate: yesterdayDate,
              status: data.status,
              type: { id: "type_1", code: "regular_puja" },
            }
          },
        },
        attendance: {
          findMany: async () => [],
        },
      }
      return cb(txMock)
    }

    try {
      // 1) Batch auto-close helper
      eventModels.findExpiredActiveEvents = async () => [
        { id: "evt_expired_active", eventDate: yesterdayDate },
      ]

      const summary = await eventServices.autoCloseExpiredActiveEvents()
      expect(summary.closedCount).toBe(1)
      expect(summary.closedEventIds).toEqual(["evt_expired_active"])
      expect(updatedToStatus).toBe("closed")

      // 2) Lazy auto-close on getEventDetail
      updatedToStatus = null
      eventModels.findEventById = async () =>
        ({
          id: "evt_expired_active",
          title: "Yesterday Puja",
          description: null,
          location: "Main Hall",
          eventDate: yesterdayDate,
          status: "active",
          visibility: "all",
          pointReward: 50,
          maxLateMinutes: 15,
          latePenaltyPoints: 15,
          seasonId: null,
          createdAt: yesterdayDate,
          updatedAt: yesterdayDate,
          type: null,
          season: null,
          _count: { attendances: 0 },
        }) as any

      const detail = await eventServices.getEventDetail("evt_expired_active", "admin", true)
      expect(detail.status).toBe("closed")
      expect(updatedToStatus).toBe("closed")
    } finally {
      prisma.$transaction = originalTransaction
      eventModels.findExpiredActiveEvents = origFindExpired
      eventModels.findEventById = origFindById
    }
  })

  it("auto-closes active event and rejects attendance scan with 400 EVENT_NOT_ACTIVE when current date > start event_date", async () => {
    const yesterdayDate = new Date(Date.now() - 26 * 60 * 60 * 1000)
    const originalTransaction = prisma.$transaction
    const origFindBasic = eventModels.findEventBasic
    let closedInTx = false

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_expired_scan",
            title: "Yesterday Puja",
            eventDate: yesterdayDate,
            status: "active",
            pointReward: 50,
            type: { id: "type_1", code: "regular_puja" },
          }),
          update: async ({ data }: any) => {
            if (data.status === "closed") closedInTx = true
            return {
              id: "evt_expired_scan",
              title: "Yesterday Puja",
              eventDate: yesterdayDate,
              status: data.status,
              type: { id: "type_1", code: "regular_puja" },
            }
          },
        },
        attendance: {
          findMany: async () => [],
        },
      }
      return cb(txMock)
    }

    eventModels.findEventBasic = async () =>
      ({
        id: "evt_expired_scan",
        title: "Yesterday Puja",
        eventDate: yesterdayDate,
        pointReward: 50,
        maxLateMinutes: 15,
        latePenaltyPoints: 15,
        status: "active",
        type: { code: "regular_puja", label: "Regular Puja", defaultPointReward: 50 },
      }) as any

    try {
      await eventServices.recordAttendance("usr_admin", "evt_expired_scan", "2026111401", "qr")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(closedInTx).toBe(true)
      expect(err.status || err.statusCode).toBe(400)
      expect(err.code).toBe("EVENT_NOT_ACTIVE")
    } finally {
      prisma.$transaction = originalTransaction
      eventModels.findEventBasic = origFindBasic
    }
  })
})
