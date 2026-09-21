import type { AppModule } from "../../core/types"
import { leaderboardRouter } from "./routes"
import { initLeaderboardCron } from "./cron"

// ─── Leaderboard Module ──────────────────────────────────────────────────────
// Season-based ranking, podium, community goals with weekly cron calculation.

export const leaderboardModule: AppModule = {
  name: "leaderboard",

  register(app) {
    app.use("/api/leaderboard", leaderboardRouter)
    initLeaderboardCron()
  },
}
