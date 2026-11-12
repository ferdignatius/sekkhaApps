import cron from "node-cron"
import { runInactiveAccountRetentionCleanup } from "./retention"

/**
 * Initializes the daily UU PDP data retention & anonymization cron job.
 * Runs daily at 02:30 AM (Asia/Jakarta timezone) for accounts inactive > 2 calendar years.
 */
export function initDataRetentionCron(): void {
  if (process.env.NODE_ENV === "test") {
    return
  }

  cron.schedule(
    "30 2 * * *",
    async () => {
      console.log("⏰ [Cron:Retention] Checking accounts inactive > 2 calendar years...")
      try {
        const summary = await runInactiveAccountRetentionCleanup()
        console.log(
          `✅ [Cron:Retention] Completed retention check (cutoff=${summary.cutoffDate}): anonymized=${summary.anonymizedCount}`
        )
      } catch (err) {
        console.error("❌ [Cron:Retention] Failed executing data retention cleanup:", err)
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  )

  console.log("🕒 Data retention cron scheduled: Daily at 02:30 WIB (Asia/Jakarta, >2 calendar years inactive)")
}

