import type { AppModule } from "../../core/types"
import { peopleRouter } from "./internal/router"

// ─── People Module ─────────────────────────────────────────────────────────────
// Member management: CRUD, roles, invites, PIN claims, account linking.

export const peopleModule: AppModule = {
  name: "people",

  register(app) {
    app.use("/api/people", peopleRouter)
  },
}
