import type { AppModule } from "../../core/types"
import { leaderboardRouter } from "./internal/router"

// ─── Leaderboard Module ──────────────────────────────────────────────────────
// Season-based ranking, podium, streak shield, community goals.

export const leaderboardModule: AppModule = {
  name: "leaderboard",

  register(app) {
    app.use("/api/leaderboard", leaderboardRouter)
  },
}
