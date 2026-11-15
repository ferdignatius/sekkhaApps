import type { AppModule } from "../../core/types"
import { eventbus, DomainEvents } from "../../core/eventbus"
import { leaderboardRouter } from "./routes"
import { initLeaderboardCron } from "./internal/cron"
import { clearMemoryLeaderboardCache } from "./services"

// ─── Leaderboard Module ──────────────────────────────────────────────────────
// Season-based ranking, podium, community goals with weekly cron calculation.

let listenersRegistered = false

export const leaderboardModule: AppModule = {
  name: "leaderboard",

  register(app) {
    app.use("/api/leaderboard", leaderboardRouter)
    initLeaderboardCron()

    if (!listenersRegistered) {
      listenersRegistered = true
      eventbus.subscribe(DomainEvents.EVENT_CLOSED, () => {
        clearMemoryLeaderboardCache()
      })
      eventbus.subscribe(DomainEvents.USER_REGISTERED, () => {
        clearMemoryLeaderboardCache()
      })
    }
  },
}
