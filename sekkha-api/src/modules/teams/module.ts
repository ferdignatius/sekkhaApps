import type { AppModule } from "../../core/types"
import { teamsRouter } from "./internal/router"

// ─── Teams Module ────────────────────────────────────────────────────────────
// Team role management, user invites, role updates.

export const teamsModule: AppModule = {
  name: "teams",

  register(app) {
    app.use("/api/teams", teamsRouter)
  },
}
