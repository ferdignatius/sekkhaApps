import type { AppModule } from "../../core/types"
import { usersRouter } from "./internal/router"

// ─── Users Module ────────────────────────────────────────────────────────────
// Manages user profiles, badges, attendances, streaks, and levels.

export const usersModule: AppModule = {
  name: "users",

  register(app) {
    app.use("/api/users", usersRouter)
  },
}
