import type { UserRegisteredPayload } from "../../../core/eventbus"
import { prisma } from "../../../lib/prisma"

// ─── Event Subscribers ───────────────────────────────────────────────────────
// Handlers that react to domain events from other modules.
// Each function runs asynchronously — the publisher doesn't wait.

/**
 * When a new user registers, auto-register them to the active welcome event.
 * Triggered by: DomainEvents.USER_REGISTERED (published by Auth module)
 */
export async function onUserRegistered(payload: UserRegisteredPayload): Promise<void> {
  console.log(`🎉 Events module: Auto-registering user ${payload.userId} to welcome event`)

  // Cari event penyambutan yang aktif
  const welcomeEvent = await prisma.event.findFirst({
    where: { tag: "penyambutan", status: "published" },
    orderBy: { eventDate: "desc" },
  })

  if (!welcomeEvent) {
    console.log("ℹ️  No active welcome event found, skipping auto-registration")
    return
  }

  // Cek apakah user sudah terdaftar (idempotent)
  const existing = await prisma.rsvp.findUnique({
    where: { userId_eventId: { userId: payload.userId, eventId: welcomeEvent.id } },
  })

  if (existing) {
    console.log("ℹ️  User already registered for welcome event, skipping")
    return
  }

  // Daftarkan user ke event penyambutan
  await prisma.rsvp.create({
    data: {
      userId: payload.userId,
      eventId: welcomeEvent.id,
      status: "hadir",
    },
  })

  console.log(`✅ User ${payload.name} auto-registered to "${welcomeEvent.title}"`)
}
