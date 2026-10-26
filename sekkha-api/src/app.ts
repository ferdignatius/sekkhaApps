import express, { type Application } from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit, { MemoryStore, type Store } from "express-rate-limit"
import cookieParser from "cookie-parser"
import { RedisStore } from "rate-limit-redis"
import { errorHandler } from "./middleware/errorHandler"
import { requestLogger } from "./middleware/requestLogger"
import { redis } from "./lib/redis"
import type { AppModule } from "./core/types"

// Support native JSON.stringify serialization for BigInt (userNumber)
;(BigInt.prototype as any).toJSON = function () {
  return Number(this) <= Number.MAX_SAFE_INTEGER ? Number(this) : this.toString()
}

// ─── Module Imports ──────────────────────────────────────────────────────────
import { authModule } from "./modules/auth/module"
import { usersModule } from "./modules/users/module"
import { eventsModule } from "./modules/events/module"
import { configureModule } from "./modules/configure/module"
import { leaderboardModule } from "./modules/leaderboard/module"
import { peopleModule } from "./modules/people/module"
import { pengurusModule } from "./modules/pengurus/module"
import { schoolsModule } from "./modules/schools/module"
import { homeModule } from "./modules/home/module"

// ─── Distributed & Resilient Rate Limiter Factory (F-09) ──────────────────────
class ResilientRateLimitStore implements Store {
  public localKeys = true
  public prefix: string
  private memStore = new MemoryStore()
  private redisStore: RedisStore

  constructor(prefix: string) {
    this.prefix = `rl:${prefix}:`
    this.redisStore = new RedisStore({
      sendCommand: async (...args: string[]) => {
        return (redis.call as any)(args[0], ...args.slice(1))
      },
      prefix: `rl:${prefix}:`,
    })
  }

  init(options: any) {
    this.memStore.init(options)
    this.redisStore.init?.(options)?.catch?.(() => {})
  }

  async increment(key: string) {
    if (redis.status === "ready") {
      try {
        return await this.redisStore.increment(key)
      } catch {
        // Fall back to memory store if Redis request fails
      }
    }
    return this.memStore.increment(key)
  }

  async decrement(key: string) {
    if (redis.status === "ready") {
      try {
        return await this.redisStore.decrement(key)
      } catch {
        // Fall back
      }
    }
    return this.memStore.decrement(key)
  }

  async resetKey(key: string) {
    if (redis.status === "ready") {
      try {
        return await this.redisStore.resetKey(key)
      } catch {
        // Fall back
      }
    }
    return this.memStore.resetKey(key)
  }

  async resetAll() {
    if (redis.status === "ready") {
      try {
        return await (this.redisStore as any).resetAll?.()
      } catch {
        // Fall back
      }
    }
    return this.memStore.resetAll?.()
  }
}

function createRateLimitStore(prefix: string) {
  return new ResilientRateLimitStore(prefix)
}

export const modules: AppModule[] = [
  authModule,
  usersModule,
  eventsModule,
  configureModule,
  leaderboardModule,
  peopleModule,
  pengurusModule,
  schoolsModule,
  homeModule,
]

export function isOriginAllowed(origin: string, rawOrigins: string[] = []): boolean {
  const normalizedOrigin = origin.trim().replace(/\/$/, "")

  if (
    process.env.NODE_ENV !== "production" &&
    (/^https?:\/\/localhost(:\d+)?$/.test(normalizedOrigin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin))
  ) {
    return true
  }

  return rawOrigins.some((allowed) => {
    if (allowed === "*" || allowed === normalizedOrigin) {
      return true
    }
    // Wildcard support: e.g. "https://*.vercel.app" or "*.vercel.app"
    if (allowed.includes("*")) {
      const regexPattern = "^" + allowed.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
      return new RegExp(regexPattern).test(normalizedOrigin)
    }
    return false
  })
}

export function createApp(): Application {
  const app = express()

  // Trust reverse proxy (Docker, Nginx, Caddy, Cloudflare) for accurate client IP rate limiting
  app.set("trust proxy", process.env.TRUST_PROXY || 1)

  // ─── Security & Core Middleware ──────────────────────────────────────────────

  // 1. CORS Configuration (Must run BEFORE rate limiters & route handlers so OPTIONS preflight is never blocked)
  const rawOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim().replace(/\/$/, ""))
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173"]

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin, rawOrigins)) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  }

  app.use(cors(corsOptions))
  app.options(/(.*)/, cors(corsOptions))

  // ─── Request Logger (Live Real-Time Activity Feed) ───────────────────────────
  app.use(requestLogger)

  // 2. High-Performance Gzip/Brotli Payload Compression (60-80% payload size reduction)
  app.use(compression())

  // 3. Security Headers (Helmet)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // Disabled for pure REST API
    })
  )

  const skipPreflight = (req: express.Request) => req.method === "OPTIONS"

  // 4. Global Rate Limiter (300 requests per minute per IP)
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("global"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    message: { error: "Too many requests from this IP. Please try again later." },
  })
  app.use(globalLimiter)

  // 4a. Sensitive Auth Rate Limiter (30 requests per 15 minutes per IP for login/register/reset)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("auth"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    message: { error: "Terlalu banyak percobaan autentikasi. Silakan tunggu 15 menit." },
  })
  app.use("/api/auth/login", authLimiter)
  app.use("/api/auth/register", authLimiter)
  app.use("/api/auth/refresh", authLimiter)
  app.use("/api/users/change-password", authLimiter)

  // 4b. Dedicated OTP Rate Limiter (5 requests per 15 minutes per IP to prevent brute-force attacks)
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("otp"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    message: { error: "Terlalu banyak permintaan OTP dari IP ini. Silakan tunggu 15 menit." },
  })
  app.use("/api/auth/register-request", otpLimiter)
  app.use("/api/auth/register-verify-otp", otpLimiter)
  app.use("/api/auth/resend-otp", otpLimiter)
  app.use("/api/auth/forgot-password/request", otpLimiter)
  app.use("/api/auth/forgot-password/verify-otp", otpLimiter)
  app.use("/api/auth/forgot-password/reset", otpLimiter)
  app.use("/api/users/email-verification", otpLimiter)

  // 4c. Schools Stats Rate Limiter (F-12: prevent cheap decryption DoS)
  const schoolStatsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("schools"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    message: { error: "Terlalu banyak permintaan statistik sekolah. Silakan tunggu sebentar." },
  })
  app.use("/api/schools/stats", schoolStatsLimiter)

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
