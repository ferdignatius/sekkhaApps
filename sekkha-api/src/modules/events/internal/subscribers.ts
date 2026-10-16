import type { UserRegisteredPayload } from "../../../core/eventbus"

// ─── Event Subscribers ───────────────────────────────────────────────────────
// Handlers that react to domain events from other modules.

/**
 * When a new user registers, handle welcome flow.
 * Triggered by: DomainEvents.USER_REGISTERED (published by Auth module)
 */
export async function onUserRegistered(payload: UserRegisteredPayload): Promise<void> {
  console.log(`🎉 Events module: New user registered: ${payload.userId} (${payload.name})`)
}
