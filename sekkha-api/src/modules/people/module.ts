import type { AppModule } from "../../core/types"
import { peopleRouter } from "./routes"

// ─── People Module ─────────────────────────────────────────────────────────────
// Member management: CRUD, roles, invites, PIN claims, account linking.

export const peopleModule: AppModule = {
  name: "people",

  register(app) {
    app.use("/api/people", peopleRouter)
  },
}
