import type { AppModule } from "../../core/types"
import { configureRouter } from "./internal/router"

// ─── Configure Module ────────────────────────────────────────────────────────
// Master data CRUD: badges, levels, event types, achievements.
// Pengurus/admin only.

export const configureModule: AppModule = {
  name: "configure",

  register(app) {
    app.use("/api/configure", configureRouter)
  },
}
