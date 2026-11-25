import { describe, it, expect, setSystemTime, afterEach } from "bun:test"
import { EventEmitter } from "events"
import { eventServices } from "../services"
import { eventModels } from "../models"
import { prisma } from "../../../lib/prisma"
import { redis } from "../../../lib/redis"

describe("Event Closure Point Distribution & Milestone Bonuses", () => {
  it("awards streak_monthly_bonus with daily cap immunity when user is near or at cap", async () => {
    let createdPointTxs: any[] = []
    const updatedStats: any[] = []

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
  afterEach(() => {
    setSystemTime()
  })
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
    setSystemTime(new Date("2026-11-20T18:00:00+07:00"))
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

describe("Event Lifecycle Guards, Concurrency, Cap Anchoring & Cache Invalidation", () => {
  it("blocks closed -> cancel transition with 400 EVENT_CLOSED_IMMUTABLE", async () => {
    const originalTransaction = prisma.$transaction
    let updated = false

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_closed_immutable",
            title: "Finalized Puja",
            eventDate: new Date("2026-08-01T10:00:00Z"),
            status: "closed",
            type: null,
          }),
          update: async () => {
            updated = true
            return {}
          },
        },
      }
      return cb(txMock)
    }

    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_closed_immutable", "cancel")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.code).toBe("EVENT_CLOSED_IMMUTABLE")
      expect(updated).toBe(false)
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it("aborts concurrent double-close cleanly when atomic updateMany claims 0 rows", async () => {
    const originalTransaction = prisma.$transaction
    let distributedPoints = false
    let statsUpserted = false

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_race",
            title: "Concurrent Puja",
            eventDate: new Date("2026-08-10T10:00:00Z"),
            status: "active",
            type: null,
          }),
          updateMany: async () => ({ count: 0 }),
          update: async () => ({}),
        },
        attendance: {
          findMany: async () => [{ id: "att_race", userId: "usr_1", pointsEarned: 50, badgeBonusPoints: 0, scannedAt: new Date() }],
          updateMany: async () => {
            distributedPoints = true
            return { count: 1 }
          },
        },
        pointTransaction: {
          createMany: async () => {
            distributedPoints = true
            return { count: 1 }
          },
        },
        userStats: {
          upsert: async () => {
            statsUpserted = true
            return {}
          },
        },
      }
      return cb(txMock)
    }

    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_race", "closed")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.code).toBe("INVALID_STATUS_TRANSITION")
      expect(distributedPoints).toBe(false)
      expect(statsUpserted).toBe(false)
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it("anchors 150-pt daily cap query to eventDate WIB day and records English transaction description", async () => {
    const eventDate = new Date("2026-01-10T18:00:00Z") // 2026-01-11 01:00 WIB
    let capturedGroupByWhere: any = null
    let createdPointTxs: any[] = []
    const originalTransaction = prisma.$transaction

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_anchor_cap",
            title: "Sunday Dhamma",
            eventDate,
            status: "active",
            type: { id: "type_1", code: "puja" },
          }),
          updateMany: async () => ({ count: 1 }),
          update: async () => ({
            id: "evt_anchor_cap",
            title: "Sunday Dhamma",
            eventDate,
            status: "closed",
            pointReward: 50,
            type: { id: "type_1", code: "puja" },
          }),
        },
        attendance: {
          findMany: async ({ where }: any) => {
            if (where.eventId) {
              return [
                {
                  id: "att_anchor_1",
                  userId: "usr_cap",
                  pointsEarned: 50,
                  badgeBonusPoints: 0,
                  scannedAt: eventDate,
                },
              ]
            }
            return [{ userId: "usr_cap", scannedAt: eventDate }]
          },
          updateMany: async () => ({ count: 1 }),
        },
        pointTransaction: {
          findMany: async () => [],
          groupBy: async (args: any) => {
            capturedGroupByWhere = args.where
            return []
          },
          createMany: async ({ data }: any) => {
            createdPointTxs = data
            return { count: data.length }
          },
        },
        pointRule: { findMany: async () => [] },
        user: {
          findMany: async () => [{ id: "usr_cap", isClaimed: true, stats: { totalAttendances: 1, currentStreak: 1 } }],
        },
        userStats: { upsert: async () => ({}) },
      }
      return cb(txMock)
    }

    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_anchor_cap", "closed")

      // 2026-01-11 00:00:00 WIB = 2026-01-10T17:00:00.000Z
      expect(capturedGroupByWhere.createdAt.gte.toISOString()).toBe("2026-01-10T17:00:00.000Z")
      expect(capturedGroupByWhere.createdAt.lte.toISOString()).toBe("2026-01-11T16:59:59.999Z")

      const attTx = createdPointTxs.find((tx) => tx.type === "attendance")
      expect(attTx.description).toBe("Event Attendance: Sunday Dhamma")
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it("blocks editing cancelled events and rejects invalid rescheduleDate or inactive badge assignment", async () => {
    const origFindById = eventModels.findEventById
    const origFindBasic = eventModels.findEventBasic
    const origFindExistingAtt = eventModels.findExistingAttendance
    const origFindBadge = eventModels.findBadgeActivityById
    const originalTransaction = prisma.$transaction

    try {
      eventModels.findEventById = async () => ({ id: "evt_can", status: "cancel" } as any)
      await expect(
        eventServices.updateEvent("usr_admin", "admin", "evt_can", { title: "Edited" })
      ).rejects.toMatchObject({ status: 400, code: "CANNOT_EDIT_CANCELLED_EVENT" })

      ;(prisma as any).$transaction = async (cb: any) =>
        cb({
          event: {
            findUnique: async () => ({
              id: "evt_sched",
              status: "scheduled",
              eventDate: new Date(Date.now() + 86400000),
              type: null,
            }),
          },
        })

      await expect(
        eventServices.updateEventStatus("usr_admin", "admin", "evt_sched", "active", "not-a-date")
      ).rejects.toMatchObject({ status: 400, code: "INVALID_DATE_FORMAT" })

      eventModels.findEventBasic = async () => ({ id: "evt_act", status: "active" } as any)
      eventModels.findExistingAttendance = async () => ({ id: "att_1", isFinalized: false } as any)
      eventModels.findBadgeActivityById = async () => ({ id: "badge_off", isActive: false, bonusPoints: 30 } as any)

      await expect(
        eventServices.assignBadgeActivity("usr_admin", "evt_act", "usr_1", "badge_off")
      ).rejects.toMatchObject({ status: 400, code: "BADGE_INACTIVE" })
    } finally {
      eventModels.findEventById = origFindById
      eventModels.findEventBasic = origFindBasic
      eventModels.findExistingAttendance = origFindExistingAtt
      eventModels.findBadgeActivityById = origFindBadge
      prisma.$transaction = originalTransaction
    }
  })

  it("caches listEvents & getEventDetail in Redis and invalidates required patterns on deleteAttendance", async () => {
    const origGet = redis.get
    const origSet = redis.set
    const origDel = redis.del
    const origScan = redis.scanStream
    const origFindExpired = eventModels.findExpiredActiveEvents
    const origFindEvents = eventModels.findEvents
    const origFindById = eventModels.findEventById
    const origFindBasic = eventModels.findEventBasic
    const origFindAtt = eventModels.findExistingAttendance
    const origDelAtt = eventModels.deleteAttendance

    const store = new Map<string, string>()
    const scannedPatterns: string[] = []
    let findEventsCalls = 0

    redis.get = (async (key: string) => store.get(key) ?? null) as any
    redis.set = (async (key: string, val: string) => {
      store.set(key, val)
      return "OK"
    }) as any
    redis.del = (async (...keys: string[]) => {
      for (const k of keys) store.delete(k)
      return keys.length
    }) as any
    redis.scanStream = ((opts: { match: string }) => {
      scannedPatterns.push(opts.match)
      const em = new EventEmitter()
      queueMicrotask(() => {
        const prefix = opts.match.replace(/\*$/, "")
        const matched = Array.from(store.keys()).filter((k) => k.startsWith(prefix))
        if (matched.length > 0) em.emit("data", matched)
        em.emit("end")
      })
      return em
    }) as any

    try {
      eventModels.findExpiredActiveEvents = async () => []
      eventModels.findEvents = async () => {
        findEventsCalls += 1
        return [
          {
            id: "evt_cached_1",
            title: "Weekly Chanting",
            description: null,
            location: "Main Hall",
            eventDate: new Date("2027-01-10T09:00:00Z"),
            status: "scheduled",
            visibility: "all",
            pointReward: 50,
            maxLateMinutes: 30,
            latePenaltyPoints: 15,
            _count: { attendances: 0 },
            type: null,
          },
        ] as any
      }

      const firstList = await eventServices.listEvents("member", false, 1, 50)
      const secondList = await eventServices.listEvents("member", false, 1, 50)
      expect(firstList.length).toBe(1)
      expect(secondList[0].id).toBe("evt_cached_1")
      expect(findEventsCalls).toBe(1)

      eventModels.findEventById = async () =>
        ({
          id: "evt_cached_1",
          title: "Weekly Chanting",
          description: null,
          location: "Main Hall",
          eventDate: new Date("2027-01-10T09:00:00Z"),
          status: "scheduled",
          visibility: "all",
          pointReward: 50,
          maxLateMinutes: 30,
          latePenaltyPoints: 15,
          seasonId: null,
          createdAt: new Date("2027-01-01T00:00:00Z"),
          updatedAt: new Date("2027-01-01T00:00:00Z"),
          _count: { attendances: 0 },
          type: null,
        }) as any

      const detail = await eventServices.getEventDetail("evt_cached_1", "member", false)
      expect(detail.id).toBe("evt_cached_1")
      expect(store.has("events:detail:evt_cached_1:member")).toBe(true)

      eventModels.findEventBasic = async () => ({ id: "evt_cached_1", status: "active" } as any)
      eventModels.findExistingAttendance = async () => ({ id: "att_del", isFinalized: false } as any)
      eventModels.deleteAttendance = async () => ({} as any)

      await eventServices.deleteAttendance("usr_admin", "evt_cached_1", "usr_1")

      expect(scannedPatterns).toContain("events:*")
      expect(scannedPatterns).toContain("user:*:home:*")
      expect(scannedPatterns).toContain("user:*:streak")
      expect(scannedPatterns).toContain("pengurus:insight:*")
      expect(store.has("events:detail:evt_cached_1:member")).toBe(false)
    } finally {
      redis.get = origGet
      redis.set = origSet
      redis.del = origDel
      redis.scanStream = origScan
      eventModels.findExpiredActiveEvents = origFindExpired
      eventModels.findEvents = origFindEvents
      eventModels.findEventById = origFindById
      eventModels.findEventBasic = origFindBasic
      eventModels.findExistingAttendance = origFindAtt
      eventModels.deleteAttendance = origDelAtt
    }
  })
})


