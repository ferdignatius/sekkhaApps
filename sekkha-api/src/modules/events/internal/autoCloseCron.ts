import cron from "node-cron"
import { eventServices } from "../services"

/**
 * Initializes the daily cron job to auto-close active events whose start date has passed
 * (current date > event_date in Asia/Jakarta WIB timezone).
 */
export function initAutoCloseEventsCron(): void {
  if (process.env.NODE_ENV === "test") {
    return
  }

  cron.schedule(
    "5 0 * * *",
    async () => {
      console.log("⏰ [Cron:Events] Checking active events past their start date for auto-close...")
      try {
        const summary = await eventServices.autoCloseExpiredActiveEvents()
        if (summary.closedCount > 0) {
          console.log(
            `✅ [Cron:Events] Auto-closed ${summary.closedCount} expired active event(s): ${summary.closedEventIds.join(", ")}`
          )
        }
      } catch (err) {
        console.error("❌ [Cron:Events] Failed auto-closing expired active events:", err)
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  )

  console.log("🕒 Event auto-close cron scheduled: Daily at 00:05 WIB (Asia/Jakarta, current date > event_date)")
}

