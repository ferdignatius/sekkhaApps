import type { AppModule } from "../../core/types"
import { configureRouter } from "./routes"

// ─── Configure Module ────────────────────────────────────────────────────────
// Master data CRUD: badges, levels, event types, achievements.
// Organizer/admin only.

export const configureModule: AppModule = {
  name: "configure",

  register(app) {
    app.use("/api/configure", configureRouter)
  },
}
