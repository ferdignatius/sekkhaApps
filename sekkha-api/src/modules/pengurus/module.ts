import type { AppModule } from "../../core/types"
import { pengurusRouter } from "./routes"

// ─── Pengurus Module ─────────────────────────────────────────────────────────

export const pengurusModule: AppModule = {
  name: "pengurus",
  register(app) {
    app.use("/api/pengurus", pengurusRouter)
  },
}
