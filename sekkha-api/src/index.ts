import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import { errorHandler } from "./middleware/errorHandler"
import { requestLogger } from "./middleware/requestLogger"
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
import { schoolsModule } from "./modules/schools/module"

dotenv.config()

// ─── Environment Sanity Check ────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_SECRET is not set in environment! Using a default secret in non-production.")
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL: JWT_SECRET must be defined in production. Exiting...")
    process.exit(1)
  }
}

const app = express()
const PORT = process.env.PORT || 4000

// Trust reverse proxy (Docker, Nginx, Caddy, Cloudflare) for accurate client IP rate limiting
app.set("trust proxy", 1)

// ─── Request Logger (Live Real-Time Activity Feed) ───────────────────────────
app.use(requestLogger)

// ─── Security & Core Middleware ──────────────────────────────────────────────

// 1. High-Performance Gzip/Brotli Payload Compression (60-80% payload size reduction)
app.use(compression())

// 2. Security Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disabled for pure REST API
  })
)

// 3. Global Rate Limiter (300 requests per minute per IP)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Please try again later." },
})
app.use(globalLimiter)

// 3. Sensitive Auth Rate Limiter (20 requests per 15 minutes per IP for login/register/reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please wait 15 minutes." },
})
app.use("/api/auth/login", authLimiter)
app.use("/api/auth/register", authLimiter)
app.use("/api/users/change-password", authLimiter)

// 3b. Dedicated OTP Rate Limiter (5 requests per 15 minutes per IP to prevent brute-force attacks)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak permintaan OTP dari IP ini. Silakan tunggu 15 menit." },
})
app.use("/api/auth/register-request", otpLimiter)
app.use("/api/auth/register-verify-otp", otpLimiter)
app.use("/api/auth/resend-otp", otpLimiter)
app.use("/api/auth/forgot-password/request", otpLimiter)
app.use("/api/auth/forgot-password/verify-otp", otpLimiter)
app.use("/api/auth/forgot-password/reset", otpLimiter)

// 4. CORS Configuration
const rawOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim().replace(/\/$/, ""))
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173"]

const isOriginAllowed = (origin: string): boolean => {
  // Always allow localhost and loopback in non-production for easy dev testing
  if (
    process.env.NODE_ENV !== "production" &&
    (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
  ) {
    return true
  }

  // Exact matching against configured allowed origins (strict CORS: no wildcard or "*" allowed)
  return rawOrigins.includes(origin)
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true)
    }
    return callback(null, false)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

// 5. Body parser with strict payload size limit
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// ─── Module Registration ─────────────────────────────────────────────────────
// Shell pattern: loop over all modules → register routes → subscribe events.

const modules: AppModule[] = [
  authModule,
  usersModule,
  eventsModule,
  configureModule,
  leaderboardModule,
  teamsModule,
  notificationsModule,
  pengurusModule,
  schoolsModule,
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

