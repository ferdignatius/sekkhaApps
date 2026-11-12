import { describe, it, expect } from "bun:test"
import {
  INACTIVE_RETENTION_YEARS,
  computeRetentionCutoffDate,
  runInactiveAccountRetentionCleanup,
} from "../internal/retention"
import { userModels } from "../models"
import { auditLogger } from "../../../lib/auditLogger"

describe("UU PDP Data Retention & Anonymization (2 Calendar Years)", () => {
  it("computes cutoff date exactly 2 calendar years prior in UTC including leap-day clamping", () => {
    expect(INACTIVE_RETENTION_YEARS).toBe(2)

    const standardNow = new Date("2026-11-12T16:00:00.000Z")
    const standardCutoff = computeRetentionCutoffDate(standardNow)
    expect(standardCutoff.toISOString()).toBe("2024-11-12T16:00:00.000Z")

    const leapNow = new Date("2024-02-29T02:30:00.000Z")
    const leapCutoff = computeRetentionCutoffDate(leapNow)
    expect(leapCutoff.toISOString()).toBe("2022-02-28T02:30:00.000Z")
  })

  it("anonymizes eligible inactive accounts, revokes tokens, logs audit trail, and skips empty batches", async () => {
    const origFind = userModels.findRetentionCandidates
    const origAnonymize = userModels.anonymizeUserForRetention
    const origAudit = auditLogger.log

    const anonymizedCalls: Array<{ userId: string; at: Date }> = []
    const auditEntries: any[] = []
    const revokedUsers: string[] = []
    let findBatchCall = 0

    userModels.findRetentionCandidates = async (cutoffDate: Date, take?: number) => {
      findBatchCall++
      expect(cutoffDate.toISOString()).toBe("2024-11-12T16:00:00.000Z")
      expect(take).toBe(2)
      if (findBatchCall === 1) {
        return [{ id: "usr_inactive_1" }, { id: "usr_inactive_2" }]
      }
      return [{ id: "usr_inactive_3" }]
    }

    userModels.anonymizeUserForRetention = async (userId: string, at?: Date) => {
      anonymizedCalls.push({ userId, at: at! })
      return userId !== "usr_inactive_2"
    }

    auditLogger.log = (entry) => {
      auditEntries.push(entry)
    }

    try {
      const now = new Date("2026-11-12T16:00:00.000Z")
      const summary = await runInactiveAccountRetentionCleanup({
        now,
        batchSize: 2,
        revokeRefreshTokens: async (userId: string) => {
          revokedUsers.push(userId)
        },
      })

      expect(summary.checkedAt).toBe("2026-11-12T16:00:00.000Z")
      expect(summary.cutoffDate).toBe("2024-11-12T16:00:00.000Z")
      expect(summary.anonymizedCount).toBe(2)
      expect(summary.userIds).toEqual(["usr_inactive_1", "usr_inactive_3"])
      expect(revokedUsers).toEqual(["usr_inactive_1", "usr_inactive_3"])
      expect(anonymizedCalls.map((c) => c.userId)).toEqual([
        "usr_inactive_1",
        "usr_inactive_2",
        "usr_inactive_3",
      ])
      expect(auditEntries).toHaveLength(2)
      expect(auditEntries[0].action).toBe("USER_RETENTION_ANONYMIZED")
      expect(auditEntries[0].targetId).toBe("usr_inactive_1")
      expect(auditEntries[0].details.reason).toBe("inactive_over_2_calendar_years")
      expect(auditEntries[0].details.preserved_attendance_aggregates).toBe(true)
    } finally {
      userModels.findRetentionCandidates = origFind
      userModels.anonymizeUserForRetention = origAnonymize
      auditLogger.log = origAudit
    }
  })

  it("returns zero count when no inactive candidates exist", async () => {
    const origFind = userModels.findRetentionCandidates
    userModels.findRetentionCandidates = async () => []

    try {
      const summary = await runInactiveAccountRetentionCleanup({
        now: new Date("2026-11-12T00:00:00.000Z"),
      })
      expect(summary.anonymizedCount).toBe(0)
      expect(summary.userIds).toEqual([])
    } finally {
      userModels.findRetentionCandidates = origFind
    }
  })
})
