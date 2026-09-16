// Sekkha Community App — Backend API Entry Point
// F-16 Remediation: Load environment variables before any module imports
import "dotenv/config"

import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import cookieParser from "cookie-parser"
import { RedisStore } from "rate-limit-redis"
import { errorHandler } from "./middleware/errorHandler"
import { requestLogger } from "./middleware/requestLogger"
import { redis } from "./lib/redis"
import type { AppModule } from "./core/types"

// ─── Distributed Rate Limiter Factory (F-09 Remediation) ──────────────────────
function createRateLimitStore(prefix: string) {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      return (redis.call as any)(args[0], ...args.slice(1))
    },
    prefix: `rl:${prefix}:`,
  })
}

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

// ─── Environment Sanity Check (F-02 Remediation) ──────────────────────────────
const isProd = process.env.NODE_ENV === "production"
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change-this-in-production")) {
  if (isProd) {
    console.error("❌ CRITICAL SECURITY FAILURE: JWT_SECRET is required, must be at least 32 characters, and cannot use default/sample placeholders in production. Exiting...")
    process.exit(1)
  } else {
    console.warn("⚠️  WARNING: JWT_SECRET is missing or using a weak/sample secret. Generate a strong 32+ character random secret for production.")
  }
}

const app = express()
const PORT = process.env.PORT || 4000

// Trust reverse proxy (Docker, Nginx, Caddy, Cloudflare) for accurate client IP rate limiting
app.set("trust proxy", process.env.TRUST_PROXY || 1)

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
  store: createRateLimitStore("global"),
  passOnStoreError: true,
  message: { error: "Too many requests from this IP. Please try again later." },
})
app.use(globalLimiter)

// 3a. Sensitive Auth Rate Limiter (30 requests per 15 minutes per IP for login/register/reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore("auth"),
  passOnStoreError: true,
  message: { error: "Terlalu banyak percobaan autentikasi. Silakan tunggu 15 menit." },
})
app.use("/api/auth/login", authLimiter)
app.use("/api/auth/register", authLimiter)
app.use("/api/auth/refresh", authLimiter)
app.use("/api/users/change-password", authLimiter)

// 3b. Dedicated OTP Rate Limiter (5 requests per 15 minutes per IP to prevent brute-force attacks)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore("otp"),
  passOnStoreError: true,
  message: { error: "Terlalu banyak permintaan OTP dari IP ini. Silakan tunggu 15 menit." },
})
app.use("/api/auth/register-request", otpLimiter)
app.use("/api/auth/register-verify-otp", otpLimiter)
app.use("/api/auth/resend-otp", otpLimiter)
app.use("/api/auth/forgot-password/request", otpLimiter)
app.use("/api/auth/forgot-password/verify-otp", otpLimiter)
app.use("/api/auth/forgot-password/reset", otpLimiter)

// 3c. Dedicated Account Linking Rate Limiter (F-04/F-09: 5 attempts per 15 minutes per IP)
const linkingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore("linking"),
  passOnStoreError: true,
  message: { error: "Terlalu banyak percobaan penautan akun dari IP ini. Silakan tunggu 15 menit." },
})
app.use("/api/teams/link-legacy-account", linkingLimiter)

// 3d. Schools Stats Rate Limiter (F-12: prevent cheap decryption DoS)
const schoolStatsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore("schools"),
  passOnStoreError: true,
  message: { error: "Terlalu banyak permintaan statistik sekolah. Silakan tunggu sebentar." },
})
app.use("/api/schools/stats", schoolStatsLimiter)

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
app.use(cookieParser())

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

app.listen(PORT, () => {
  console.log(`🚀 Sekkha API running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`📦 Modules loaded: ${modules.map((m) => m.name).join(", ")}`)
})
