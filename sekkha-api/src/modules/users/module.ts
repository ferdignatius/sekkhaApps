import type { AppModule } from "../../core/types"
import { eventbus, DomainEvents, type AttendanceRecordedPayload } from "../../core/eventbus"
import { usersRouter } from "./routes"
import { userModels } from "./models"
import { initDataRetentionCron } from "./internal/retentionCron"

// ─── Users Module ────────────────────────────────────────────────────────────
// Manages user profiles, attendances, streaks, and UU PDP data retention.

export const usersModule: AppModule = {
  name: "users",

  register(app) {
    app.use("/api/users", usersRouter)
    initDataRetentionCron()
  },

  subscribe() {
    eventbus.subscribe<AttendanceRecordedPayload>(DomainEvents.ATTENDANCE_RECORDED, async (payload) => {
      if (!payload?.userId) return
      await userModels.touchLastActiveAt(payload.userId).catch(() => {})
    })
  },
}
