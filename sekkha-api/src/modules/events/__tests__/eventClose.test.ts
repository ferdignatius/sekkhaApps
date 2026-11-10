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

  it("awards catch-up streak milestones if batch closing causes streak to skip multiples of 4", async () => {
    let createdPointTxs: any[] = []

    const eventDate = new Date("2026-03-22T10:00:00Z")
    const originalTransaction = prisma.$transaction

    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_batch_close",
            title: "Sunday Puja Week 8",
            eventDate,
            status: "active",
            type: { id: "type_1", code: "regular_puja" },
          }),
          update: async () => ({
            id: "evt_batch_close",
            title: "Sunday Puja Week 8",
            eventDate,
            status: "closed",
          }),
        },
        attendance: {
          findMany: async ({ where }: any) => {
            if (where.eventId) {
              return [
                {
                  id: "att_batch",
                  userId: "usr_batch",
                  pointsEarned: 20,
                  badgeBonusPoints: 0,
                  scannedAt: eventDate,
                },
              ]
            }
            // 8 weeks of attendances
            return Array.from({ length: 8 }, (_, i) => ({
              userId: "usr_batch",
              scannedAt: new Date(eventDate.getTime() - (7 - i) * 7 * 86400000),
            }))
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
              label: "4-Week Attendance Streak",
              points: 50,
              isActive: true,
            },
          ],
        },
        user: {
          findMany: async () => [
            {
              id: "usr_batch",
              isClaimed: true,
              stats: {
                totalAttendances: 0,
                currentStreak: 2, // previous recorded streak was 2
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
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_batch_close", "closed")

      // Streak jumped from 2 to 8 -> milestones for 4 weeks and 8 weeks must both be generated
      const streakTxs = createdPointTxs.filter((tx) => tx.ruleId === "rule_streak_4w")
      expect(streakTxs.length).toBe(2)
      expect(streakTxs[0].referenceId).toContain("streak_4w:usr_batch")
      expect(streakTxs[1].referenceId).toContain("streak_8w:usr_batch")
      expect(streakTxs[0].amount).toBe(50)
      expect(streakTxs[1].amount).toBe(50)
    } finally {
      prisma.$transaction = originalTransaction
    }
  })
})
