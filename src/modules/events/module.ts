import type { AppModule } from "../../core/types"
import { eventsRouter } from "./internal/router"
import { eventbus, DomainEvents } from "../../core/eventbus"
import type { UserRegisteredPayload } from "../../core/eventbus"
import { onUserRegistered } from "./internal/subscribers"

// ─── Events Module ───────────────────────────────────────────────────────────
// Manages events, RSVPs, QR attendance, and attendance records.
// Publishes: (none currently)
// Subscribes: USER_REGISTERED → auto-register user to welcome event

export const eventsModule: AppModule = {
  name: "events",

  register(app) {
    app.use("/api/events", eventsRouter)
  },

  subscribe() {
    // Dengarkan event "user.registered" dari modul Auth
    // Ketika ada user baru, otomatis daftarkan ke event penyambutan
    eventbus.subscribe<UserRegisteredPayload>(
      DomainEvents.USER_REGISTERED,
      onUserRegistered
    )
  },
}
