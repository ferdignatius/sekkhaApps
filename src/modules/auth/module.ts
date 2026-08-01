import type { AppModule } from "../../core/types"
import { authRouter } from "./internal/router"

// ─── Auth Module ─────────────────────────────────────────────────────────────
// Handles user registration, login, and token verification.
// Publishes: USER_REGISTERED (after successful registration)
// Subscribes: (none)

export const authModule: AppModule = {
  name: "auth",

  register(app) {
    app.use("/api/auth", authRouter)
  },

  // Auth module publishes events but doesn't subscribe to any
}
