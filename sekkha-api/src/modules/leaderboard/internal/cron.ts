import cron from "node-cron"
import { computeAndCacheLeaderboard } from "./service"

/**
 * Initializes the weekly leaderboard cron job.
 * Runs every Sunday night / Monday 03:00 AM (Asia/Jakarta timezone).
 * Cron Expression: "0 3 * * 1" (At 03:00 on Monday / Minggu malam jam 3 pagi WIB)
 */
export function initLeaderboardCron(): void {
  // Jadwal: Tiap Minggu malam (Senin dini hari) jam 03:00 WIB
  cron.schedule(
    "0 3 * * 1",
    async () => {
      console.log("⏰ [Cron:Leaderboard] Memulai kalkulasi mingguan leaderboard pada jam 03:00 WIB...")
      try {
        await computeAndCacheLeaderboard()
        console.log("✅ [Cron:Leaderboard] Kalkulasi mingguan leaderboard selesai & tersimpan di cache.")
      } catch (err) {
        console.error("❌ [Cron:Leaderboard] Gagal menjalankan kalkulasi mingguan:", err)
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  )

  console.log("🕒 Leaderboard cron scheduled: Setiap Minggu malam jam 03:00 WIB (Asia/Jakarta)")

  // Pre-warm snapshot on server startup if not yet computed
  computeAndCacheLeaderboard().catch((err) => {
    console.warn("⚠️ Initial leaderboard pre-warm warning:", err.message)
  })
}
