import { userModels } from "../models"
import { revokeAllUserRefreshTokens } from "../../auth"
import { invalidate, invalidatePattern, CacheKeys } from "../../../lib/cache"
import { auditLogger } from "../../../lib/auditLogger"

export const INACTIVE_RETENTION_YEARS = 2
export const ANONYMIZED_DISPLAY_NAME = "Former Member"

/**
 * Computes the UTC cutoff timestamp `years` calendar years before `now`.
 * Clamps leap-day dates (Feb 29 -> Feb 28) cleanly when the target year is non-leap.
 */
export function computeRetentionCutoffDate(
  now: Date = new Date(),
  years: number = INACTIVE_RETENTION_YEARS
): Date {
  const targetYear = now.getUTCFullYear() - years
  const targetMonth = now.getUTCMonth()
  const maxDayInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(now.getUTCDate(), maxDayInMonth)

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    )
  )
}

export interface RetentionCleanupSummary {
  checkedAt: string
  cutoffDate: string
  anonymizedCount: number
  userIds: string[]
}

/**
 * Permanently anonymizes direct personal identifiers on accounts inactive for more than
 * 2 consecutive calendar years (UU PDP No. 27/2022 Articles 43 & 44), while retaining
 * non-attributable Attendance rows for aggregate community archives and annual reporting.
 */
export async function runInactiveAccountRetentionCleanup(options?: {
  now?: Date
  batchSize?: number
  maxBatches?: number
  revokeRefreshTokens?: (userId: string) => Promise<void>
}): Promise<RetentionCleanupSummary> {
  const now = options?.now ?? new Date()
  const batchSize = Math.min(Math.max(options?.batchSize ?? 100, 1), 500)
  const maxBatches = Math.max(options?.maxBatches ?? 50, 1)
  const revokeRefreshTokens = options?.revokeRefreshTokens ?? revokeAllUserRefreshTokens
  const cutoffDate = computeRetentionCutoffDate(now, INACTIVE_RETENTION_YEARS)

  const anonymizedUserIds: string[] = []

  for (let batch = 0; batch < maxBatches; batch++) {
    const candidates = await userModels.findRetentionCandidates(cutoffDate, batchSize)
    if (candidates.length === 0) {
      break
    }

    let processedInBatch = 0
    for (const candidate of candidates) {
      const didAnonymize = await userModels.anonymizeUserForRetention(candidate.id, now)
      if (!didAnonymize) {
        continue
      }

      processedInBatch++
      anonymizedUserIds.push(candidate.id)

      await Promise.all([
        revokeRefreshTokens(candidate.id).catch(() => {}),
        invalidate(CacheKeys.userProfile(candidate.id)).catch(() => {}),
        invalidatePattern(`user:${candidate.id}:home:*`).catch(() => {}),
      ])

      auditLogger.log({
        actorId: "SYSTEM_RETENTION_CRON",
        actorRole: "system",
        action: "USER_RETENTION_ANONYMIZED",
        targetId: candidate.id,
        status: "SUCCESS",
        details: {
          reason: "inactive_over_2_calendar_years",
          cutoff_date: cutoffDate.toISOString(),
          preserved_attendance_aggregates: true,
        },
      })
    }

    if (candidates.length < batchSize || processedInBatch === 0) {
      break
    }
  }

  if (anonymizedUserIds.length > 0) {
    await Promise.all([
      invalidatePattern("leaderboard:*").catch(() => {}),
      invalidatePattern("pengurus:insight:*").catch(() => {}),
    ])
  }

  return {
    checkedAt: now.toISOString(),
    cutoffDate: cutoffDate.toISOString(),
    anonymizedCount: anonymizedUserIds.length,
    userIds: anonymizedUserIds,
  }
}
