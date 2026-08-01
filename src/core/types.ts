// ─── Module Contract ─────────────────────────────────────────────────────────
// Every backend module must implement this interface.
// The application entry point (index.ts) loops over all modules to:
// 1. register() — mount Express routes
// 2. subscribe() — wire up EventBus listeners (optional)

import type { Express } from "express"

export interface AppModule {
  /** Human-readable module name (for logging) */
  name: string

  /** Mount the module's Express routes onto the app. */
  register(app: Express): void

  /** Subscribe to domain events from other modules (optional). */
  subscribe?(): void
}
