import { describe, it, expect } from "bun:test"
import { eventServices } from "../services"
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
