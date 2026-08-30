import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { errorHandler } from "./middleware/errorHandler"
import { redis } from "./lib/redis"
import type { AppModule } from "./core/types"

// ─── Module Imports ──────────────────────────────────────────────────────────
import { authModule } from "./modules/auth/module"
import { usersModule } from "./modules/users/module"
import { eventsModule } from "./modules/events/module"
import { configureModule } from "./modules/configure/module"
import { leaderboardModule } from "./modules/leaderboard/module"
import { teamsModule } from "./modules/teams/module"
import { notificationsModule } from "./modules/notifications/module"
import { pengurusModule } from "./modules/pengurus/module"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// ─── Middleware ──────────────────────────────────────────────────────────────

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173"]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed`))
    },
    credentials: true,
  })
)
app.use(express.json())

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// ─── Module Registration ─────────────────────────────────────────────────────
// Shell pattern: loop over all modules → register routes → subscribe events.
// Menambah modul baru = import + tambahkan ke array. Tidak perlu edit kode lain.

const modules: AppModule[] = [
  authModule,
  usersModule,
  eventsModule,
  configureModule,
  leaderboardModule,
  teamsModule,
  notificationsModule,
  pengurusModule,
]

// 1. Register routes
modules.forEach((m) => {
  m.register(app)
  console.log(`📦 Module registered: ${m.name}`)
})

// 2. Subscribe to domain events
modules.forEach((m) => {
  m.subscribe?.()
})

// ─── Error handler (must be last) ───────────────────────────────────────────

app.use(errorHandler)

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  // Connect Redis
  await redis.connect().catch(() => console.warn("⚠️  Redis not available, caching disabled"))
  console.log(`🚀 Sekkha API running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`📦 Modules loaded: ${modules.map((m) => m.name).join(", ")}`)
})
