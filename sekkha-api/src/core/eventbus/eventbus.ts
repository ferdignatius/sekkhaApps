import { EventEmitter } from "events"

// ─── Types ───────────────────────────────────────────────────────────────────

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>

// ─── EventBus ────────────────────────────────────────────────────────────────
// In-memory event bus for inter-module communication.
// Modules publish domain events without knowing who listens.
// Other modules subscribe to events they care about.
//
// For scale-up to microservices, swap this with RabbitMQ / Redis Pub-Sub.

class EventBus {
  private emitter = new EventEmitter()

  /**
   * Publish a domain event. Fire-and-forget — publisher doesn't wait.
   */
  publish<T>(event: string, payload: T): void {
    console.log(`📢 EventBus: ${event}`, JSON.stringify(payload))
    // Run async handlers without blocking the publisher
    this.emitter.emit(event, payload)
  }

  /**
   * Subscribe to a domain event.
   */
  subscribe<T>(event: string, handler: EventHandler<T>): void {
    console.log(`👂 EventBus: subscribed to "${event}"`)
    this.emitter.on(event, (payload: T) => {
      // Wrap in try-catch so one failing subscriber doesn't crash others
      Promise.resolve(handler(payload)).catch((err) => {
        console.error(`❌ EventBus handler error for "${event}":`, err)
      })
    })
  }

  /**
   * Remove a specific handler from an event.
   */
  unsubscribe<T>(event: string, handler: EventHandler<T>): void {
    this.emitter.off(event, handler as (...args: unknown[]) => void)
  }
}

// Singleton — shared across the entire backend process
export const eventbus = new EventBus()
