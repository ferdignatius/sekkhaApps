import type { AppModule } from "../../core/types"
import { eventbus, DomainEvents } from "../../core/eventbus"
import { invalidatePattern } from "../../lib/cache"
import { leaderboardRouter } from "./routes"
import { initLeaderboardCron } from "./internal/cron"
import { clearMemoryLeaderboardCache } from "./services"

// ─── Leaderboard Module ──────────────────────────────────────────────────────
// Season-based ranking, podium, community goals with weekly cron calculation.

let listenersRegistered = false

function ensureLeaderboardSubscriptions(): void {
  if (listenersRegistered) return
  listenersRegistered = true

  const handleLeaderboardInvalidation = () => {
    clearMemoryLeaderboardCache()
    void invalidatePattern("leaderboard:*").catch(() => {})
  }

  const invalidatingEvents = [
    DomainEvents.EVENT_CLOSED,
    DomainEvents.USER_REGISTERED,
    DomainEvents.USER_UPDATED,
    DomainEvents.USER_DELETED,
    DomainEvents.SEASON_UPDATED,
    DomainEvents.CONFIG_UPDATED,
  ]

  for (const eventName of invalidatingEvents) {
    eventbus.subscribe(eventName, handleLeaderboardInvalidation)
  }
}

export const leaderboardModule: AppModule = {
  name: "leaderboard",

  register(app) {
    app.use("/api/leaderboard", leaderboardRouter)
    initLeaderboardCron()
    ensureLeaderboardSubscriptions()
  },

  subscribe() {
    ensureLeaderboardSubscriptions()
  },
}
