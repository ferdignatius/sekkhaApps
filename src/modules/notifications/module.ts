import type { AppModule } from "../../core/types"
import { notificationsRouter } from "./internal/router"

// ─── Notifications Module ─────────────────────────────────────────────────────
// Real-time user notifications.

export const notificationsModule: AppModule = {
  name: "notifications",

  register(app) {
    app.use("/api/notifications", notificationsRouter)
  },
}
