import type { AppModule } from "../../core/types"
import { pengurusRouter } from "./internal/router"

// ─── Pengurus Module ─────────────────────────────────────────────────────────

export const pengurusModule: AppModule = {
  name: "pengurus",
  register(app) {
    app.use("/api/pengurus", pengurusRouter)
  },
}