describe("Admin-Only Reset Closed Event to Draft (Scheduled)", () => {
  it("blocks organizer from resetting a closed event to scheduled with 403 FORBIDDEN", async () => {
    const origTx = prisma.$transaction
    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_closed_1",
            title: "Regular Puja",
            eventDate: new Date("2026-11-20T03:00:00Z"),
            status: "closed",
            type: null,
          }),
        },
      }
      return cb(txMock)
    }

    try {
      await expect(
        eventServices.updateEventStatus("usr_org", "organizer", "evt_closed_1", "scheduled")
      ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" })
    } finally {
      ;(prisma as any).$transaction = origTx
    }
  })

  it("allows admin to reset closed -> scheduled, rolls back points & unfinalizes without altering late/badge, and preserves first-start eventDate on restart", async () => {
    const origTx = prisma.$transaction
    const firstStartDate = new Date("2026-11-20T03:55:00Z")
    let updatedAttData: any = null
    let deletedTxIds: string[] = []
    let updatedUserStats: any = null
    let restartEventUpdateData: any = null

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_closed_2",
            title: "Regular Puja",
            eventDate: firstStartDate,
            status: "closed",
            pointReward: 50,
            type: null,
          }),
          updateMany: async () => ({ count: 1 }),
          update: async ({ data }: any) => ({
            id: "evt_closed_2",
            title: "Regular Puja",
            eventDate: firstStartDate,
            status: data.status,
            pointReward: 50,
            type: null,
          }),
          findMany: async () => [],
        },
        attendance: {
          findMany: async ({ where }: any) => {
            if (where.eventId) {
              return [
                {
                  id: "att_1",
                  userId: "usr_1",
                  isLate: true,
                  badgeActivityId: "ba_mc",
                  badgeBonusPoints: 30,
                  scannedAt: new Date("2026-11-20T04:10:00Z"),
                },
              ]
            }
            return []
          },
          updateMany: async ({ data }: any) => {
            updatedAttData = data
            return { count: 1 }
          },
        },
        pointTransaction: {
          findMany: async ({ where }: any) => {
            if (where?.referenceId?.in?.includes("att_1")) {
              return [{ id: "ptx_att_1", userId: "usr_1", amount: 65, referenceId: "att_1" }]
            }
            if (where?.referenceId?.in?.includes("first_attendance:usr_1")) {
              return [
                {
                  id: "ptx_first_1",
                  userId: "usr_1",
                  amount: 20,
                  referenceId: "first_attendance:usr_1",
                },
              ]
            }
            return []
          },
          deleteMany: async ({ where }: any) => {
            deletedTxIds = where.id.in
            return { count: deletedTxIds.length }
          },
        },
        userStats: {
          findUnique: async () => ({
            userId: "usr_1",
            points: 100,
            totalAttendances: 1,
            currentStreak: 1,
          }),
          update: async ({ data }: any) => {
            updatedUserStats = data
            return data
          },
        },
      }
      return cb(txMock)
    }

    try {
      const res = await eventServices.updateEventStatus(
        "usr_admin",
        "admin",
        "evt_closed_2",
        "scheduled"
      )
      expect(res.status).toBe("scheduled")
      expect(res.event_date).toBe(firstStartDate.toISOString())
      expect(updatedAttData).toEqual({ isFinalized: false })
      expect(deletedTxIds).toEqual(["ptx_att_1", "ptx_first_1"])
      expect(updatedUserStats).toEqual({
        points: 15,
        totalAttendances: 0,
        currentStreak: 0,
        lastActivityAt: null,
      })

      const origNow = Date.now
      Date.now = () => new Date("2026-11-20T08:00:00Z").getTime()
      try {
        ;(prisma as any).$transaction = async (cb: any) => {
          const txRestart = {
            event: {
              findUnique: async () => ({
                id: "evt_closed_2",
                title: "Regular Puja",
                eventDate: firstStartDate,
                status: "scheduled",
                pointReward: 50,
                type: null,
              }),
              update: async ({ data }: any) => {
                restartEventUpdateData = data
                return {
                  id: "evt_closed_2",
                  title: "Regular Puja",
                  eventDate: data.eventDate ?? firstStartDate,
                  status: data.status,
                  pointReward: 50,
                  type: null,
                }
              },
            },
            attendance: {
              count: async () => 1,
            },
          }
          return cb(txRestart)
        }

        const restarted = await eventServices.updateEventStatus(
          "usr_admin",
          "admin",
          "evt_closed_2",
          "active"
        )
        expect(restarted.status).toBe("active")
        expect(restartEventUpdateData.eventDate).toBeUndefined()
        expect(restarted.event_date).toBe(firstStartDate.toISOString())
      } finally {
        Date.now = origNow
      }
    } finally {
      ;(prisma as any).$transaction = origTx
    }
  })

  it("credits points without altering currentStreak or awarding streak bonus when closing an optional event (countsTowardStreak: false)", async () => {
    let createdPointTxs: any[] = []
    const updatedStats: any[] = []

    const eventDate = new Date("2026-04-12T10:00:00Z")
    const origTx = prisma.$transaction

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_optional_1",
            title: "Committee Meeting",
            eventDate,
            status: "active",
            countsTowardStreak: false,
            type: { id: "type_meeting", code: "meeting" },
          }),
          update: async () => ({
            id: "evt_optional_1",
            title: "Committee Meeting",
            eventDate,
            status: "closed",
            countsTowardStreak: false,
          }),
        },
        attendance: {
          findMany: async () => [
            {
              id: "att_opt_1",
              userId: "usr_member_opt",
              pointsEarned: 40,
              badgeBonusPoints: 0,
              scannedAt: new Date("2026-04-12T10:05:00Z"),
            },
          ],
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
              label: "4-Week Attendance Streak",
              points: 50,
              isActive: true,
            },
          ],
        },
        user: {
          findMany: async () => [
            {
              id: "usr_member_opt",
              isClaimed: true,
              stats: {
                totalAttendances: 5,
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
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_optional_1", "closed")

      const attTx = createdPointTxs.find((tx) => tx.type === "attendance")
      expect(attTx).toBeDefined()
      expect(attTx.amount).toBe(40)

      // No streak_monthly_bonus should be awarded for optional events
      expect(createdPointTxs.some((tx) => tx.ruleId === "rule_streak_4w")).toBe(false)

      // userStats.upsert increments points & attendances without touching currentStreak
      const userStat = updatedStats.find((s) => s.where.userId === "usr_member_opt")
      expect(userStat).toBeDefined()
      expect(userStat.update.points.increment).toBe(40)
      expect(userStat.update.totalAttendances.increment).toBe(1)
      expect(userStat.update.currentStreak).toBeUndefined()
    } finally {
      ;(prisma as any).$transaction = origTx
    }
  })
})
