import express, { type Application } from "express"
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

// ─── Module Imports ──────────────────────────────────────────────────────────
import { authModule } from "./modules/auth/module"
import { usersModule } from "./modules/users/module"
import { eventsModule } from "./modules/events/module"
import { configureModule } from "./modules/configure/module"
import { leaderboardModule } from "./modules/leaderboard/module"
import { peopleModule } from "./modules/people/module"
import { notificationsModule } from "./modules/notifications/module"
import { pengurusModule } from "./modules/pengurus/module"
import { schoolsModule } from "./modules/schools/module"

// ─── Distributed Rate Limiter Factory (F-09 Remediation) ──────────────────────
function createRateLimitStore(prefix: string) {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      return (redis.call as any)(args[0], ...args.slice(1))
    },
    prefix: `rl:${prefix}:`,
  })
}

export const modules: AppModule[] = [
  authModule,
  usersModule,
  eventsModule,
  configureModule,
  leaderboardModule,
  peopleModule,
  notificationsModule,
  pengurusModule,
  schoolsModule,
]

export function createApp(): Application {
  const app = express()

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
  app.use("/api/people/link-legacy-account", linkingLimiter)

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
    if (
      process.env.NODE_ENV !== "production" &&
      (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
    ) {
      return true
    }
    return rawOrigins.includes(origin)
  }

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
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

  // ─── Register Module Routes ──────────────────────────────────────────────────
  modules.forEach((m) => {
    m.register(app)
    console.log(`📦 Module registered: ${m.name}`)
  })

  // ─── Error Handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler)

  return app
}

export const app = createApp()
