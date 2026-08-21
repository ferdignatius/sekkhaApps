import type { AppModule } from "../../core/types"
import { leaderboardRouter } from "./internal/router"
import { initLeaderboardCron } from "./internal/cron"

// ─── Leaderboard Module ──────────────────────────────────────────────────────
// Season-based ranking, podium, community goals with weekly cron calculation.

export const leaderboardModule: AppModule = {
  name: "leaderboard",

  register(app) {
    app.use("/api/leaderboard", leaderboardRouter)
    initLeaderboardCron()
  },
}
